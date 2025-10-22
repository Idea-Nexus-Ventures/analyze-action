#!/usr/bin/env node

/**
 * Coaching CLI
 * Runs the coaching session after agent analysis
 */

import { CoachingSystem } from '../src/coaching-system.js';
import { ModelAdapter } from '../src/model-adapter.js';
import { CharacterSystem } from '../src/character-system.js';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    output: { type: 'string', default: 'json' }
  }
});

async function runCoaching() {
  try {
    // Initialize systems
    const modelAdapter = new ModelAdapter({
      openrouterKey: process.env.OPENROUTER_API_KEY,
      defaultModel: process.env.MODEL || 'anthropic/claude-3.5-sonnet'
    });

    const actionPath = process.env.GITHUB_ACTION_PATH || process.cwd();
    const characterSystem = new CharacterSystem(
      join(actionPath, 'characters', 'project-analysis.json')
    );
    await characterSystem.loadCharacters();

    const coachingSystem = new CoachingSystem(modelAdapter, characterSystem, values.output === 'json');

    // Load agent insights
    const agentInsights = {};
    const agents = ['architect', 'educator', 'visionary', 'philosopher'];
    
    for (const agent of agents) {
      try {
        // First try the temporary files from the current run
        const tempPath = `/tmp/${agent}-output.json`;
        let data;
        try {
          data = await readFile(tempPath, 'utf8');
        } catch (tempError) {
          // Fallback to .agent-states if temp files don't exist
          const insightPath = join(process.env.GITHUB_WORKSPACE || process.cwd(), '.agent-states', `${agent}.json`);
          data = await readFile(insightPath, 'utf8');
        }
        agentInsights[agent] = JSON.parse(data);
      } catch (e) {
        console.warn(`Could not load insights for ${agent}:`, e.message);
      }
    }

    // Get repository context
    const repoContext = await getRepositoryContext();

    // Run coaching session
    const coachingResult = await coachingSystem.runCoachingSession(repoContext, agentInsights);

    if (!coachingResult) {
      console.log('No coaching insights generated');
      process.exit(0);
    }

    // Output result
    if (values.output === 'json') {
      console.log(JSON.stringify(coachingResult, null, 2));
    } else {
      console.log('🎓 Coaching session complete');
      console.log(`  Improvements identified: ${coachingResult.improvements.length}`);
      console.log(`  Agent discussions: ${Object.keys(coachingResult.discussions).length}`);
      console.log(`  Quick wins: ${coachingResult.coachingReport.quick_wins.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running coaching session:', error.message);
    process.exit(1);
  }
}

async function getRepositoryContext() {
  const context = {
    files: [],
    structure: {},
    packageInfo: null,
    languages: new Set(),
    stats: {
      totalFiles: 0,
      totalLines: 0
    }
  };

  // Use the user's repo directory
  const userRepoPath = process.env.GITHUB_WORKSPACE || process.cwd();
  
  // Try to read package.json from user's repo
  try {
    const packageJson = JSON.parse(await readFile(join(userRepoPath, 'package.json'), 'utf8'));
    context.packageInfo = {
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version,
      dependencies: packageJson.dependencies || {}
    };
  } catch (e) {
    // No package.json, that's ok
  }

  // Get file structure (limited)
  const files = await getFilesRecursively(userRepoPath, [
    '.git', 
    'node_modules', 
    '.agent-states',
    'dist', 
    'build',
    'target',
    'bin',
    'obj',
    '__pycache__',
    'venv',
    '.venv'
  ]);

  context.files = files.slice(0, 100); // Limit to 100 files
  context.stats.totalFiles = files.length;

  // Detect languages
  for (const file of files) {
    const ext = file.split('.').pop();
    if (ext) {
      context.languages.add(ext);
    }
  }

  context.languages = Array.from(context.languages);

  return context;
}

async function getFilesRecursively(dir, ignoreDirs = []) {
  const files = [];
  
  try {
    const entries = await readdir(dir);
    
    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.github') continue;
      
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        if (!ignoreDirs.some(ignore => fullPath.includes(ignore))) {
          files.push(...(await getFilesRecursively(fullPath, ignoreDirs)));
        }
      } else {
        // Return relative path from the user's repo root
        const userRepoPath = process.env.GITHUB_WORKSPACE || process.cwd();
        const relativePath = fullPath.replace(userRepoPath + '/', '');
        files.push(relativePath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return files;
}

runCoaching();

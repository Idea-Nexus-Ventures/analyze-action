#!/usr/bin/env node

/**
 * Single agent runner for GitHub Actions
 */

import { AgentState } from '../src/agent-state.js';
import { ModelAdapter } from '../src/model-adapter.js';
import { CharacterSystem } from '../src/character-system.js';
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    agent: { type: 'string', default: 'architect' },
    model: { type: 'string', default: 'anthropic/claude-3.5-sonnet' },
    output: { type: 'string', default: 'json' }
  }
});

const agentId = values.agent;
const model = values.model;

async function runAgent() {
  try {
    // Initialize model adapter
    const modelAdapter = new ModelAdapter({
      openrouterKey: process.env.OPENROUTER_API_KEY,
      defaultModel: model
    });

    // Load character
    const actionPath = process.env.GITHUB_ACTION_PATH || process.cwd();
    
    const characterSystem = new CharacterSystem(
      join(actionPath, 'characters', 'project-analysis.json')
    );
    await characterSystem.loadCharacters();
    const character = characterSystem.getCharacter(agentId);

    // Initialize or load agent state
    const agentState = new AgentState(agentId);
    let loaded = await agentState.load();
    
    if (!loaded) {
      const repoContext = await getRepositoryContext();
      await agentState.initialize(character, repoContext);
    }

    // Analyze repository
    const analysis = await analyzeRepository(agentState, modelAdapter, character);
    
    // Update state
    await agentState.save();

    // Output result
    const output = {
      agent: agentId,
      level: character.level,
      timestamp: Date.now(),
      summary: analysis.summary || 'Analysis complete',
      insights: analysis.insights || [],
      entities: agentState.state.knowledge.entities,
      confidence: agentState.state.knowledge.understanding.confidence_level
    };

    if (values.output === 'json') {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`✓ ${character.name} analysis complete`);
      console.log(`  Insights: ${analysis.insights?.length || 0}`);
      console.log(`  Entities: ${Object.values(agentState.state.knowledge.entities).flat().length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running agent:', error.message);
    process.exit(1);
  }
}

async function getRepositoryContext() {
  const context = {
    structure: [],
    packageInfo: null
  };

  // Use the user's repo directory, not the action directory
  const userRepoPath = process.env.GITHUB_WORKSPACE || process.cwd();
  
  // Try to read package.json from user's repo
  try {
    const packageJson = JSON.parse(await readFile(join(userRepoPath, 'package.json'), 'utf8'));
    context.packageInfo = {
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version
    };
  } catch (e) {
    // No package.json, that's ok
  }

  // Get file structure from user's repo (limited)
  const files = await getFilesRecursively(userRepoPath, [
    '.git', 'node_modules', '.consciousness-lab', 'dist', 'build'
  ]);
  context.structure = files.slice(0, 100);

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

async function analyzeRepository(agentState, modelAdapter, character) {
  const repoContext = await getRepositoryContext();
  
  const prompt = `You are ${character.name} (Level ${character.level} - ${character.level_name}).

Analyze this repository structure:
${JSON.stringify(repoContext, null, 2)}

Based on your level ${character.level} perspective, provide:
1. A summary of what you observe
2. 3-5 key insights specific to your domain
3. Entities for your knowledge base

IMPORTANT: Respond ONLY with valid JSON. No additional text before or after.

{
  "summary": "Brief overview of what you see",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "entities": {
    "components": ["component1", "component2"],
    "patterns": ["pattern1"],
    "concepts": ["concept1"]
  }
}`;

  const response = await modelAdapter.call(modelAdapter.defaultModel, prompt);
  
  try {
    // Try to parse JSON from response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      // Validate JSON before parsing
      if (jsonStr.includes('"summary"') && jsonStr.includes('"insights"')) {
        return JSON.parse(jsonStr);
      }
    }
  } catch (e) {
    console.warn(`JSON parsing failed for ${character.name}:`, e.message);
  }

  // Fallback: extract summary from response text
  const summary = response.text.substring(0, 500).replace(/[{}"]/g, '').trim();
  
  return {
    summary: summary || 'Analysis completed successfully',
    insights: ['Analysis completed successfully'],
    entities: {}
  };
}

runAgent();


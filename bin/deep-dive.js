#!/usr/bin/env node

/**
 * Deep Dive CLI
 * Performs recursive analysis at different levels of granularity
 */

import { DeepDiveAnalyzer } from '../src/deep-dive-analyzer.js';
import { ModelAdapter } from '../src/model-adapter.js';
import { CharacterSystem } from '../src/character-system.js';
import { join } from 'path';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    agent: { type: 'string', default: 'architect' },
    model: { type: 'string', default: 'anthropic/claude-3.5-sonnet' },
    output: { type: 'string', default: 'json' },
    maxDepth: { type: 'string', default: '3' },
    includeFiles: { type: 'boolean', default: true },
    includeDirectories: { type: 'boolean', default: true },
    includeModules: { type: 'boolean', default: true }
  }
});

async function runDeepDive() {
  try {
    // Initialize systems
    const modelAdapter = new ModelAdapter({
      openrouterKey: process.env.OPENROUTER_API_KEY,
      defaultModel: values.model
    });

    const actionPath = process.env.GITHUB_ACTION_PATH || process.cwd();
    const characterSystem = new CharacterSystem(
      join(actionPath, 'characters', 'project-analysis.json')
    );
    await characterSystem.loadCharacters();

    const deepDiveAnalyzer = new DeepDiveAnalyzer(
      values.agent,
      modelAdapter,
      characterSystem
    );

    // Get repository path
    const repoPath = process.env.GITHUB_WORKSPACE || process.cwd();
    
    console.log(`🔍 Starting deep dive analysis for ${values.agent}...`);
    console.log(`📁 Repository: ${repoPath}`);
    console.log(`📊 Max depth: ${values.maxDepth}`);
    
    // Run deep dive analysis
    const results = await deepDiveAnalyzer.deepDiveAnalysis(repoPath, {
      maxDepth: parseInt(values.maxDepth, 10),
      includeFiles: values.includeFiles,
      includeDirectories: values.includeDirectories,
      includeModules: values.includeModules
    });

    // Output results
    if (values.output === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log('🎯 Deep dive analysis complete!');
      console.log(`  Files analyzed: ${results.files.length}`);
      console.log(`  Directories analyzed: ${results.directories.length}`);
      console.log(`  Modules analyzed: ${results.modules.length}`);
      console.log(`  Summary: ${results.summary?.summary || 'No summary available'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running deep dive analysis:', error.message);
    process.exit(1);
  }
}

runDeepDive();

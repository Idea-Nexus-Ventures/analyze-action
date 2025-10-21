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
    const actionPath = process.env.GITHUB_WORKSPACE_PATH 
      ? join(process.env.GITHUB_WORKSPACE, '.consciousness-lab')
      : process.cwd();
    
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

  // Try to read package.json
  try {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    context.packageInfo = {
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version
    };
  } catch (e) {
    // No package.json, that's ok
  }

  // Get file structure (limited)
  const files = await getFilesRecursively('.', [
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
        files.push(fullPath);
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

Respond in JSON format:
{
  "summary": "Brief overview",
  "insights": ["insight 1", "insight 2", ...],
  "entities": {
    // Your level-specific entities
  }
}`;

  const response = await modelAdapter.call(modelAdapter.defaultModel, prompt);
  
  try {
    // Try to parse JSON from response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // If parsing fails, return basic structure
  }

  return {
    summary: response.text.substring(0, 500),
    insights: ['Analysis completed successfully'],
    entities: {}
  };
}

runAgent();


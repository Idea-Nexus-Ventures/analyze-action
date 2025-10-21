/**
 * Agent Update Workflow
 * Orchestrates the multi-agent analysis process
 */

import { AgentState } from './agent-state.js';
import { ModelAdapter } from './model-adapter.js';
import { CharacterSystem } from './character-system.js';
import { GitHubIntegration } from './github-integration.js';
import { join } from 'path';

export async function runAgentUpdate(repoContext, options = {}) {
  const {
    agents = ['architect', 'educator', 'visionary', 'philosopher'],
    model = 'anthropic/claude-3.5-sonnet',
    createBranches = true
  } = options;

  // Initialize systems
  const modelAdapter = new ModelAdapter({
    openrouterKey: process.env.OPENROUTER_API_KEY,
    defaultModel: model
  });

  const characterSystem = new CharacterSystem(
    join(process.cwd(), 'characters', 'project-analysis.json')
  );
  await characterSystem.loadCharacters();

  const github = new GitHubIntegration();

  // Process each agent
  const results = {};

  for (const agentId of agents) {
    console.log(`\nProcessing ${agentId}...`);
    
    try {
      const character = characterSystem.getCharacter(agentId);
      const agentState = new AgentState(agentId);
      
      // Load or initialize state
      let loaded = await agentState.load();
      if (!loaded) {
        await agentState.initialize(character, repoContext);
      }

      // Run analysis
      const analysis = await analyzeWithAgent(agentState, character, repoContext, modelAdapter);
      
      // Update state
      if (analysis.insights) {
        for (const insight of analysis.insights) {
          agentState.addInsight(insight);
        }
      }
      
      if (analysis.entities) {
        for (const [type, entities] of Object.entries(analysis.entities)) {
          if (Array.isArray(entities)) {
            for (const entity of entities) {
              agentState.addEntity(type, entity);
            }
          }
        }
      }

      if (analysis.confidence !== undefined) {
        agentState.updateConfidence(analysis.confidence);
      }

      await agentState.save();

      results[agentId] = {
        success: true,
        summary: analysis.summary,
        insights: analysis.insights
      };

      // Optionally commit to agent branch
      if (createBranches) {
        await github.commitAndPush(
          `agent/${agentId}`,
          `🤖 ${character.name}: Analysis update`,
          [`.agent-states/${agentId}.json`]
        );
      }

      console.log(`✓ ${character.name} complete`);
    } catch (error) {
      console.error(`✗ ${agentId} failed:`, error.message);
      results[agentId] = {
        success: false,
        error: error.message
      };
    }
  }

  return results;
}

async function analyzeWithAgent(agentState, character, repoContext, modelAdapter) {
  const prompt = `You are ${character.name}, a ${character.role} operating at Level ${character.level} - ${character.level_name}.

Your focus areas: ${character.focus.join(', ')}

Analyze this repository:
${JSON.stringify(repoContext, null, 2)}

Based on your Level ${character.level} perspective, provide:
1. A summary of what you observe (2-3 sentences)
2. 3-5 key insights specific to your domain
3. Relevant entities for your knowledge base
4. Your confidence level (0-100)

Respond in JSON format:
{
  "summary": "Brief overview of what you see",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "entities": {
    "components": ["component1", "component2"],
    "patterns": ["pattern1"],
    "concepts": ["concept1"]
  },
  "confidence": 75
}`;

  try {
    const analysis = await modelAdapter.callWithJSON(modelAdapter.defaultModel, prompt);
    return analysis;
  } catch (error) {
    // Fallback if JSON parsing fails
    const response = await modelAdapter.call(modelAdapter.defaultModel, prompt);
    return {
      summary: response.text.substring(0, 500),
      insights: ['Analysis completed'],
      entities: {},
      confidence: 50
    };
  }
}


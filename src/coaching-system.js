/**
 * Coaching System
 * Analyzes improvements and facilitates agent discussions
 */

import { ModelAdapter } from './model-adapter.js';
import { CharacterSystem } from './character-system.js';
import { join } from 'path';

export class CoachingSystem {
  constructor(modelAdapter, characterSystem, silent = false) {
    this.modelAdapter = modelAdapter;
    this.characterSystem = characterSystem;
    this.silent = silent;
  }

  async analyzeImprovements(repoContext, agentInsights) {
    if (!this.silent) console.log('🎯 Analyzing potential improvements...');
    
    const prompt = `Based on this repository analysis, identify 10-15 specific improvements that could be made:

Repository Context:
${JSON.stringify(repoContext, null, 2)}

Agent Insights:
${JSON.stringify(agentInsights, null, 2)}

Identify improvements across these categories:
1. **Code Quality** - Refactoring, patterns, best practices
2. **Architecture** - Structure, modularity, scalability
3. **Documentation** - README, comments, examples
4. **Testing** - Coverage, test quality, CI/CD
5. **Performance** - Optimization opportunities
6. **Security** - Vulnerabilities, best practices
7. **Developer Experience** - Tooling, workflows, automation
8. **Maintainability** - Code clarity, dependencies

Respond in JSON format:
{
  "improvements": [
    {
      "id": "improvement_1",
      "category": "Code Quality",
      "title": "Extract common validation logic",
      "description": "Create reusable validation functions to reduce duplication",
      "impact": "high",
      "effort": "medium",
      "priority": 1
    }
  ]
}`;

    try {
      const response = await this.modelAdapter.callWithJSON(this.modelAdapter.defaultModel, prompt);
      return response.improvements || [];
    } catch (error) {
      console.warn('Failed to analyze improvements:', error.message);
      return [];
    }
  }

  async facilitateAgentDiscussion(improvements, agentInsights) {
    if (!this.silent) console.log('💬 Facilitating agent discussion...');
    
    const agents = ['architect', 'educator', 'visionary', 'philosopher'];
    const discussions = {};

    for (const agentId of agents) {
      const character = this.characterSystem.getCharacter(agentId);
      const insights = agentInsights[agentId];
      
      const prompt = `You are ${character.name} (Level ${character.level} - ${character.level_name}).

Based on your analysis and these potential improvements, provide your perspective:

Your Analysis:
${insights ? JSON.stringify(insights, null, 2) : 'No analysis available'}

Potential Improvements:
${JSON.stringify(improvements, null, 2)}

From your ${character.level_name} perspective, discuss:
1. Which improvements align with your domain expertise?
2. What's your priority ranking (top 5)?
3. What additional improvements do you see?
4. What are the risks or considerations?

Respond in JSON format:
{
  "perspective": "Your domain-specific view on these improvements",
  "top_priorities": [
    {
      "improvement_id": "improvement_1",
      "reason": "Why this is important from your perspective",
      "priority_score": 9
    }
  ],
  "additional_insights": ["Additional improvement you see"],
  "risks": ["Potential risks or considerations"],
  "recommendations": ["Specific actionable recommendations"]
}`;

      try {
        const response = await this.modelAdapter.callWithJSON(this.modelAdapter.defaultModel, prompt);
        discussions[agentId] = {
          character: character,
          discussion: response
        };
      } catch (error) {
        console.warn(`Failed to get discussion from ${agent.name}:`, error.message);
        discussions[agentId] = {
          character: character,
          discussion: {
            perspective: 'Discussion unavailable',
            top_priorities: [],
            additional_insights: [],
            risks: [],
            recommendations: []
          }
        };
      }
    }

    return discussions;
  }

  async generateCoachingReport(improvements, discussions) {
    if (!this.silent) console.log('📋 Generating coaching report...');
    
    const prompt = `Based on the agent discussions, create a comprehensive coaching report:

Improvements Analyzed:
${JSON.stringify(improvements, null, 2)}

Agent Discussions:
${JSON.stringify(discussions, null, 2)}

Create a coaching report that:
1. Synthesizes the agent perspectives
2. Provides a consensus priority ranking
3. Identifies quick wins vs long-term investments
4. Offers actionable next steps

Respond in JSON format:
{
  "executive_summary": "High-level overview of key findings",
  "consensus_priorities": [
    {
      "improvement_id": "improvement_1",
      "consensus_score": 8.5,
      "reason": "Why this is a consensus priority",
      "quick_win": true
    }
  ],
  "quick_wins": ["List of improvements that can be done quickly"],
  "long_term_investments": ["List of improvements requiring more effort"],
  "action_plan": {
    "immediate": ["Actions to take this week"],
    "short_term": ["Actions to take this month"],
    "long_term": ["Actions to take this quarter"]
  },
  "risks": ["Key risks identified by agents"],
  "recommendations": ["Top 3 actionable recommendations"]
}`;

    try {
      const response = await this.modelAdapter.callWithJSON(this.modelAdapter.defaultModel, prompt);
      return response;
    } catch (error) {
      console.warn('Failed to generate coaching report:', error.message);
      return {
        executive_summary: 'Coaching report generation failed',
        consensus_priorities: [],
        quick_wins: [],
        long_term_investments: [],
        action_plan: { immediate: [], short_term: [], long_term: [] },
        risks: [],
        recommendations: []
      };
    }
  }

  async runCoachingSession(repoContext, agentInsights) {
    if (!this.silent) console.log('🎓 Starting coaching session...');
    
    // Step 1: Analyze improvements
    const improvements = await this.analyzeImprovements(repoContext, agentInsights);
    
    if (improvements.length === 0) {
      console.log('No improvements identified');
      return null;
    }

    // Step 2: Facilitate agent discussion
    const discussions = await this.facilitateAgentDiscussion(improvements, agentInsights);
    
    // Step 3: Generate coaching report
    const coachingReport = await this.generateCoachingReport(improvements, discussions);
    
    return {
      improvements,
      discussions,
      coachingReport,
      timestamp: Date.now()
    };
  }
}

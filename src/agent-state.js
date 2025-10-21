/**
 * Agent State Management
 * Handles loading, saving, and managing agent memory/knowledge
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export class AgentState {
  constructor(agentId, basePath = '.agent-states') {
    this.agentId = agentId;
    this.basePath = basePath;
    this.statePath = join(basePath, `${agentId}.json`);
    this.state = null;
  }

  async load() {
    try {
      if (existsSync(this.statePath)) {
        const data = await readFile(this.statePath, 'utf8');
        this.state = JSON.parse(data);
        return true;
      }
    } catch (error) {
      console.warn(`Could not load state for ${this.agentId}:`, error.message);
    }
    return false;
  }

  async initialize(character, repoContext) {
    this.state = {
      agent: {
        id: this.agentId,
        name: character.name,
        level: character.level,
        levelName: character.level_name,
        focus: character.focus,
        evolved: false
      },
      knowledge: {
        entities: {
          components: [],
          patterns: [],
          concepts: [],
          relationships: []
        },
        understanding: {
          confidence_level: 0,
          key_insights: [],
          assumptions: []
        }
      },
      context: {
        repository: repoContext,
        lastAnalyzed: Date.now()
      },
      understanding: {
        insights: [],
        questions: [],
        observations: []
      },
      evolution: {
        transformations: [],
        learningHistory: []
      },
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
        version: '1.0.0'
      }
    };
    
    await this.save();
  }

  async save() {
    try {
      // Ensure directory exists
      await mkdir(this.basePath, { recursive: true });
      
      // Update timestamp
      if (this.state) {
        this.state.metadata.lastModified = Date.now();
      }
      
      // Write state
      await writeFile(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save state for ${this.agentId}: ${error.message}`);
    }
  }

  addInsight(insight) {
    if (!this.state.understanding.insights) {
      this.state.understanding.insights = [];
    }
    this.state.understanding.insights.push({
      text: insight,
      timestamp: Date.now()
    });
  }

  addEntity(type, entity) {
    if (!this.state.knowledge.entities[type]) {
      this.state.knowledge.entities[type] = [];
    }
    this.state.knowledge.entities[type].push(entity);
  }

  updateConfidence(level) {
    this.state.knowledge.understanding.confidence_level = level;
  }
}


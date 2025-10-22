/**
 * Deep Dive Analyzer
 * Performs recursive analysis at different levels of granularity
 */

import { NotesCache } from './notes-cache.js';
import { ModelAdapter } from './model-adapter.js';
import { CharacterSystem } from './character-system.js';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

export class DeepDiveAnalyzer {
  constructor(agentId, modelAdapter, characterSystem) {
    this.agentId = agentId;
    this.modelAdapter = modelAdapter;
    this.characterSystem = characterSystem;
    this.notesCache = new NotesCache(agentId);
  }

  async analyzeFile(filePath, repoContext) {
    console.log(`📄 Analyzing file: ${filePath}`);
    
    // Check if we already have notes for this file
    const existingNote = await this.notesCache.loadNote(filePath, 'file');
    if (existingNote && this.isNoteRecent(existingNote)) {
      console.log(`  ✓ Using cached notes for ${filePath}`);
      return existingNote;
    }

    // Read file content
    let content = '';
    try {
      content = await readFile(filePath, 'utf8');
    } catch (error) {
      console.warn(`Could not read file ${filePath}:`, error.message);
      return null;
    }

    // Analyze file content
    const character = this.characterSystem.getCharacter(this.agentId);
    const analysis = await this.analyzeContent(content, filePath, character, 'file');
    
    if (analysis) {
      await this.notesCache.saveNote(filePath, analysis, 'file');
    }
    
    return analysis;
  }

  async analyzeDirectory(dirPath, repoContext, maxDepth = 3) {
    console.log(`📁 Analyzing directory: ${dirPath}`);
    
    // Check if we already have notes for this directory
    const existingNote = await this.notesCache.loadNote(dirPath, 'directory');
    if (existingNote && this.isNoteRecent(existingNote)) {
      console.log(`  ✓ Using cached notes for ${dirPath}`);
      return existingNote;
    }

    // Get directory structure and contents
    const dirInfo = await this.getDirectoryInfo(dirPath, maxDepth);
    
    // Analyze directory
    const character = this.characterSystem.getCharacter(this.agentId);
    const analysis = await this.analyzeContent(dirInfo, dirPath, character, 'directory');
    
    if (analysis) {
      await this.notesCache.saveNote(dirPath, analysis, 'directory');
    }
    
    return analysis;
  }

  async analyzeModule(modulePath, repoContext) {
    console.log(`📦 Analyzing module: ${modulePath}`);
    
    // Check if we already have notes for this module
    const existingNote = await this.notesCache.loadNote(modulePath, 'module');
    if (existingNote && this.isNoteRecent(existingNote)) {
      console.log(`  ✓ Using cached notes for ${modulePath}`);
      return existingNote;
    }

    // Get module information
    const moduleInfo = await this.getModuleInfo(modulePath);
    
    // Analyze module
    const character = this.characterSystem.getCharacter(this.agentId);
    const analysis = await this.analyzeContent(moduleInfo, modulePath, character, 'module');
    
    if (analysis) {
      await this.notesCache.saveNote(modulePath, analysis, 'module');
    }
    
    return analysis;
  }

  async deepDiveAnalysis(repoPath, options = {}) {
    const {
      maxDepth = 3,
      includeFiles = true,
      includeDirectories = true,
      includeModules = true,
      fileExtensions = ['.js', '.ts', '.py', '.go', '.rs', '.java', '.cpp', '.c', '.h']
    } = options;

    console.log(`🔍 Starting deep dive analysis for ${this.agentId}...`);
    
    const results = {
      files: [],
      directories: [],
      modules: [],
      summary: null
    };

    // Get repository context
    const repoContext = await this.getRepositoryContext(repoPath);
    
    // Analyze at different levels
    if (includeFiles) {
      results.files = await this.analyzeFilesRecursive(repoPath, fileExtensions, maxDepth, repoContext);
    }
    
    if (includeDirectories) {
      results.directories = await this.analyzeDirectoriesRecursive(repoPath, maxDepth, repoContext);
    }
    
    if (includeModules) {
      results.modules = await this.analyzeModules(repoPath, repoContext);
    }

    // Generate summary
    results.summary = await this.generateDeepDiveSummary(results, repoContext);
    
    return results;
  }

  async analyzeFilesRecursive(dirPath, fileExtensions, maxDepth, repoContext) {
    if (maxDepth <= 0) return [];
    
    const results = [];
    
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isFile()) {
          const ext = entry.split('.').pop();
          if (fileExtensions.includes(`.${ext}`)) {
            const analysis = await this.analyzeFile(fullPath, repoContext);
            if (analysis) {
              results.push({
                path: fullPath,
                analysis: analysis
              });
            }
          }
        } else if (stats.isDirectory()) {
          const subResults = await this.analyzeFilesRecursive(fullPath, fileExtensions, maxDepth - 1, repoContext);
          results.push(...subResults);
        }
      }
    } catch (error) {
      console.warn(`Could not analyze directory ${dirPath}:`, error.message);
    }
    
    return results;
  }

  async analyzeDirectoriesRecursive(dirPath, maxDepth, repoContext) {
    if (maxDepth <= 0) return [];
    
    const results = [];
    
    try {
      const entries = await readdir(dirPath);
      const subdirs = [];
      
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          subdirs.push(fullPath);
        }
      }
      
      // Analyze current directory
      const analysis = await this.analyzeDirectory(dirPath, repoContext, maxDepth);
      if (analysis) {
        results.push({
          path: dirPath,
          analysis: analysis
        });
      }
      
      // Recursively analyze subdirectories
      for (const subdir of subdirs) {
        const subResults = await this.analyzeDirectoriesRecursive(subdir, maxDepth - 1, repoContext);
        results.push(...subResults);
      }
    } catch (error) {
      console.warn(`Could not analyze directory ${dirPath}:`, error.message);
    }
    
    return results;
  }

  async analyzeModules(repoPath, repoContext) {
    const results = [];
    
    // Look for package.json, go.mod, Cargo.toml, etc.
    const moduleFiles = [
      'package.json',
      'go.mod',
      'Cargo.toml',
      'pom.xml',
      'build.gradle',
      'requirements.txt',
      'setup.py',
      'pyproject.toml'
    ];
    
    for (const moduleFile of moduleFiles) {
      const modulePath = join(repoPath, moduleFile);
      try {
        const stats = await stat(modulePath);
        if (stats.isFile()) {
          const analysis = await this.analyzeModule(modulePath, repoContext);
          if (analysis) {
            results.push({
              path: modulePath,
              analysis: analysis
            });
          }
        }
      } catch (error) {
        // Module file doesn't exist
      }
    }
    
    return results;
  }

  async analyzeContent(content, path, character, level) {
    const prompt = `You are ${character.name} (Level ${character.level} - ${character.level_name}).

Analyze this ${level}:

Path: ${path}
Content:
${typeof content === 'string' ? content.substring(0, 4000) : JSON.stringify(content, null, 2)}

From your ${character.level_name} perspective, provide:
1. A summary of what you observe
2. Key insights specific to your domain
3. Entities for your knowledge base
4. Patterns or structures you notice

Respond in JSON format:
{
  "summary": "Brief overview of this ${level}",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "entities": {
    "components": ["component1", "component2"],
    "patterns": ["pattern1"],
    "concepts": ["concept1"]
  },
  "patterns": ["pattern observed"],
  "relationships": ["relationship to other parts"],
  "confidence": 75
}`;

    try {
      const response = await this.modelAdapter.callWithJSON(this.modelAdapter.defaultModel, prompt);
      return response;
    } catch (error) {
      console.warn(`Failed to analyze ${level} ${path}:`, error.message);
      return {
        summary: `Analysis failed for ${path}`,
        insights: ['Analysis unavailable'],
        entities: {},
        patterns: [],
        relationships: [],
        confidence: 0
      };
    }
  }

  async getDirectoryInfo(dirPath, maxDepth) {
    const info = {
      path: dirPath,
      files: [],
      directories: [],
      totalFiles: 0,
      totalDirectories: 0
    };
    
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isFile()) {
          info.files.push({
            name: entry,
            path: fullPath,
            size: stats.size
          });
          info.totalFiles++;
        } else if (stats.isDirectory()) {
          info.directories.push({
            name: entry,
            path: fullPath
          });
          info.totalDirectories++;
        }
      }
    } catch (error) {
      console.warn(`Could not get directory info for ${dirPath}:`, error.message);
    }
    
    return info;
  }

  async getModuleInfo(modulePath) {
    try {
      const content = await readFile(modulePath, 'utf8');
      return {
        path: modulePath,
        type: modulePath.split('.').pop(),
        content: content,
        size: content.length
      };
    } catch (error) {
      console.warn(`Could not read module ${modulePath}:`, error.message);
      return null;
    }
  }

  async getRepositoryContext(repoPath) {
    // This would be similar to the existing getRepositoryContext function
    // but focused on the specific repository path
    return {
      path: repoPath,
      timestamp: Date.now()
    };
  }

  async generateDeepDiveSummary(results, repoContext) {
    const character = this.characterSystem.getCharacter(this.agentId);
    
    const prompt = `You are ${character.name} (Level ${character.level} - ${character.level_name}).

Based on your deep dive analysis, provide a comprehensive summary:

Files Analyzed: ${results.files.length}
Directories Analyzed: ${results.directories.length}
Modules Analyzed: ${results.modules.length}

Repository Context:
${JSON.stringify(repoContext, null, 2)}

From your ${character.level_name} perspective, synthesize:
1. Overall architecture understanding
2. Key patterns across all levels
3. Most important insights
4. Recommendations for improvement

Respond in JSON format:
{
  "summary": "Comprehensive overview of the codebase",
  "architecture": "Understanding of the overall structure",
  "patterns": ["key patterns observed"],
  "insights": ["most important insights"],
  "recommendations": ["actionable recommendations"],
  "confidence": 85
}`;

    try {
      const response = await this.modelAdapter.callWithJSON(this.modelAdapter.defaultModel, prompt);
      return response;
    } catch (error) {
      console.warn('Failed to generate deep dive summary:', error.message);
      return {
        summary: 'Deep dive analysis completed',
        architecture: 'Analysis available in individual notes',
        patterns: [],
        insights: [],
        recommendations: [],
        confidence: 0
      };
    }
  }

  isNoteRecent(note, maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const age = Date.now() - note.timestamp;
    return age < maxAge;
  }
}

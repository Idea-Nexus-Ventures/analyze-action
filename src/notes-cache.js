/**
 * Notes Cache System
 * Manages agent notes at different levels of granularity
 */

import { readFile, writeFile, mkdir, readdir, stat, unlink, rmdir } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { existsSync } from 'fs';

export class NotesCache {
  constructor(agentId, basePath = '.agent-notes') {
    this.agentId = agentId;
    this.basePath = basePath;
    this.notesPath = join(basePath, agentId);
  }

  async ensureNotesDirectory() {
    if (!existsSync(this.notesPath)) {
      await mkdir(this.notesPath, { recursive: true });
    }
  }

  async saveNote(path, note, level = 'file') {
    await this.ensureNotesDirectory();
    
    const notePath = this.getNotePath(path, level);
    const noteDir = dirname(notePath);
    
    if (!existsSync(noteDir)) {
      await mkdir(noteDir, { recursive: true });
    }

    const noteData = {
      agent: this.agentId,
      path: path,
      level: level,
      timestamp: Date.now(),
      content: note,
      metadata: {
        size: JSON.stringify(note).length,
        version: '1.0.0'
      }
    };

    await writeFile(notePath, JSON.stringify(noteData, null, 2), 'utf8');
    return notePath;
  }

  async loadNote(path, level = 'file') {
    const notePath = this.getNotePath(path, level);
    
    if (!existsSync(notePath)) {
      return null;
    }

    try {
      const data = await readFile(notePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Failed to load note for ${path}:`, error.message);
      return null;
    }
  }

  async loadNotesForPath(path) {
    const notes = [];
    const levels = ['file', 'directory', 'module', 'package'];
    
    for (const level of levels) {
      const note = await this.loadNote(path, level);
      if (note) {
        notes.push(note);
      }
    }
    
    return notes;
  }

  async loadContextualNotes(targetPath, maxDepth = 3) {
    const notes = [];
    const pathParts = targetPath.split('/');
    
    // Load notes for current path and parent paths
    for (let i = 0; i <= Math.min(pathParts.length, maxDepth); i++) {
      const currentPath = pathParts.slice(0, i).join('/') || '.';
      const pathNotes = await this.loadNotesForPath(currentPath);
      notes.push(...pathNotes);
    }
    
    // Load notes for subdirectories (if target is a directory)
    try {
      const stats = await stat(targetPath);
      if (stats.isDirectory()) {
        const subNotes = await this.loadSubdirectoryNotes(targetPath, maxDepth - 1);
        notes.push(...subNotes);
      }
    } catch (error) {
      // Path doesn't exist or can't be accessed
    }
    
    return notes.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  async loadSubdirectoryNotes(dirPath, maxDepth) {
    if (maxDepth <= 0) return [];
    
    const notes = [];
    
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dirPath, entry);
        const entryNotes = await this.loadNotesForPath(fullPath);
        notes.push(...entryNotes);
        
        // Recursively load subdirectory notes
        try {
          const stats = await stat(fullPath);
          if (stats.isDirectory()) {
            const subNotes = await this.loadSubdirectoryNotes(fullPath, maxDepth - 1);
            notes.push(...subNotes);
          }
        } catch (error) {
          // Skip if can't access
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be accessed
    }
    
    return notes;
  }

  getNotePath(path, level) {
    // Sanitize path for filesystem
    const sanitizedPath = path.replace(/[^a-zA-Z0-9/._-]/g, '_');
    const fileName = `${level}.json`;
    
    if (path === '.' || path === '') {
      return join(this.notesPath, 'root', fileName);
    }
    
    return join(this.notesPath, sanitizedPath, fileName);
  }

  async listAllNotes() {
    const notes = [];
    
    try {
      await this.ensureNotesDirectory();
      const allNotes = await this.getAllNotesRecursive(this.notesPath);
      notes.push(...allNotes);
    } catch (error) {
      console.warn('Failed to list notes:', error.message);
    }
    
    return notes;
  }

  async getAllNotesRecursive(dirPath) {
    const notes = [];
    
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          const subNotes = await this.getAllNotesRecursive(fullPath);
          notes.push(...subNotes);
        } else if (entry.endsWith('.json')) {
          try {
            const data = await readFile(fullPath, 'utf8');
            const note = JSON.parse(data);
            notes.push(note);
          } catch (error) {
            // Skip malformed notes
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be accessed
    }
    
    return notes;
  }

  async clearNotes(path = null) {
    if (path) {
      const notePath = this.getNotePath(path, 'file');
      const noteDir = dirname(notePath);
      
      if (existsSync(noteDir)) {
        await this.removeDirectory(noteDir);
      }
    } else {
      if (existsSync(this.notesPath)) {
        await this.removeDirectory(this.notesPath);
      }
    }
  }

  async removeDirectory(dirPath) {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.removeDirectory(fullPath);
        } else {
          await unlink(fullPath);
        }
      }
      
      await rmdir(dirPath);
    } catch (error) {
      // Directory doesn't exist or can't be removed
    }
  }
}

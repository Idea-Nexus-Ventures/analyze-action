/**
 * GitHub Integration
 * Handles git operations and repository context gathering
 */

import { simpleGit } from 'simple-git';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

export class GitHubIntegration {
  constructor(repoPath = '.') {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async initializeAgentBranches() {
    const agents = ['architect', 'educator', 'visionary', 'philosopher'];
    const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

    for (const agent of agents) {
      const branchName = `agent/${agent}`;
      
      try {
        // Check if branch exists
        const branches = await this.git.branch();
        
        if (!branches.all.includes(branchName)) {
          // Create new branch from current branch
          await this.git.checkoutBranch(branchName, currentBranch);
          console.log(`Created branch: ${branchName}`);
        } else {
          console.log(`Branch already exists: ${branchName}`);
        }
      } catch (error) {
        console.warn(`Could not create branch ${branchName}:`, error.message);
      }
    }

    // Return to original branch
    await this.git.checkout(currentBranch);
  }

  async getRepoContext() {
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

    // Try to read package.json
    try {
      const packageJson = JSON.parse(await readFile(join(this.repoPath, 'package.json'), 'utf8'));
      context.packageInfo = {
        name: packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
        dependencies: packageJson.dependencies || {}
      };
    } catch (e) {
      // No package.json, that's ok
    }

    // Get file structure
    const files = await this.getFilesRecursively(this.repoPath, [
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

  async getFilesRecursively(dir, ignoreDirs = []) {
    const files = [];
    
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        if (entry.startsWith('.') && entry !== '.github') continue;
        
        const fullPath = join(dir, entry);
        const relativePath = fullPath.replace(this.repoPath + '/', '');
        
        // Check if should ignore
        if (ignoreDirs.some(ignore => relativePath.includes(ignore))) {
          continue;
        }
        
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          files.push(...(await this.getFilesRecursively(fullPath, ignoreDirs)));
        } else {
          files.push(relativePath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return files;
  }

  async commitAndPush(branch, message, files = []) {
    try {
      await this.git.checkout(branch);
      
      if (files.length > 0) {
        await this.git.add(files);
      } else {
        await this.git.add('.');
      }
      
      await this.git.commit(message);
      await this.git.push('origin', branch);
      
      return true;
    } catch (error) {
      console.error(`Failed to commit/push to ${branch}:`, error.message);
      return false;
    }
  }
}


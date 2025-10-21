/**
 * Character System
 * Loads and manages agent character definitions
 */

import { readFile } from 'fs/promises';

export class CharacterSystem {
  constructor(characterFilePath) {
    this.characterFilePath = characterFilePath;
    this.characters = {};
  }

  async loadCharacters() {
    try {
      const data = await readFile(this.characterFilePath, 'utf8');
      const characterData = JSON.parse(data);
      
      // Store characters by ID for easy lookup
      if (characterData.characters && Array.isArray(characterData.characters)) {
        for (const char of characterData.characters) {
          this.characters[char.id] = char;
        }
      }
    } catch (error) {
      throw new Error(`Failed to load characters from ${this.characterFilePath}: ${error.message}`);
    }
  }

  getCharacter(id) {
    const character = this.characters[id];
    if (!character) {
      throw new Error(`Character '${id}' not found`);
    }
    return character;
  }

  getAllCharacters() {
    return Object.values(this.characters);
  }

  getCharactersByLevel(level) {
    return Object.values(this.characters).filter(c => c.level === level);
  }
}


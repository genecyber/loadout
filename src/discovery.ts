/**
 * Skill discovery and file watching
 * Discovers skills from local directories and bundled skills.
 *
 * Search order:
 * 1. Bundled skills (./bundled-skills relative to module - for published bundles)
 * 2. Project-local skills (./skills relative to cwd)
 * 3. Custom paths passed via --skills-dir
 */

import { EventEmitter } from 'node:events';
import { readdir, stat, access, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { watch as chokidarWatch, type FSWatcher } from 'chokidar';
import type { DiscoveredSkill } from './types.js';
import { parseSkillFile, listSkillFiles } from './parser.js';

// Get the directory where this module is located (for finding bundled skills)
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Event payloads for SkillDiscovery events
 */
export interface SkillDiscoveredEvent {
  skill: DiscoveredSkill;
}

export interface SkillUpdatedEvent {
  skill: DiscoveredSkill;
  previous: DiscoveredSkill | undefined;
}

export interface SkillRemovedEvent {
  name: string;
  path: string;
}

/**
 * Event map for typed EventEmitter
 */
export interface SkillDiscoveryEvents {
  'skill:discovered': [SkillDiscoveredEvent];
  'skill:updated': [SkillUpdatedEvent];
  'skill:removed': [SkillRemovedEvent];
  error: [Error];
}

/**
 * Discovers and watches skill directories for SKILL.md files
 */
export class SkillDiscovery extends EventEmitter<SkillDiscoveryEvents> {
  private skills: Map<string, DiscoveredSkill> = new Map();
  private watcher: FSWatcher | null = null;
  private searchPaths: string[];

  /**
   * Create a new SkillDiscovery instance
   * @param customPaths - Additional paths to search for skills
   */
  constructor(customPaths?: string[]) {
    super();

    const home = process.env.HOME || process.env.USERPROFILE || '';

    // Default search paths
    this.searchPaths = [
      // 1. Bundled skills (for published skill packs)
      //    Located relative to the dist/ directory
      join(__dirname, '..', 'bundled-skills'),

      // 2. Project-local skills directory (for development)
      join(process.cwd(), 'skills'),

      // 3. Common agent skill directories (project-relative)
      join(process.cwd(), '.claude', 'skills'),
      join(process.cwd(), '.cursor', 'skills'),
      join(process.cwd(), '.codex', 'skills'),
      join(process.cwd(), '.agents', 'skills'),

      // 4. Common agent skill directories (user home - for globally installed skills)
      ...(home ? [
        join(home, '.claude', 'skills'),
        join(home, '.cursor', 'skills'),
        join(home, '.codex', 'skills'),
        join(home, '.agents', 'skills'),
      ] : []),
    ];

    // Add any custom paths from --skills-dir
    if (customPaths && customPaths.length > 0) {
      this.searchPaths.push(...customPaths);
    }
  }

  /**
   * Check if a directory exists and is accessible
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      await access(dirPath);
      const dirStat = await stat(dirPath);
      return dirStat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Discover a skill from a SKILL.md file path
   */
  private async discoverSkillFromPath(skillMdPath: string): Promise<DiscoveredSkill | null> {
    try {
      const parsed = await parseSkillFile(skillMdPath);
      const skillDir = dirname(skillMdPath);

      // List files in skill subdirectories
      const files = await listSkillFiles(skillDir);
      parsed.files = files;

      const skill: DiscoveredSkill = {
        name: parsed.frontmatter.name,
        description: parsed.frontmatter.description,
        path: skillDir,
        skillMdPath,
        parsed,
      };

      return skill;
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Scan a single search path for skills
   */
  private async scanPath(searchPath: string): Promise<void> {
    if (!(await this.directoryExists(searchPath))) {
      return;
    }

    try {
      const entries = await readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillMdPath = join(searchPath, entry.name, 'SKILL.md');

          try {
            await access(skillMdPath);
            const skill = await this.discoverSkillFromPath(skillMdPath);

            if (skill && skill.name) {
              this.skills.set(skill.name, skill);
              this.emit('skill:discovered', { skill });
            }
          } catch {
            // SKILL.md doesn't exist in this directory, skip
          }
        }
      }
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Initial scan of all skill directories
   */
  async scan(): Promise<void> {
    for (const searchPath of this.searchPaths) {
      await this.scanPath(searchPath);
    }
  }

  /**
   * Start watching for changes in skill directories
   */
  watch(): void {
    if (this.watcher) {
      return; // Already watching
    }

    // Build glob patterns for all search paths
    const patterns = this.searchPaths.map((p) => join(p, '*', 'SKILL.md'));

    this.watcher = chokidarWatch(patterns, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher.on('add', async (filePath: string) => {
      const skill = await this.discoverSkillFromPath(filePath);
      if (skill && skill.name) {
        const previous = this.skills.get(skill.name);
        this.skills.set(skill.name, skill);
        if (previous) {
          this.emit('skill:updated', { skill, previous });
        } else {
          this.emit('skill:discovered', { skill });
        }
      }
    });

    this.watcher.on('change', async (filePath: string) => {
      const skill = await this.discoverSkillFromPath(filePath);
      if (skill && skill.name) {
        const previous = this.skills.get(skill.name);
        this.skills.set(skill.name, skill);
        this.emit('skill:updated', { skill, previous });
      }
    });

    this.watcher.on('unlink', (filePath: string) => {
      const skillDir = dirname(filePath);
      // Find the skill by its path
      for (const [name, skill] of this.skills.entries()) {
        if (skill.skillMdPath === filePath) {
          this.skills.delete(name);
          this.emit('skill:removed', { name, path: skillDir });
          break;
        }
      }
    });

    this.watcher.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  /**
   * Stop watching for changes
   */
  async close(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Get a skill by name
   * @param name - The skill name
   * @returns The discovered skill or undefined if not found
   */
  getSkill(name: string): DiscoveredSkill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all discovered skills
   * @returns Array of all discovered skills
   */
  getAllSkills(): DiscoveredSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Search skills by query (matches name or description)
   * @param query - Search query string
   * @returns Array of skills matching the query
   */
  searchSkills(query: string): DiscoveredSkill[] {
    const q = query.toLowerCase();
    return this.getAllSkills().filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }

  /**
   * Get the search paths being used
   * @returns Array of search paths
   */
  getSearchPaths(): string[] {
    return [...this.searchPaths];
  }
}

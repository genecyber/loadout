/**
 * Unit tests for skill discovery
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SkillDiscovery } from './discovery.js';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

describe('SkillDiscovery', () => {
  const testDir = join(import.meta.dirname ?? '', '__fixtures__', 'discovery-test');
  const skillDir = join(testDir, 'test-discovery-skill');

  beforeAll(async () => {
    // Create test directory structure
    await mkdir(skillDir, { recursive: true });
    await mkdir(join(skillDir, 'references'), { recursive: true });
    await mkdir(join(skillDir, 'scripts'), { recursive: true });

    // Create a test SKILL.md file
    const skillContent = `---
name: test-discovery-skill
description: A skill for testing discovery
license: MIT
---

# Test Discovery Skill

This skill is used for testing the discovery mechanism.

## Usage

\`\`\`bash
echo "Hello"
\`\`\`
`;
    await writeFile(join(skillDir, 'SKILL.md'), skillContent);

    // Create a reference file
    await writeFile(join(skillDir, 'references', 'api.md'), '# API Documentation');

    // Create a script file
    await writeFile(join(skillDir, 'scripts', 'helper.sh'), '#!/bin/bash\necho "helper"');
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('discover skills from test directory', () => {
    it('should discover skills from custom path', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const skills = discovery.getAllSkills();
      const skill = skills.find((s) => s.name === 'test-discovery-skill');

      expect(skill).toBeDefined();
      expect(skill?.description).toBe('A skill for testing discovery');
      expect(skill?.path).toBe(skillDir);
      expect(skill?.skillMdPath).toBe(join(skillDir, 'SKILL.md'));
    });

    it('should populate parsed data', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const skill = discovery.getSkill('test-discovery-skill');

      expect(skill?.parsed).toBeDefined();
      expect(skill?.parsed?.frontmatter.name).toBe('test-discovery-skill');
      expect(skill?.parsed?.toc.length).toBeGreaterThan(0);
      expect(skill?.parsed?.codeBlocks.length).toBeGreaterThan(0);
    });

    it('should list files in skill subdirectories', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const skill = discovery.getSkill('test-discovery-skill');

      expect(skill?.parsed?.files.references).toContain('api.md');
      expect(skill?.parsed?.files.scripts).toContain('helper.sh');
    });
  });

  describe('search skills by query', () => {
    it('should search by name', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const results = discovery.searchSkills('discovery');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('discovery');
    });

    it('should search by description', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      // Search for "testing" which is in the description "A skill for testing discovery"
      const results = discovery.searchSkills('testing');

      expect(results.length).toBeGreaterThan(0);
      const testSkill = results.find((s) => s.name === 'test-discovery-skill');
      expect(testSkill).toBeDefined();
      expect(testSkill?.description).toContain('testing');
    });

    it('should be case insensitive', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const results = discovery.searchSkills('DISCOVERY');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const results = discovery.searchSkills('nonexistent-query-xyz');

      expect(results).toEqual([]);
    });
  });

  describe('get skill by name', () => {
    it('should return skill when it exists', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const skill = discovery.getSkill('test-discovery-skill');

      expect(skill).toBeDefined();
      expect(skill?.name).toBe('test-discovery-skill');
    });

    it('should return undefined for non-existent skill', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const skill = discovery.getSkill('non-existent-skill');

      expect(skill).toBeUndefined();
    });
  });

  describe('handle missing directories', () => {
    it('should not throw when search path does not exist', async () => {
      const discovery = new SkillDiscovery(['/non/existent/path/12345']);

      await expect(discovery.scan()).resolves.not.toThrow();
    });

    it('should not find skills from non-existent custom path', async () => {
      const discovery = new SkillDiscovery(['/non/existent/path/12345']);
      await discovery.scan();

      // Search for a skill that would only exist in the non-existent path
      const skill = discovery.getSkill('non-existent-skill-from-fake-path');

      expect(skill).toBeUndefined();
    });

    it('should skip directories without SKILL.md', async () => {
      const emptyDir = join(testDir, 'empty-skill-dir');
      await mkdir(emptyDir, { recursive: true });

      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const skills = discovery.getAllSkills();
      const emptySkill = skills.find((s) => s.path === emptyDir);

      expect(emptySkill).toBeUndefined();
    });
  });

  describe('getSearchPaths', () => {
    it('should return custom paths plus defaults', () => {
      const discovery = new SkillDiscovery(['/custom/path']);
      const paths = discovery.getSearchPaths();

      expect(paths).toContain('/custom/path');
      expect(paths.some((p) => p.includes('.claude/skills'))).toBe(true);
    });

    it('should include default paths', () => {
      const discovery = new SkillDiscovery();
      const paths = discovery.getSearchPaths();

      expect(paths.some((p) => p.includes('.claude/skills'))).toBe(true);
      expect(paths.some((p) => p.includes('.codex/skills'))).toBe(true);
      expect(paths.some((p) => p.includes('.cursor/skills'))).toBe(true);
    });
  });

  describe('getAllSkills', () => {
    it('should return array of all discovered skills', async () => {
      const discovery = new SkillDiscovery([testDir]);
      await discovery.scan();

      const skills = discovery.getAllSkills();

      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBeGreaterThan(0);
    });
  });

  describe('close', () => {
    it('should not throw when closing without watching', async () => {
      const discovery = new SkillDiscovery([testDir]);

      await expect(discovery.close()).resolves.not.toThrow();
    });

    it('should close watcher gracefully', async () => {
      const discovery = new SkillDiscovery([testDir]);
      discovery.watch();

      await expect(discovery.close()).resolves.not.toThrow();
    });
  });
});

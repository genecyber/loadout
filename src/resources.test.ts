/**
 * Unit tests for resource URI handling
 */

import { describe, it, expect } from 'vitest';
import { parseSkillUri, type ParsedSkillUri } from './resources.js';

describe('parseSkillUri', () => {
  describe('parse loadout:// URIs correctly', () => {
    it('should parse basic skill URI', () => {
      const result = parseSkillUri('loadout://my-skill');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'content',
      });
    });

    it('should parse skill URI with hyphenated name', () => {
      const result = parseSkillUri('loadout://my-complex-skill-name');

      expect(result).toEqual({
        name: 'my-complex-skill-name',
        type: 'content',
      });
    });

    it('should parse skill URI with underscore name', () => {
      const result = parseSkillUri('loadout://my_skill_name');

      expect(result).toEqual({
        name: 'my_skill_name',
        type: 'content',
      });
    });
  });

  describe('parse loadout://{name}/manifest URIs', () => {
    it('should parse manifest URI', () => {
      const result = parseSkillUri('loadout://test-skill/manifest');

      expect(result).toEqual({
        name: 'test-skill',
        type: 'manifest',
      });
    });

    it('should parse manifest URI for different skill names', () => {
      const result = parseSkillUri('loadout://another-skill/manifest');

      expect(result).toEqual({
        name: 'another-skill',
        type: 'manifest',
      });
    });
  });

  describe('parse loadout://{name}/section/{slug} URIs', () => {
    it('should parse section URI', () => {
      const result = parseSkillUri('loadout://my-skill/section/installation');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'section',
        param: 'installation',
      });
    });

    it('should parse section URI with hyphenated slug', () => {
      const result = parseSkillUri('loadout://my-skill/section/getting-started');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'section',
        param: 'getting-started',
      });
    });

    it('should parse section URI with numbered slug', () => {
      const result = parseSkillUri('loadout://my-skill/section/section-1');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'section',
        param: 'section-1',
      });
    });
  });

  describe('parse loadout://{name}/code/{index} URIs', () => {
    it('should parse code URI with index 0', () => {
      const result = parseSkillUri('loadout://my-skill/code/0');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'code',
        param: '0',
      });
    });

    it('should parse code URI with higher index', () => {
      const result = parseSkillUri('loadout://my-skill/code/5');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'code',
        param: '5',
      });
    });

    it('should parse code URI with double-digit index', () => {
      const result = parseSkillUri('loadout://my-skill/code/12');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'code',
        param: '12',
      });
    });
  });

  describe('parse loadout://{name}/references/{file} URIs', () => {
    it('should parse references URI', () => {
      const result = parseSkillUri('loadout://my-skill/references/api.md');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'references',
        param: 'api.md',
      });
    });

    it('should parse nested references path', () => {
      const result = parseSkillUri('loadout://my-skill/references/docs/api/v2.md');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'references',
        param: 'docs/api/v2.md',
      });
    });
  });

  describe('parse loadout://{name}/scripts/{file} URIs', () => {
    it('should parse scripts URI', () => {
      const result = parseSkillUri('loadout://my-skill/scripts/setup.sh');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'scripts',
        param: 'setup.sh',
      });
    });

    it('should parse nested scripts path', () => {
      const result = parseSkillUri('loadout://my-skill/scripts/utils/helper.sh');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'scripts',
        param: 'utils/helper.sh',
      });
    });
  });

  describe('parse loadout://{name}/assets/{file} URIs', () => {
    it('should parse assets URI', () => {
      const result = parseSkillUri('loadout://my-skill/assets/logo.png');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'assets',
        param: 'logo.png',
      });
    });

    it('should parse nested assets path', () => {
      const result = parseSkillUri('loadout://my-skill/assets/images/icons/icon.svg');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'assets',
        param: 'images/icons/icon.svg',
      });
    });
  });

  describe('handle invalid URIs', () => {
    it('should return null for non-skill scheme', () => {
      const result = parseSkillUri('http://example.com');
      expect(result).toBeNull();
    });

    it('should return null for file:// scheme', () => {
      const result = parseSkillUri('file:///path/to/file');
      expect(result).toBeNull();
    });

    it('should return null for empty skill path', () => {
      const result = parseSkillUri('loadout://');
      expect(result).toBeNull();
    });

    it('should return null for loadout:// with trailing slash only', () => {
      const result = parseSkillUri('loadout:///');
      expect(result).toBeNull();
    });

    it('should return null for unknown resource type', () => {
      const result = parseSkillUri('loadout://my-skill/unknown/path');
      expect(result).toBeNull();
    });

    it('should return null for manifest with extra path', () => {
      const result = parseSkillUri('loadout://my-skill/manifest/extra');
      expect(result).toBeNull();
    });

    it('should return null for section without slug', () => {
      const result = parseSkillUri('loadout://my-skill/section');
      expect(result).toBeNull();
    });

    it('should return null for code without index', () => {
      const result = parseSkillUri('loadout://my-skill/code');
      expect(result).toBeNull();
    });

    it('should return null for references without file', () => {
      const result = parseSkillUri('loadout://my-skill/references');
      expect(result).toBeNull();
    });

    it('should return null for scripts without file', () => {
      const result = parseSkillUri('loadout://my-skill/scripts');
      expect(result).toBeNull();
    });

    it('should return null for assets without file', () => {
      const result = parseSkillUri('loadout://my-skill/assets');
      expect(result).toBeNull();
    });

    it('should return null for completely invalid string', () => {
      const result = parseSkillUri('not a uri at all');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseSkillUri('');
      expect(result).toBeNull();
    });

    it('should return null for partial skill scheme', () => {
      const result = parseSkillUri('skill:/my-skill');
      expect(result).toBeNull();
    });

    it('should return null for skill: without slashes', () => {
      const result = parseSkillUri('skill:my-skill');
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle skill name with numbers', () => {
      const result = parseSkillUri('loadout://skill123');

      expect(result).toEqual({
        name: 'skill123',
        type: 'content',
      });
    });

    it('should handle skill name starting with number', () => {
      const result = parseSkillUri('loadout://123-skill');

      expect(result).toEqual({
        name: '123-skill',
        type: 'content',
      });
    });

    it('should handle file extensions in code index', () => {
      // This is a valid URI - code index can be any string
      const result = parseSkillUri('loadout://my-skill/code/test.js');

      expect(result).toEqual({
        name: 'my-skill',
        type: 'code',
        param: 'test.js',
      });
    });
  });
});

describe('ParsedSkillUri type', () => {
  it('should have correct shape for content type', () => {
    const uri: ParsedSkillUri = {
      name: 'test',
      type: 'content',
    };
    expect(uri.type).toBe('content');
    expect(uri.param).toBeUndefined();
  });

  it('should have correct shape for manifest type', () => {
    const uri: ParsedSkillUri = {
      name: 'test',
      type: 'manifest',
    };
    expect(uri.type).toBe('manifest');
  });

  it('should have correct shape for section type with param', () => {
    const uri: ParsedSkillUri = {
      name: 'test',
      type: 'section',
      param: 'installation',
    };
    expect(uri.type).toBe('section');
    expect(uri.param).toBe('installation');
  });

  it('should have correct shape for code type with param', () => {
    const uri: ParsedSkillUri = {
      name: 'test',
      type: 'code',
      param: '0',
    };
    expect(uri.type).toBe('code');
    expect(uri.param).toBe('0');
  });

  it('should have correct shape for references type', () => {
    const uri: ParsedSkillUri = {
      name: 'test',
      type: 'references',
      param: 'api.md',
    };
    expect(uri.type).toBe('references');
    expect(uri.param).toBe('api.md');
  });

  it('should have correct shape for scripts type', () => {
    const uri: ParsedSkillUri = {
      name: 'test',
      type: 'scripts',
      param: 'setup.sh',
    };
    expect(uri.type).toBe('scripts');
    expect(uri.param).toBe('setup.sh');
  });

  it('should have correct shape for assets type', () => {
    const uri: ParsedSkillUri = {
      name: 'test',
      type: 'assets',
      param: 'logo.png',
    };
    expect(uri.type).toBe('assets');
    expect(uri.param).toBe('logo.png');
  });
});

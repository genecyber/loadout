/**
 * Unit tests for SKILL.md parser
 */

import { describe, it, expect } from 'vitest';
import { parseSkillMd, createManifest, listSkillFiles } from './parser.js';
import { join } from 'node:path';

describe('parseSkillMd', () => {
  describe('valid SKILL.md with frontmatter', () => {
    it('should parse frontmatter correctly', () => {
      const content = `---
name: my-skill
description: A skill description
license: MIT
version: 1.0.0
author: Test Author
---

# My Skill

Content here.
`;
      const result = parseSkillMd(content);

      expect(result.frontmatter.name).toBe('my-skill');
      expect(result.frontmatter.description).toBe('A skill description');
      expect(result.frontmatter.license).toBe('MIT');
      expect(result.frontmatter.version).toBe('1.0.0');
      expect(result.frontmatter.author).toBe('Test Author');
    });

    it('should parse optional metadata in frontmatter', () => {
      const content = `---
name: skill-with-metadata
description: A skill with metadata
metadata:
  category: testing
  tags:
    - unit-test
    - example
---

# Content
`;
      const result = parseSkillMd(content);

      expect(result.frontmatter.metadata).toEqual({
        category: 'testing',
        tags: ['unit-test', 'example'],
      });
    });
  });

  describe('table of contents extraction', () => {
    it('should extract headers with correct levels', () => {
      const content = `---
name: toc-test
description: Test ToC extraction
---

# Main Title

## Section One

### Subsection A

## Section Two
`;
      const result = parseSkillMd(content);

      expect(result.toc).toHaveLength(4);
      expect(result.toc[0]).toMatchObject({ level: 1, text: 'Main Title' });
      expect(result.toc[1]).toMatchObject({ level: 2, text: 'Section One' });
      expect(result.toc[2]).toMatchObject({ level: 3, text: 'Subsection A' });
      expect(result.toc[3]).toMatchObject({ level: 2, text: 'Section Two' });
    });

    it('should generate correct slugs for headers', () => {
      const content = `---
name: slug-test
description: Test slug generation
---

# Hello World

## Special Characters!

## Duplicate Header

## Duplicate Header
`;
      const result = parseSkillMd(content);

      expect(result.toc[0].slug).toBe('hello-world');
      expect(result.toc[1].slug).toBe('special-characters');
      expect(result.toc[2].slug).toBe('duplicate-header');
      // github-slugger appends -1 for duplicate slugs
      expect(result.toc[3].slug).toBe('duplicate-header-1');
    });

    it('should include line numbers for headers', () => {
      const content = `---
name: line-test
description: Test line numbers
---

# First Header

Some content.

## Second Header
`;
      const result = parseSkillMd(content);

      expect(result.toc[0].line).toBeGreaterThan(0);
      expect(result.toc[1].line).toBeGreaterThan(result.toc[0].line);
    });
  });

  describe('code block extraction', () => {
    it('should extract code blocks with language', () => {
      const content = `---
name: code-test
description: Test code extraction
---

# Code Example

\`\`\`javascript
console.log("Hello");
\`\`\`

\`\`\`python
print("Hello")
\`\`\`
`;
      const result = parseSkillMd(content);

      expect(result.codeBlocks).toHaveLength(2);
      expect(result.codeBlocks[0].lang).toBe('javascript');
      expect(result.codeBlocks[0].content).toBe('console.log("Hello");');
      expect(result.codeBlocks[1].lang).toBe('python');
      expect(result.codeBlocks[1].content).toBe('print("Hello")');
    });

    it('should handle code blocks without language', () => {
      const content = `---
name: no-lang-test
description: Test code without language
---

# Example

\`\`\`
some plain text code
\`\`\`
`;
      const result = parseSkillMd(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].lang).toBeNull();
      expect(result.codeBlocks[0].content).toBe('some plain text code');
    });

    it('should include line numbers for code blocks', () => {
      const content = `---
name: code-line-test
description: Test code line numbers
---

# First

\`\`\`js
code1
\`\`\`

# Second

\`\`\`js
code2
\`\`\`
`;
      const result = parseSkillMd(content);

      expect(result.codeBlocks[0].line).toBeGreaterThan(0);
      expect(result.codeBlocks[1].line).toBeGreaterThan(result.codeBlocks[0].line);
    });
  });

  describe('link extraction', () => {
    it('should extract internal links', () => {
      const content = `---
name: link-test
description: Test link extraction
---

# Links

See [API docs](references/api.md) for more.
See [Script](scripts/helper.sh) to run.
See [Image](assets/logo.png) for branding.
`;
      const result = parseSkillMd(content);

      expect(result.links).toHaveLength(3);
      expect(result.links[0]).toMatchObject({
        text: 'API docs',
        href: 'references/api.md',
        isInternal: true,
      });
      expect(result.links[1]).toMatchObject({
        text: 'Script',
        href: 'scripts/helper.sh',
        isInternal: true,
      });
      expect(result.links[2]).toMatchObject({
        text: 'Image',
        href: 'assets/logo.png',
        isInternal: true,
      });
    });

    it('should extract external links', () => {
      const content = `---
name: external-test
description: Test external links
---

# External Links

Visit [GitHub](https://github.com) for code.
Visit [Example](https://example.com/path) for docs.
`;
      const result = parseSkillMd(content);

      expect(result.links).toHaveLength(2);
      expect(result.links[0]).toMatchObject({
        text: 'GitHub',
        href: 'https://github.com',
        isInternal: false,
      });
      expect(result.links[1]).toMatchObject({
        text: 'Example',
        href: 'https://example.com/path',
        isInternal: false,
      });
    });

    it('should handle relative internal paths with ./', () => {
      const content = `---
name: relative-test
description: Test relative paths
---

See [API](./references/api.md) and [Script](./scripts/run.sh).
`;
      const result = parseSkillMd(content);

      expect(result.links[0].isInternal).toBe(true);
      expect(result.links[1].isInternal).toBe(true);
    });
  });

  describe('missing frontmatter handling', () => {
    it('should handle completely missing frontmatter', () => {
      const content = `# Just a Header

Some content without frontmatter.
`;
      const result = parseSkillMd(content);

      expect(result.frontmatter.name).toBe('');
      expect(result.frontmatter.description).toBe('');
      expect(result.frontmatter.license).toBeUndefined();
      expect(result.toc).toHaveLength(1);
    });

    it('should handle partial frontmatter', () => {
      const content = `---
name: partial-skill
---

# Content
`;
      const result = parseSkillMd(content);

      expect(result.frontmatter.name).toBe('partial-skill');
      expect(result.frontmatter.description).toBe('');
      expect(result.frontmatter.license).toBeUndefined();
    });
  });

  describe('empty content handling', () => {
    it('should handle empty string', () => {
      const result = parseSkillMd('');

      expect(result.frontmatter.name).toBe('');
      expect(result.frontmatter.description).toBe('');
      expect(result.body).toBe('');
      expect(result.toc).toHaveLength(0);
      expect(result.codeBlocks).toHaveLength(0);
      expect(result.links).toHaveLength(0);
    });

    it('should handle frontmatter only', () => {
      const content = `---
name: empty-body
description: No body content
---
`;
      const result = parseSkillMd(content);

      expect(result.frontmatter.name).toBe('empty-body');
      expect(result.body.trim()).toBe('');
      expect(result.toc).toHaveLength(0);
    });

    it('should handle whitespace only body', () => {
      const content = `---
name: whitespace
description: Whitespace body
---



`;
      const result = parseSkillMd(content);

      expect(result.frontmatter.name).toBe('whitespace');
      expect(result.toc).toHaveLength(0);
      expect(result.codeBlocks).toHaveLength(0);
    });
  });

  describe('body content', () => {
    it('should preserve markdown body without frontmatter', () => {
      const content = `---
name: body-test
description: Test body
---

# Header

Paragraph content.
`;
      const result = parseSkillMd(content);

      expect(result.body).toContain('# Header');
      expect(result.body).toContain('Paragraph content.');
      expect(result.body).not.toContain('name: body-test');
    });
  });

  describe('files initialization', () => {
    it('should initialize files arrays as empty', () => {
      const content = `---
name: files-test
description: Test files
---

# Content
`;
      const result = parseSkillMd(content);

      expect(result.files).toEqual({
        scripts: [],
        references: [],
        assets: [],
      });
    });
  });
});

describe('createManifest', () => {
  it('should create manifest from parsed skill', () => {
    const content = `---
name: manifest-test
description: Test manifest creation
license: MIT
version: 2.0.0
author: Author Name
---

# Title

## Section

\`\`\`javascript
const x = 1;
\`\`\`

[Link](https://example.com)
`;
    const parsed = parseSkillMd(content);
    parsed.files = {
      scripts: ['script.sh'],
      references: ['doc.md'],
      assets: ['logo.png'],
    };

    const manifest = createManifest(parsed);

    expect(manifest.name).toBe('manifest-test');
    expect(manifest.description).toBe('Test manifest creation');
    expect(manifest.license).toBe('MIT');
    expect(manifest.version).toBe('2.0.0');
    expect(manifest.author).toBe('Author Name');
    expect(manifest.toc).toHaveLength(2);
    expect(manifest.codeBlocks).toHaveLength(1);
    expect(manifest.codeBlocks[0].preview).toBe('const x = 1;');
    expect(manifest.links).toHaveLength(1);
    expect(manifest.files).toEqual({
      scripts: ['script.sh'],
      references: ['doc.md'],
      assets: ['logo.png'],
    });
  });

  it('should truncate code block preview to 100 characters', () => {
    const longCode = 'x'.repeat(150);
    const content = `---
name: long-code
description: Test long code preview
---

\`\`\`javascript
${longCode}
\`\`\`
`;
    const parsed = parseSkillMd(content);
    const manifest = createManifest(parsed);

    expect(manifest.codeBlocks[0].preview).toHaveLength(100);
  });
});

describe('listSkillFiles', () => {
  const fixturesPath = join(import.meta.dirname ?? '', '__fixtures__', 'test-skill');

  it('should list files from existing subdirectories', async () => {
    const result = await listSkillFiles(fixturesPath);

    expect(result).toHaveProperty('scripts');
    expect(result).toHaveProperty('references');
    expect(result).toHaveProperty('assets');
    expect(Array.isArray(result.scripts)).toBe(true);
    expect(Array.isArray(result.references)).toBe(true);
    expect(Array.isArray(result.assets)).toBe(true);
  });

  it('should return empty arrays for non-existent directory', async () => {
    const result = await listSkillFiles('/non/existent/path');

    expect(result.scripts).toEqual([]);
    expect(result.references).toEqual([]);
    expect(result.assets).toEqual([]);
  });
});

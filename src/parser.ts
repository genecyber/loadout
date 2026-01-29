/**
 * SKILL.md file parser
 * Parses markdown files with YAML frontmatter, extracting structure and content
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root, Heading, Code, Link as MdastLink } from 'mdast';
import type {
  ParsedSkill,
  SkillFrontmatter,
  TocEntry,
  CodeBlock,
  Link,
  SkillManifest,
} from './types.js';

/**
 * Check if a link href is internal (references local skill files)
 */
function isInternalHref(href: string): boolean {
  return (
    href.startsWith('references/') ||
    href.startsWith('scripts/') ||
    href.startsWith('assets/') ||
    href.startsWith('./references/') ||
    href.startsWith('./scripts/') ||
    href.startsWith('./assets/')
  );
}

/**
 * Parse a SKILL.md file content and extract structured data
 * @param content - Raw markdown content with YAML frontmatter
 * @returns Parsed skill structure
 */
export function parseSkillMd(content: string): ParsedSkill {
  // Parse YAML frontmatter using gray-matter
  const { data, content: body } = matter(content);

  const frontmatter: SkillFrontmatter = {
    name: data.name ?? '',
    description: data.description ?? '',
    license: data.license,
    version: data.version,
    author: data.author,
    metadata: data.metadata,
  };

  // Parse markdown body using unified + remark-parse
  const tree = unified().use(remarkParse).parse(body) as Root;

  const slugger = new GithubSlugger();
  const toc: TocEntry[] = [];
  const codeBlocks: CodeBlock[] = [];
  const links: Link[] = [];

  // Walk the AST to extract headings, code blocks, and links
  function visit(node: Root | Root['children'][number], lineOffset: number = 0): void {
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child, lineOffset);
      }
    }

    // Extract headings for ToC
    if (node.type === 'heading') {
      const heading = node as Heading;
      const text = toString(heading);
      const line = heading.position?.start.line ?? 0;
      toc.push({
        level: heading.depth,
        text,
        slug: slugger.slug(text),
        line,
      });
    }

    // Extract code blocks
    if (node.type === 'code') {
      const code = node as Code;
      const line = code.position?.start.line ?? 0;
      codeBlocks.push({
        lang: code.lang ?? null,
        line,
        content: code.value,
      });
    }

    // Extract links
    if (node.type === 'link') {
      const link = node as MdastLink;
      const text = toString(link);
      links.push({
        text,
        href: link.url,
        isInternal: isInternalHref(link.url),
      });
    }
  }

  visit(tree);

  return {
    frontmatter,
    body,
    toc,
    codeBlocks,
    links,
    files: {
      scripts: [],
      references: [],
      assets: [],
    },
  };
}

/**
 * Read and parse a SKILL.md file from disk
 * @param filePath - Absolute path to the SKILL.md file
 * @returns Promise resolving to parsed skill structure
 */
export async function parseSkillFile(filePath: string): Promise<ParsedSkill> {
  const content = await readFile(filePath, 'utf-8');
  return parseSkillMd(content);
}

/**
 * List files in skill subdirectories (scripts/, references/, assets/)
 * @param skillDir - Absolute path to the skill directory
 * @returns Promise resolving to categorized file lists
 */
export async function listSkillFiles(
  skillDir: string
): Promise<{ scripts: string[]; references: string[]; assets: string[] }> {
  const result = {
    scripts: [] as string[],
    references: [] as string[],
    assets: [] as string[],
  };

  const subdirs = ['scripts', 'references', 'assets'] as const;

  for (const subdir of subdirs) {
    const dirPath = join(skillDir, subdir);
    try {
      const dirStat = await stat(dirPath);
      if (dirStat.isDirectory()) {
        const files = await readdir(dirPath);
        result[subdir] = files.filter((f) => !f.startsWith('.'));
      }
    } catch {
      // Directory doesn't exist, leave empty array
    }
  }

  return result;
}

/**
 * Convert a ParsedSkill to a SkillManifest (JSON-serializable)
 * @param parsed - Parsed skill data
 * @returns Skill manifest with truncated code block previews
 */
export function createManifest(parsed: ParsedSkill): SkillManifest {
  return {
    name: parsed.frontmatter.name,
    description: parsed.frontmatter.description,
    license: parsed.frontmatter.license,
    version: parsed.frontmatter.version,
    author: parsed.frontmatter.author,
    toc: parsed.toc,
    codeBlocks: parsed.codeBlocks.map((block) => ({
      lang: block.lang,
      line: block.line,
      preview: block.content.slice(0, 100),
    })),
    links: parsed.links,
    files: parsed.files,
  };
}

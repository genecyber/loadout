/**
 * Shared TypeScript types for the MCP Skills Server
 */

/**
 * Parsed YAML frontmatter from SKILL.md files
 */
export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  version?: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Table of contents entry representing a markdown heading
 */
export interface TocEntry {
  /** Heading level (1-6 for h1-h6) */
  level: number;
  /** Heading text content */
  text: string;
  /** URL-friendly slug derived from text */
  slug: string;
  /** Line number in the source file */
  line: number;
}

/**
 * Extracted code block from markdown
 */
export interface CodeBlock {
  /** Language identifier (e.g., 'typescript', 'python') or null if not specified */
  lang: string | null;
  /** Line number where the code block starts */
  line: number;
  /** Full content of the code block */
  content: string;
}

/**
 * Extracted link from markdown
 */
export interface Link {
  /** Link display text */
  text: string;
  /** Link target URL or path */
  href: string;
  /** True if href starts with references/, scripts/, or assets/ */
  isInternal: boolean;
}

/**
 * Full parsed representation of a SKILL.md file
 */
export interface ParsedSkill {
  /** Parsed YAML frontmatter */
  frontmatter: SkillFrontmatter;
  /** Raw markdown content after frontmatter */
  body: string;
  /** Table of contents extracted from headings */
  toc: TocEntry[];
  /** All code blocks in the document */
  codeBlocks: CodeBlock[];
  /** All links in the document */
  links: Link[];
  /** Categorized file references */
  files: {
    scripts: string[];
    references: string[];
    assets: string[];
  };
}

/**
 * Runtime skill representation used during discovery and serving
 */
export interface DiscoveredSkill {
  /** Skill name from frontmatter */
  name: string;
  /** Skill description from frontmatter */
  description: string;
  /** Absolute path to the skill directory */
  path: string;
  /** Absolute path to the SKILL.md file */
  skillMdPath: string;
  /** Parsed skill data, or null if not yet parsed */
  parsed: ParsedSkill | null;
}

/**
 * JSON-serializable manifest for MCP resources
 */
export interface SkillManifest {
  /** Skill name */
  name: string;
  /** Skill description */
  description: string;
  /** License identifier */
  license?: string;
  /** Semantic version */
  version?: string;
  /** Author name or identifier */
  author?: string;
  /** Table of contents */
  toc: TocEntry[];
  /** Code blocks with preview (first 100 characters) */
  codeBlocks: Array<{
    lang: string | null;
    line: number;
    /** First 100 characters of the code block content */
    preview: string;
  }>;
  /** All links in the skill */
  links: Link[];
  /** Categorized file references */
  files: {
    scripts: string[];
    references: string[];
    assets: string[];
  };
}

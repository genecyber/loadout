/**
 * MCP Resource handlers for loadout:// URIs
 * Exposes skill content via various URI patterns
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Resource, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import type { SkillDiscovery } from './discovery.js';
import type { SkillManifest } from './types.js';
import { createManifest } from './parser.js';
import { HELP_DOCS } from './tools.js';

/**
 * Parsed skill URI components
 */
export interface ParsedSkillUri {
  /** Skill name */
  name: string;
  /** Resource type */
  type: 'content' | 'manifest' | 'section' | 'code' | 'references' | 'scripts' | 'assets';
  /** Additional parameter (section slug, code index, or file name) */
  param?: string;
}

/**
 * Parse a loadout:// URI and extract components
 * @param uri - The loadout:// URI to parse
 * @returns Parsed URI components or null if invalid
 */
export function parseSkillUri(uri: string): ParsedSkillUri | null {
  // Validate scheme
  if (!uri.startsWith('loadout://')) {
    return null;
  }

  const path = uri.slice('loadout://'.length);
  const segments = path.split('/').filter((s) => s.length > 0);

  if (segments.length === 0) {
    return null;
  }

  const name = segments[0];

  // loadout://{name} - Full content
  if (segments.length === 1) {
    return { name, type: 'content' };
  }

  const resourceType = segments[1];

  // loadout://{name}/manifest
  if (resourceType === 'manifest' && segments.length === 2) {
    return { name, type: 'manifest' };
  }

  // loadout://{name}/section/{slug}
  if (resourceType === 'section' && segments.length === 3) {
    return { name, type: 'section', param: segments[2] };
  }

  // loadout://{name}/code/{index}
  if (resourceType === 'code' && segments.length === 3) {
    return { name, type: 'code', param: segments[2] };
  }

  // loadout://{name}/references/{file}
  if (resourceType === 'references' && segments.length >= 3) {
    // Join remaining segments to support nested paths
    return { name, type: 'references', param: segments.slice(2).join('/') };
  }

  // loadout://{name}/scripts/{file}
  if (resourceType === 'scripts' && segments.length >= 3) {
    return { name, type: 'scripts', param: segments.slice(2).join('/') };
  }

  // loadout://{name}/assets/{file}
  if (resourceType === 'assets' && segments.length >= 3) {
    return { name, type: 'assets', param: segments.slice(2).join('/') };
  }

  return null;
}

/**
 * Extract section content from markdown body by slug
 * Finds the header matching the slug and returns everything until the next header of same or higher level
 * @param body - Markdown body content
 * @param slug - Section slug to find
 * @param toc - Table of contents entries
 * @returns Section content or null if not found
 */
function extractSectionContent(
  body: string,
  slug: string,
  toc: Array<{ level: number; slug: string; line: number }>
): string | null {
  // Find the ToC entry matching the slug
  const entry = toc.find((t) => t.slug === slug);
  if (!entry) {
    return null;
  }

  const lines = body.split('\n');
  const startLine = entry.line - 1; // Convert to 0-based index

  if (startLine < 0 || startLine >= lines.length) {
    return null;
  }

  // Find the end of this section (next header of same or higher level)
  let endLine = lines.length;
  for (const otherEntry of toc) {
    if (otherEntry.line > entry.line && otherEntry.level <= entry.level) {
      endLine = otherEntry.line - 1; // Line before the next header
      break;
    }
  }

  // Extract the section content
  const sectionLines = lines.slice(startLine, endLine);
  return sectionLines.join('\n').trim();
}

/**
 * MCP Resource handlers interface
 */
export interface ResourceHandlers {
  /** List all available skill resources */
  listResources: () => Promise<Resource[]>;
  /** Read a specific resource by URI */
  readResource: (uri: string) => Promise<ReadResourceResult>;
}

/**
 * Create MCP resource handlers for skill discovery
 * @param discovery - The SkillDiscovery instance
 * @returns Resource handlers for listResources and readResource
 */
export function getResourceHandlers(discovery: SkillDiscovery): ResourceHandlers {
  /**
   * List all available skill resources
   */
  async function listResources(): Promise<Resource[]> {
    const skills = discovery.getAllSkills();
    const resources: Resource[] = [];

    // Add help resource
    resources.push({
      uri: 'loadout://help',
      name: 'Loadout Help',
      description: 'Documentation for Loadout',
      mimeType: 'text/markdown',
    });

    for (const skill of skills) {
      const name = skill.name;

      // Main skill content resource
      resources.push({
        uri: `loadout://${name}`,
        name: `${name} - Full Content`,
        description: skill.description,
        mimeType: 'text/markdown',
      });

      // Manifest resource
      resources.push({
        uri: `loadout://${name}/manifest`,
        name: `${name} - Manifest`,
        description: `JSON manifest for ${name} skill`,
        mimeType: 'application/json',
      });

      // Section resources (if parsed)
      if (skill.parsed) {
        for (const tocEntry of skill.parsed.toc) {
          resources.push({
            uri: `loadout://${name}/section/${tocEntry.slug}`,
            name: `${name} - Section: ${tocEntry.text}`,
            description: `Section "${tocEntry.text}" from ${name} skill`,
            mimeType: 'text/markdown',
          });
        }

        // Code block resources
        for (let i = 0; i < skill.parsed.codeBlocks.length; i++) {
          const block = skill.parsed.codeBlocks[i];
          const langInfo = block.lang ? ` (${block.lang})` : '';
          resources.push({
            uri: `loadout://${name}/code/${i}`,
            name: `${name} - Code Block ${i}${langInfo}`,
            description: `Code block ${i} from ${name} skill at line ${block.line}`,
            mimeType: block.lang ? `text/x-${block.lang}` : 'text/plain',
          });
        }

        // Reference files
        for (const file of skill.parsed.files.references) {
          resources.push({
            uri: `loadout://${name}/references/${file}`,
            name: `${name} - Reference: ${file}`,
            description: `Reference file "${file}" from ${name} skill`,
            mimeType: guessMimeType(file),
          });
        }

        // Script files
        for (const file of skill.parsed.files.scripts) {
          resources.push({
            uri: `loadout://${name}/scripts/${file}`,
            name: `${name} - Script: ${file}`,
            description: `Script file "${file}" from ${name} skill`,
            mimeType: guessMimeType(file),
          });
        }

        // Asset files
        for (const file of skill.parsed.files.assets) {
          resources.push({
            uri: `loadout://${name}/assets/${file}`,
            name: `${name} - Asset: ${file}`,
            description: `Asset file "${file}" from ${name} skill`,
            mimeType: guessMimeType(file),
          });
        }
      }
    }

    return resources;
  }

  /**
   * Read a specific resource by URI
   */
  async function readResource(uri: string): Promise<ReadResourceResult> {
    // Handle help resource
    if (uri === 'loadout://help') {
      const helpContent = [
        HELP_DOCS.overview,
        '',
        HELP_DOCS.tools,
        '',
        HELP_DOCS.resources,
        '',
        HELP_DOCS.prompts,
        '',
        HELP_DOCS.discovery,
        '',
        HELP_DOCS.bundling,
      ].join('\n');

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: helpContent,
          },
        ],
      };
    }

    const parsed = parseSkillUri(uri);

    if (!parsed) {
      throw new Error(`Invalid skill URI: ${uri}`);
    }

    const skill = discovery.getSkill(parsed.name);

    if (!skill) {
      throw new Error(`Skill not found: ${parsed.name}`);
    }

    switch (parsed.type) {
      case 'content': {
        // Return full SKILL.md content
        const content = await readFile(skill.skillMdPath, 'utf-8');
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: content,
            },
          ],
        };
      }

      case 'manifest': {
        // Return JSON manifest
        if (!skill.parsed) {
          throw new Error(`Skill not parsed: ${parsed.name}`);
        }
        const manifest: SkillManifest = createManifest(skill.parsed);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(manifest, null, 2),
            },
          ],
        };
      }

      case 'section': {
        // Return specific section content
        if (!skill.parsed) {
          throw new Error(`Skill not parsed: ${parsed.name}`);
        }
        if (!parsed.param) {
          throw new Error(`Section slug required`);
        }
        const sectionContent = extractSectionContent(
          skill.parsed.body,
          parsed.param,
          skill.parsed.toc
        );
        if (sectionContent === null) {
          throw new Error(`Section not found: ${parsed.param}`);
        }
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: sectionContent,
            },
          ],
        };
      }

      case 'code': {
        // Return specific code block
        if (!skill.parsed) {
          throw new Error(`Skill not parsed: ${parsed.name}`);
        }
        if (!parsed.param) {
          throw new Error(`Code block index required`);
        }
        const index = parseInt(parsed.param, 10);
        if (isNaN(index) || index < 0 || index >= skill.parsed.codeBlocks.length) {
          throw new Error(
            `Invalid code block index: ${parsed.param}. Valid range: 0-${skill.parsed.codeBlocks.length - 1}`
          );
        }
        const codeBlock = skill.parsed.codeBlocks[index];
        return {
          contents: [
            {
              uri,
              mimeType: codeBlock.lang ? `text/x-${codeBlock.lang}` : 'text/plain',
              text: codeBlock.content,
            },
          ],
        };
      }

      case 'references':
      case 'scripts':
      case 'assets': {
        // Return file content from subdirectory
        if (!parsed.param) {
          throw new Error(`File name required`);
        }
        const filePath = join(skill.path, parsed.type, parsed.param);
        try {
          const content = await readFile(filePath, 'utf-8');
          return {
            contents: [
              {
                uri,
                mimeType: guessMimeType(parsed.param),
                text: content,
              },
            ],
          };
        } catch (error) {
          throw new Error(`File not found: ${parsed.type}/${parsed.param}`);
        }
      }

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = parsed.type;
        throw new Error(`Unknown resource type: ${_exhaustive}`);
      }
    }
  }

  return {
    listResources,
    readResource,
  };
}

/**
 * Guess MIME type from file extension
 * @param filename - File name with extension
 * @returns MIME type string
 */
function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  const mimeTypes: Record<string, string> = {
    // Text
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',

    // Code
    js: 'text/javascript',
    mjs: 'text/javascript',
    ts: 'text/typescript',
    mts: 'text/typescript',
    jsx: 'text/jsx',
    tsx: 'text/tsx',
    json: 'application/json',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    py: 'text/x-python',
    rb: 'text/x-ruby',
    go: 'text/x-go',
    rs: 'text/x-rust',
    java: 'text/x-java',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    h: 'text/x-c',
    hpp: 'text/x-c++',
    sh: 'text/x-shellscript',
    bash: 'text/x-shellscript',
    zsh: 'text/x-shellscript',
    sql: 'text/x-sql',

    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',

    // Documents
    pdf: 'application/pdf',
    csv: 'text/csv',

    // Other
    wasm: 'application/wasm',
  };

  return mimeTypes[ext] ?? 'application/octet-stream';
}

/**
 * MCP tool handlers for skill operations
 * Provides tools for listing, searching, and executing skills
 */

import { spawn } from 'node:child_process';
import { join, extname, basename, dirname, normalize, resolve } from 'node:path';
import { access, mkdir, cp, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { SkillDiscovery } from './discovery.js';
import { createManifest } from './parser.js';
import type { SkillManifest } from './types.js';

// Get the directory where this module is located (for finding bundled skills)
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Agent target directories for skill installation
 */
const AGENT_SKILL_DIRS: Record<string, string> = {
  claude: '.claude/skills',
  cursor: '.cursor/skills',
  codex: '.codex/skills',
  agents: '.agents/skills',
};

/**
 * Allowed script file extensions for safety
 */
const ALLOWED_EXTENSIONS = new Set(['.sh', '.js', '.ts', '.py']);

/**
 * Default script execution timeout in milliseconds (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Input schemas for MCP tools using Zod
 */
export const ListSkillsInputSchema = z.object({});

export const SearchSkillsInputSchema = z.object({
  query: z.string().describe('Search query to match against skill names and descriptions'),
});

export const GetSkillManifestInputSchema = z.object({
  name: z.string().describe('Name of the skill to get manifest for'),
});

export const RunSkillScriptInputSchema = z.object({
  skill: z.string().describe('Name of the skill containing the script'),
  script: z.string().describe('Name of the script file in the skill\'s scripts/ directory'),
  args: z.array(z.string()).optional().describe('Optional arguments to pass to the script'),
});

export const InstallSkillInputSchema = z.object({
  skill: z.string().describe('Name of the bundled skill to install'),
  agent: z.enum(['claude', 'cursor', 'codex', 'agents']).optional()
    .describe('Target agent (claude, cursor, codex, agents). Defaults to claude.'),
  global: z.boolean().optional()
    .describe('Install to user home directory instead of project directory. Defaults to false.'),
});

export const HelpInputSchema = z.object({
  topic: z.enum(['tools', 'resources', 'prompts', 'discovery', 'bundling', 'all']).optional()
    .describe('Help topic. Defaults to all.'),
});

/**
 * Help documentation for Loadout
 */
export const HELP_DOCS = {
  overview: `# Loadout

Load out your AI agent with skills. An MCP server that bridges the Agent Skills spec to any MCP-compatible agent.`,

  tools: `## Tools

### list_skills
List all discovered skills.
Returns: [{ name, description, path }]

### search_skills
Search skills by name or description.
Input: { query: string }

### get_skill_manifest
Get the full parsed structure of a skill (toc, codeBlocks, links, files).
Input: { name: string }

### run_skill_script
Execute a script from a skill's scripts/ directory.
Input: { skill: string, script: string, args?: string[] }
Note: Requires --allow-scripts flag. Only .sh, .js, .ts, .py allowed.

### install_skill
Install a bundled skill to an agent's skills directory.
Input: { skill: string, agent?: "claude"|"cursor"|"codex"|"agents", global?: boolean }

### help
Show this help documentation.
Input: { topic?: "tools"|"resources"|"prompts"|"discovery"|"bundling"|"all" }`,

  resources: `## Resources (loadout:// URIs)

| URI Pattern | Description |
|-------------|-------------|
| loadout://help | Loadout documentation |
| loadout://{name} | Full SKILL.md content |
| loadout://{name}/manifest | JSON manifest |
| loadout://{name}/section/{slug} | Section by header slug |
| loadout://{name}/code/{index} | Code block by index |
| loadout://{name}/references/{file} | Reference file |
| loadout://{name}/scripts/{file} | Script file |
| loadout://{name}/assets/{file} | Asset file |`,

  prompts: `## Prompts

| Prompt | Arguments | Description |
|--------|-----------|-------------|
| audit-skill | name | Security audit checklist |
| use-skill | name | How to activate and apply a skill |
| compare-skills | skill1, skill2 | Compare two skills |
| create-skill | name, description | Guide for creating new skills |
| skill-summary | name | Generate documentation summary |`,

  discovery: `## Skill Discovery

Loadout monitors these directories (in order):

### Bundled Skills (for published packages)
./bundled-skills/

### Project Local
./skills/
./.claude/skills/
./.cursor/skills/
./.codex/skills/
./.agents/skills/

### User Home (globally installed)
~/.claude/skills/
~/.cursor/skills/
~/.codex/skills/
~/.agents/skills/

### Custom Paths
Additional paths via --skills-dir <path>

Skills are directories containing a SKILL.md file with YAML frontmatter:
\`\`\`
---
name: my-skill
description: What this skill does
---
# My Skill
Instructions...
\`\`\``,

  bundling: `## Creating Skill Bundles

Bundle skills into publishable loadouts:

### 1. Create bundle.config.json
\`\`\`json
{
  "bundles": {
    "web3-loadout": {
      "name": "web3-loadout",
      "description": "Loadout with Web3 skills",
      "version": "1.0.0",
      "skills": ["path/to/skill1", "path/to/skill2"]
    }
  }
}
\`\`\`

### 2. Build
npm run bundle                   # All bundles
npm run bundle -- web3-loadout   # Specific bundle

### 3. Publish
cd bundles/web3-loadout && npm publish

Bundled skills are auto-discovered and can be installed via install_skill tool.`,
};

/**
 * Output types for tools
 */
export interface SkillListItem {
  name: string;
  description: string;
  path: string;
}

export interface ScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * MCP tool definitions for registration
 */
export const toolDefinitions = [
  {
    name: 'list_skills',
    description: 'List all discovered skills from configured skill directories',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'search_skills',
    description: 'Search for skills by name or description',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against skill names and descriptions',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_skill_manifest',
    description: 'Get the full manifest (parsed structure) for a specific skill',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name of the skill to get manifest for',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'run_skill_script',
    description: 'Execute a script from a skill\'s scripts/ directory (only .sh, .js, .ts, .py files allowed)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        skill: {
          type: 'string',
          description: 'Name of the skill containing the script',
        },
        script: {
          type: 'string',
          description: 'Name of the script file in the skill\'s scripts/ directory',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional arguments to pass to the script',
        },
      },
      required: ['skill', 'script'],
    },
  },
  {
    name: 'install_skill',
    description: 'Install a bundled skill to an agent\'s skills directory',
    inputSchema: {
      type: 'object' as const,
      properties: {
        skill: {
          type: 'string',
          description: 'Name of the bundled skill to install',
        },
        agent: {
          type: 'string',
          enum: ['claude', 'cursor', 'codex', 'agents'],
          description: 'Target agent (claude, cursor, codex, agents). Defaults to claude.',
        },
        global: {
          type: 'boolean',
          description: 'Install to user home directory instead of project directory. Defaults to false.',
        },
      },
      required: ['skill'],
    },
  },
  {
    name: 'help',
    description: 'Get help documentation for the skills-mcp server',
    inputSchema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string',
          enum: ['tools', 'resources', 'prompts', 'discovery', 'bundling', 'all'],
          description: 'Help topic. Defaults to all.',
        },
      },
      required: [] as string[],
    },
  },
];

/**
 * Options for tool handlers
 */
export interface ToolHandlerOptions {
  /** Whether to allow script execution (default: false) */
  allowScripts?: boolean;
  /** Script execution timeout in milliseconds (default: 30000) */
  scriptTimeout?: number;
}

/**
 * Tool handler result type
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Create a successful tool result
 */
function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Create an error tool result
 */
function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/**
 * Validate that a script path is safe to execute
 * - Must have an allowed extension
 * - Must be within the skill's scripts directory (no path traversal)
 */
function validateScriptPath(scriptName: string, skillPath: string): { valid: boolean; error?: string; fullPath?: string } {
  // Check for path traversal attempts
  const normalizedScript = normalize(scriptName);
  if (normalizedScript.includes('..') || normalizedScript.startsWith('/') || normalizedScript.includes('\\')) {
    return { valid: false, error: 'Invalid script path: path traversal not allowed' };
  }

  // Check extension
  const ext = extname(scriptName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Invalid script extension: ${ext}. Allowed extensions: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
    };
  }

  // Build full path and verify it's within scripts directory
  const scriptsDir = join(skillPath, 'scripts');
  const fullPath = resolve(scriptsDir, basename(scriptName));

  // Ensure the resolved path is still within the scripts directory
  if (!fullPath.startsWith(scriptsDir)) {
    return { valid: false, error: 'Invalid script path: must be within scripts directory' };
  }

  return { valid: true, fullPath };
}

/**
 * Get the appropriate command to run a script based on its extension
 */
function getScriptCommand(scriptPath: string): { command: string; args: string[] } {
  const ext = extname(scriptPath).toLowerCase();

  switch (ext) {
    case '.sh':
      return { command: 'bash', args: [scriptPath] };
    case '.js':
      return { command: 'node', args: [scriptPath] };
    case '.ts':
      return { command: 'npx', args: ['tsx', scriptPath] };
    case '.py':
      return { command: 'python3', args: [scriptPath] };
    default:
      // Should not reach here due to validation, but default to bash
      return { command: 'bash', args: [scriptPath] };
  }
}

/**
 * Execute a script with timeout and capture output
 */
async function executeScript(
  scriptPath: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<ScriptResult> {
  return new Promise((resolve) => {
    const { command, args: cmdArgs } = getScriptCommand(scriptPath);
    const fullArgs = [...cmdArgs, ...args];

    let stdout = '';
    let stderr = '';
    let killed = false;

    const proc = spawn(command, fullArgs, {
      cwd,
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Run in a detached process group for clean timeout handling
      detached: false,
    });

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (killed) {
        resolve({
          stdout,
          stderr: stderr + '\n[Script execution timed out]',
          exitCode: null,
        });
      } else {
        resolve({
          stdout,
          stderr,
          exitCode: code,
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr: stderr + '\n[Script execution error: ' + err.message + ']',
        exitCode: null,
      });
    });
  });
}

/**
 * Get MCP tool handlers for skill operations
 * @param discovery - SkillDiscovery instance for accessing skills
 * @param options - Tool handler options
 * @returns Object mapping tool names to handler functions
 */
export function getToolHandlers(
  discovery: SkillDiscovery,
  options: ToolHandlerOptions = {}
): Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> {
  const { allowScripts = false, scriptTimeout = DEFAULT_TIMEOUT_MS } = options;

  return {
    /**
     * List all discovered skills
     */
    async list_skills(_args: Record<string, unknown>): Promise<ToolResult> {
      const skills = discovery.getAllSkills();
      const result: SkillListItem[] = skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        path: skill.path,
      }));
      return successResult(result);
    },

    /**
     * Search skills by name or description
     */
    async search_skills(args: Record<string, unknown>): Promise<ToolResult> {
      const parsed = SearchSkillsInputSchema.safeParse(args);
      if (!parsed.success) {
        return errorResult(`Invalid input: ${parsed.error.message}`);
      }

      const { query } = parsed.data;
      const skills = discovery.searchSkills(query);
      const result: SkillListItem[] = skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        path: skill.path,
      }));
      return successResult(result);
    },

    /**
     * Get full manifest for a specific skill
     */
    async get_skill_manifest(args: Record<string, unknown>): Promise<ToolResult> {
      const parsed = GetSkillManifestInputSchema.safeParse(args);
      if (!parsed.success) {
        return errorResult(`Invalid input: ${parsed.error.message}`);
      }

      const { name } = parsed.data;
      const skill = discovery.getSkill(name);

      if (!skill) {
        return errorResult(`Skill not found: ${name}`);
      }

      if (!skill.parsed) {
        return errorResult(`Skill "${name}" has not been parsed`);
      }

      const manifest: SkillManifest = createManifest(skill.parsed);
      return successResult(manifest);
    },

    /**
     * Execute a script from a skill's scripts directory
     */
    async run_skill_script(args: Record<string, unknown>): Promise<ToolResult> {
      // Check if scripts are allowed
      if (!allowScripts) {
        return errorResult(
          'Script execution is disabled. Enable with --allow-scripts flag.'
        );
      }

      const parsed = RunSkillScriptInputSchema.safeParse(args);
      if (!parsed.success) {
        return errorResult(`Invalid input: ${parsed.error.message}`);
      }

      const { skill: skillName, script, args: scriptArgs = [] } = parsed.data;

      // Find the skill
      const skill = discovery.getSkill(skillName);
      if (!skill) {
        return errorResult(`Skill not found: ${skillName}`);
      }

      // Validate and build script path
      const validation = validateScriptPath(script, skill.path);
      if (!validation.valid) {
        return errorResult(validation.error!);
      }

      const scriptPath = validation.fullPath!;

      // Verify script exists
      try {
        await access(scriptPath);
      } catch {
        return errorResult(`Script not found: ${script}`);
      }

      // Execute the script
      const result = await executeScript(
        scriptPath,
        scriptArgs,
        skill.path,
        scriptTimeout
      );

      return successResult({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    },

    /**
     * Install a bundled skill to an agent's skills directory
     */
    async install_skill(args: Record<string, unknown>): Promise<ToolResult> {
      const parsed = InstallSkillInputSchema.safeParse(args);
      if (!parsed.success) {
        return errorResult(`Invalid input: ${parsed.error.message}`);
      }

      const { skill: skillName, agent = 'claude', global: isGlobal = false } = parsed.data;

      // Find the bundled skill
      const bundledSkillsDir = join(__dirname, '..', 'bundled-skills');
      const skillSourcePath = join(bundledSkillsDir, skillName);

      // Check if bundled skill exists
      try {
        const skillStat = await stat(skillSourcePath);
        if (!skillStat.isDirectory()) {
          return errorResult(`Bundled skill not found: ${skillName}`);
        }
      } catch {
        // List available bundled skills
        let availableSkills: string[] = [];
        try {
          const entries = await readdir(bundledSkillsDir, { withFileTypes: true });
          availableSkills = entries
            .filter(e => e.isDirectory())
            .map(e => e.name);
        } catch {
          // bundled-skills directory doesn't exist
        }

        if (availableSkills.length === 0) {
          return errorResult(`No bundled skills available. This tool only installs skills bundled with the package.`);
        }

        return errorResult(
          `Bundled skill not found: ${skillName}\nAvailable bundled skills: ${availableSkills.join(', ')}`
        );
      }

      // Determine target directory
      const agentDir = AGENT_SKILL_DIRS[agent];
      if (!agentDir) {
        return errorResult(`Unknown agent: ${agent}. Valid agents: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}`);
      }

      const home = process.env.HOME || process.env.USERPROFILE || '';
      const baseDir = isGlobal ? home : process.cwd();

      if (isGlobal && !home) {
        return errorResult('Cannot determine home directory for global install');
      }

      const targetDir = join(baseDir, agentDir, skillName);

      // Create target directory and copy skill
      try {
        await mkdir(dirname(targetDir), { recursive: true });
        await cp(skillSourcePath, targetDir, { recursive: true });

        return successResult({
          message: `Installed ${skillName} to ${agent}`,
          path: targetDir,
          scope: isGlobal ? 'global' : 'project',
        });
      } catch (err) {
        return errorResult(`Failed to install skill: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },

    /**
     * Get help documentation
     */
    async help(args: Record<string, unknown>): Promise<ToolResult> {
      const parsed = HelpInputSchema.safeParse(args);
      if (!parsed.success) {
        return errorResult(`Invalid input: ${parsed.error.message}`);
      }

      const { topic = 'all' } = parsed.data;

      let content: string;

      if (topic === 'all') {
        content = [
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
      } else {
        content = HELP_DOCS[topic] || `Unknown topic: ${topic}`;
      }

      return {
        content: [{ type: 'text', text: content }],
      };
    },
  };
}

/**
 * Get tool definitions that should be registered with the MCP server
 * @param options - Tool handler options (used to conditionally include/exclude tools)
 * @returns Array of tool definitions
 */
export function getToolDefinitions(options: ToolHandlerOptions = {}): typeof toolDefinitions {
  // Return all tool definitions - the handlers will check allowScripts at runtime
  return toolDefinitions;
}

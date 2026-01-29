/**
 * MCP prompts for guiding agents in working with skills
 * Provides structured prompts for auditing, using, comparing, creating, and documenting skills
 */

import type {
  GetPromptResult,
  Prompt,
  PromptArgument,
  PromptMessage,
} from '@modelcontextprotocol/sdk/types.js';
import type { SkillDiscovery } from './discovery.js';
import type { DiscoveredSkill, SkillManifest } from './types.js';
import { createManifest } from './parser.js';

/**
 * Prompt handler function type
 */
type PromptHandler = (
  args: Record<string, string | undefined>
) => Promise<GetPromptResult> | GetPromptResult;

/**
 * Prompt definition with handler
 */
interface PromptDefinition {
  prompt: Prompt;
  handler: PromptHandler;
}

/**
 * Helper to create a text message
 */
function textMessage(role: 'user' | 'assistant', text: string): PromptMessage {
  return {
    role,
    content: {
      type: 'text',
      text,
    },
  };
}

/**
 * Helper to get skill or throw error
 */
function requireSkill(
  discovery: SkillDiscovery,
  name: string | undefined,
  argName: string
): DiscoveredSkill {
  if (!name) {
    throw new Error(`Missing required argument: ${argName}`);
  }
  const skill = discovery.getSkill(name);
  if (!skill) {
    throw new Error(`Skill not found: ${name}`);
  }
  return skill;
}

/**
 * Helper to get skill manifest
 */
function getManifest(skill: DiscoveredSkill): SkillManifest | null {
  if (!skill.parsed) {
    return null;
  }
  return createManifest(skill.parsed);
}

/**
 * Create the audit-skill prompt definition
 */
function createAuditSkillPrompt(discovery: SkillDiscovery): PromptDefinition {
  return {
    prompt: {
      name: 'audit-skill',
      description:
        'Security audit guide for analyzing a skill for potential security issues',
      arguments: [
        {
          name: 'name',
          description: 'Name of the skill to audit',
          required: true,
        } as PromptArgument,
      ],
    },
    handler: (args) => {
      const skill = requireSkill(discovery, args.name, 'name');
      const manifest = getManifest(skill);

      const scriptsInfo =
        manifest && manifest.files.scripts.length > 0
          ? `\n\nScripts to review:\n${manifest.files.scripts.map((s) => `- ${s}`).join('\n')}`
          : '\n\nNo scripts found in this skill.';

      const codeBlocksInfo =
        manifest && manifest.codeBlocks.length > 0
          ? `\n\nCode blocks in SKILL.md (${manifest.codeBlocks.length} total):\n${manifest.codeBlocks.map((cb) => `- Line ${cb.line}: ${cb.lang || 'unknown'} (preview: ${cb.preview.slice(0, 50)}...)`).join('\n')}`
          : '';

      const linksInfo =
        manifest && manifest.links.length > 0
          ? `\n\nLinks found:\n${manifest.links.map((l) => `- ${l.text}: ${l.href} (${l.isInternal ? 'internal' : 'external'})`).join('\n')}`
          : '';

      const promptText = `# Security Audit Guide for Skill: ${skill.name}

You are performing a security audit of the "${skill.name}" skill.

## Skill Information
- **Name**: ${skill.name}
- **Description**: ${skill.description}
- **Path**: ${skill.path}
- **SKILL.md Path**: ${skill.skillMdPath}
${manifest?.author ? `- **Author**: ${manifest.author}` : ''}
${manifest?.version ? `- **Version**: ${manifest.version}` : ''}
${manifest?.license ? `- **License**: ${manifest.license}` : ''}
${scriptsInfo}${codeBlocksInfo}${linksInfo}

## Audit Checklist

### 1. Script Analysis
For each script in the scripts/ directory:
- [ ] Check for shell injection vulnerabilities (unescaped variables, eval usage)
- [ ] Identify any network calls (curl, wget, fetch, http requests)
- [ ] Look for file system operations (read, write, delete, modify)
- [ ] Check for execution of external commands
- [ ] Verify proper input validation and sanitization

### 2. Frontmatter Verification
- [ ] Verify the name matches the skill's actual purpose
- [ ] Check if description accurately reflects capabilities
- [ ] Validate author/license claims if present
- [ ] Compare declared capabilities with actual code behavior

### 3. Code Block Analysis
For each code block in the SKILL.md:
- [ ] Identify the language and purpose
- [ ] Check for any dangerous patterns
- [ ] Verify examples don't contain malicious code

### 4. Trust Assessment
Based on the skill source:
- [ ] Is this from a known/trusted author?
- [ ] Is the code well-documented and transparent?
- [ ] Are there any obfuscated sections?
- [ ] Does the skill request excessive permissions?

### 5. Suspicious Patterns to Flag
Watch for:
- Encoded or obfuscated strings (base64, hex)
- Environment variable access (especially secrets/tokens)
- Network communication to unknown hosts
- File operations outside the skill directory
- Dynamic code execution (eval, exec, Function constructor)
- Unusual file permissions changes
- Cryptographic operations (could indicate ransomware)

## Instructions

1. Read the SKILL.md file at: ${skill.skillMdPath}
2. Read each script file in the scripts/ directory
3. Analyze according to the checklist above
4. Provide a security assessment with:
   - Risk level (LOW, MEDIUM, HIGH, CRITICAL)
   - Specific findings with file locations
   - Recommendations for remediation
   - Whether the skill is safe to use`;

      return {
        description: `Security audit guide for skill: ${skill.name}`,
        messages: [textMessage('user', promptText)],
      };
    },
  };
}

/**
 * Create the use-skill prompt definition
 */
function createUseSkillPrompt(discovery: SkillDiscovery): PromptDefinition {
  return {
    prompt: {
      name: 'use-skill',
      description: 'Activation guide for loading and applying a skill',
      arguments: [
        {
          name: 'name',
          description: 'Name of the skill to use',
          required: true,
        } as PromptArgument,
      ],
    },
    handler: (args) => {
      const skill = requireSkill(discovery, args.name, 'name');
      const manifest = getManifest(skill);

      const tocInfo =
        manifest && manifest.toc.length > 0
          ? `\n\n## Table of Contents\n${manifest.toc.map((t) => `${'  '.repeat(t.level - 1)}- ${t.text}`).join('\n')}`
          : '';

      const referencesInfo =
        manifest && manifest.files.references.length > 0
          ? `\n\n## Available References\n${manifest.files.references.map((r) => `- references/${r}`).join('\n')}`
          : '';

      const scriptsInfo =
        manifest && manifest.files.scripts.length > 0
          ? `\n\n## Available Scripts\n${manifest.files.scripts.map((s) => `- scripts/${s}`).join('\n')}`
          : '';

      const promptText = `# Skill Activation Guide: ${skill.name}

You are activating the "${skill.name}" skill to assist with the current task.

## Skill Overview
- **Name**: ${skill.name}
- **Description**: ${skill.description}
- **Path**: ${skill.path}
${tocInfo}${referencesInfo}${scriptsInfo}

## Activation Instructions

### Step 1: Load the Skill Content
Read the full SKILL.md file at: ${skill.skillMdPath}

The SKILL.md contains:
- Instructions for when and how to apply this skill
- Code examples and patterns to follow
- References to additional documentation

### Step 2: Understand the Skill's Purpose
After reading the SKILL.md:
- Identify the primary use cases this skill addresses
- Note any prerequisites or dependencies
- Understand the expected inputs and outputs

### Step 3: Load References as Needed
${
  manifest && manifest.files.references.length > 0
    ? `This skill includes reference documentation:
${manifest.files.references.map((r) => `- Load ${skill.path}/references/${r} when you need detailed information about ${r.replace(/\.[^/.]+$/, '')}`).join('\n')}`
    : 'This skill has no additional reference files.'
}

### Step 4: Script Execution
${
  manifest && manifest.files.scripts.length > 0
    ? `This skill includes executable scripts:
${manifest.files.scripts.map((s) => `- ${skill.path}/scripts/${s}`).join('\n')}

When executing scripts:
1. Verify the script is appropriate for the current task
2. Understand what the script does before running it
3. Provide appropriate arguments as documented
4. Handle errors gracefully`
    : 'This skill has no executable scripts.'
}

### Step 5: Apply the Skill
- Follow the instructions in the SKILL.md for the current task
- Use the patterns and examples provided
- Reference the documentation when needed
- Execute scripts as appropriate for the task

## Important Notes
- Always verify script contents before execution
- Follow any security guidelines mentioned in the skill
- Report any issues or unexpected behavior`;

      return {
        description: `Activation guide for skill: ${skill.name}`,
        messages: [textMessage('user', promptText)],
      };
    },
  };
}

/**
 * Create the compare-skills prompt definition
 */
function createCompareSkillsPrompt(discovery: SkillDiscovery): PromptDefinition {
  return {
    prompt: {
      name: 'compare-skills',
      description: 'Comparison guide for analyzing two skills',
      arguments: [
        {
          name: 'skill1',
          description: 'Name of the first skill to compare',
          required: true,
        } as PromptArgument,
        {
          name: 'skill2',
          description: 'Name of the second skill to compare',
          required: true,
        } as PromptArgument,
      ],
    },
    handler: (args) => {
      const skill1 = requireSkill(discovery, args.skill1, 'skill1');
      const skill2 = requireSkill(discovery, args.skill2, 'skill2');
      const manifest1 = getManifest(skill1);
      const manifest2 = getManifest(skill2);

      const formatSkillInfo = (skill: DiscoveredSkill, manifest: SkillManifest | null) => `
### ${skill.name}
- **Description**: ${skill.description}
- **Path**: ${skill.path}
${manifest?.author ? `- **Author**: ${manifest.author}` : ''}
${manifest?.version ? `- **Version**: ${manifest.version}` : ''}
${manifest?.license ? `- **License**: ${manifest.license}` : ''}
- **Scripts**: ${manifest?.files.scripts.length ?? 0} (${manifest?.files.scripts.join(', ') || 'none'})
- **References**: ${manifest?.files.references.length ?? 0} (${manifest?.files.references.join(', ') || 'none'})
- **Code Blocks**: ${manifest?.codeBlocks.length ?? 0}
- **Sections**: ${manifest?.toc.length ?? 0}`;

      const promptText = `# Skill Comparison Guide

You are comparing two skills to understand their differences and determine which is most appropriate for specific tasks.

## Skills to Compare
${formatSkillInfo(skill1, manifest1)}
${formatSkillInfo(skill2, manifest2)}

## Comparison Instructions

### Step 1: Load Both Skill Manifests
Read the full SKILL.md files:
1. ${skill1.skillMdPath}
2. ${skill2.skillMdPath}

### Step 2: Analyze Capabilities

For each skill, identify:
- Primary purpose and use cases
- Input requirements and expected outputs
- Dependencies and prerequisites
- Limitations and constraints

### Step 3: Compare Overlap

Determine:
- [ ] Do these skills serve the same purpose?
- [ ] Is one a subset of the other?
- [ ] Do they have complementary features?
- [ ] Are there conflicting approaches?

### Step 4: Compare Implementation

Analyze:
- Code quality and documentation
- Script complexity and safety
- Reference material depth
- Maintenance status (version, author)

### Step 5: Provide Recommendations

Based on your analysis, provide:

1. **Feature Comparison Table**
   | Feature | ${skill1.name} | ${skill2.name} |
   |---------|------|------|
   | ... | ... | ... |

2. **When to Use ${skill1.name}**
   - List specific scenarios

3. **When to Use ${skill2.name}**
   - List specific scenarios

4. **When to Use Both**
   - Describe complementary usage if applicable

5. **Overall Recommendation**
   - Which skill to prefer and why
   - Considerations for specific task types`;

      return {
        description: `Comparison guide for skills: ${skill1.name} vs ${skill2.name}`,
        messages: [textMessage('user', promptText)],
      };
    },
  };
}

/**
 * Create the create-skill prompt definition
 */
function createCreateSkillPrompt(_discovery: SkillDiscovery): PromptDefinition {
  return {
    prompt: {
      name: 'create-skill',
      description: 'Creation guide for building a new skill',
      arguments: [
        {
          name: 'name',
          description: 'Name for the new skill',
          required: true,
        } as PromptArgument,
        {
          name: 'description',
          description: 'Description of what the skill does',
          required: true,
        } as PromptArgument,
      ],
    },
    handler: (args) => {
      const name = args.name;
      const description = args.description;

      if (!name) {
        throw new Error('Missing required argument: name');
      }
      if (!description) {
        throw new Error('Missing required argument: description');
      }

      const promptText = `# Skill Creation Guide

You are creating a new skill named "${name}".

## Skill Details
- **Name**: ${name}
- **Description**: ${description}

## Directory Structure

Create the following structure:

\`\`\`
${name}/
  SKILL.md           # Main skill file (required)
  references/        # Reference documentation (optional)
  scripts/           # Executable scripts (optional)
  assets/            # Images, data files (optional)
\`\`\`

## Step 1: Create the SKILL.md

The SKILL.md file must have YAML frontmatter followed by markdown content:

\`\`\`markdown
---
name: ${name}
description: ${description}
version: 1.0.0
author: <your-name>
license: MIT
---

# ${name}

${description}

## Overview

Describe the skill's purpose, capabilities, and when it should be used.

## Usage

### When to Use This Skill
- List the scenarios where this skill is helpful
- Describe the problems it solves

### Prerequisites
- List any requirements or dependencies

## Instructions

### Step 1: [First Step]
Describe the first step in using this skill.

### Step 2: [Second Step]
Continue with subsequent steps.

## Examples

### Example 1: [Basic Usage]
\\\`\\\`\\\`
Show code or commands here
\\\`\\\`\\\`

## References

- [Reference Name](references/reference-file.md) - Description

## Scripts

- [Script Name](scripts/script-name.sh) - Description

## Notes

Any additional notes or warnings.
\`\`\`

## Step 2: Add Reference Documentation (Optional)

Create files in the \`references/\` directory:
- Use markdown (.md) for documentation
- Include API references, guides, or detailed explanations
- Link to these files from SKILL.md

## Step 3: Create Scripts (Optional)

Create executable scripts in the \`scripts/\` directory:
- Use appropriate shebangs (#!/bin/bash, #!/usr/bin/env python3)
- Include help/usage information
- Validate inputs before processing
- Handle errors gracefully
- Document expected inputs and outputs

### Script Security Guidelines
- Never hardcode secrets or credentials
- Validate and sanitize all inputs
- Avoid shell injection vulnerabilities
- Limit file system access to necessary paths
- Log actions for debugging

## Step 4: Add Assets (Optional)

Add supporting files to the \`assets/\` directory:
- Images for documentation
- Data files or templates
- Configuration examples

## Step 5: Test the Skill

1. Verify the SKILL.md parses correctly
2. Test each script with various inputs
3. Check all internal links work
4. Validate the skill appears in discovery

## Step 6: Validate

Ensure your skill:
- [ ] Has valid YAML frontmatter with name and description
- [ ] Contains clear instructions for use
- [ ] Documents all scripts and their purposes
- [ ] Includes examples where helpful
- [ ] Has no broken internal links
- [ ] Scripts handle errors gracefully

## Skill Locations

Skills can be placed in:
- \`~/.claude/skills/${name}/\` - User-level skills
- \`./.claude/skills/${name}/\` - Project-level skills
- \`~/.codex/skills/${name}/\` - Codex-compatible location
- \`~/.cursor/skills/${name}/\` - Cursor-compatible location`;

      return {
        description: `Creation guide for new skill: ${name}`,
        messages: [textMessage('user', promptText)],
      };
    },
  };
}

/**
 * Create the skill-summary prompt definition
 */
function createSkillSummaryPrompt(discovery: SkillDiscovery): PromptDefinition {
  return {
    prompt: {
      name: 'skill-summary',
      description: 'Documentation guide for generating a skill summary',
      arguments: [
        {
          name: 'name',
          description: 'Name of the skill to summarize',
          required: true,
        } as PromptArgument,
      ],
    },
    handler: (args) => {
      const skill = requireSkill(discovery, args.name, 'name');
      const manifest = getManifest(skill);

      const tocInfo =
        manifest && manifest.toc.length > 0
          ? manifest.toc.map((t) => `${'  '.repeat(t.level - 1)}- ${t.text}`).join('\n')
          : 'No table of contents available';

      const promptText = `# Skill Summary Guide: ${skill.name}

You are generating a documentation summary for the "${skill.name}" skill.

## Skill Information
- **Name**: ${skill.name}
- **Description**: ${skill.description}
- **Path**: ${skill.path}
- **SKILL.md**: ${skill.skillMdPath}
${manifest?.author ? `- **Author**: ${manifest.author}` : ''}
${manifest?.version ? `- **Version**: ${manifest.version}` : ''}
${manifest?.license ? `- **License**: ${manifest.license}` : ''}

## Current Structure

### Table of Contents
${tocInfo}

### Files
- **Scripts**: ${manifest?.files.scripts.length ?? 0} files
${manifest?.files.scripts.map((s) => `  - ${s}`).join('\n') || '  (none)'}
- **References**: ${manifest?.files.references.length ?? 0} files
${manifest?.files.references.map((r) => `  - ${r}`).join('\n') || '  (none)'}
- **Assets**: ${manifest?.files.assets.length ?? 0} files
${manifest?.files.assets.map((a) => `  - ${a}`).join('\n') || '  (none)'}

### Code Blocks
${manifest?.codeBlocks.length ?? 0} code blocks found
${manifest?.codeBlocks.map((cb) => `- Line ${cb.line}: ${cb.lang || 'unknown'}`).join('\n') || '(none)'}

## Summary Generation Instructions

### Step 1: Read the Full Content
Read the complete SKILL.md file at: ${skill.skillMdPath}

### Step 2: Generate Summary

Create a comprehensive summary including:

1. **Overview** (2-3 sentences)
   - What the skill does
   - Primary use cases
   - Target audience

2. **Key Features** (bullet list)
   - Main capabilities
   - Notable functionality
   - Unique aspects

3. **Quick Start** (numbered steps)
   - Minimal steps to use the skill
   - Essential commands or actions

4. **Available Commands/Scripts**
   - List each script with one-line description
   - Include usage syntax

5. **Reference Documentation**
   - List available references
   - Brief description of each

6. **Dependencies/Requirements**
   - Any prerequisites
   - Required tools or configurations

7. **Examples**
   - 1-2 simple usage examples
   - Common patterns

### Step 3: Format Output

Provide the summary in clean markdown format suitable for:
- Quick reference cards
- README sections
- Documentation portals

The summary should be:
- Concise (under 500 words)
- Scannable (good use of headers and lists)
- Actionable (clear next steps for users)`;

      return {
        description: `Documentation summary guide for skill: ${skill.name}`,
        messages: [textMessage('user', promptText)],
      };
    },
  };
}

/**
 * MCP prompt handlers interface
 */
export interface PromptHandlers {
  /**
   * List all available prompts
   */
  listPrompts(): Prompt[];

  /**
   * Get a prompt by name with arguments
   */
  getPrompt(
    name: string,
    args: Record<string, string | undefined>
  ): Promise<GetPromptResult>;
}

/**
 * Create MCP prompt handlers for skill operations
 * @param discovery - The skill discovery instance
 * @returns Prompt handlers object
 */
export function getPromptHandlers(discovery: SkillDiscovery): PromptHandlers {
  const promptDefinitions: Map<string, PromptDefinition> = new Map();

  // Register all prompts
  const prompts = [
    createAuditSkillPrompt(discovery),
    createUseSkillPrompt(discovery),
    createCompareSkillsPrompt(discovery),
    createCreateSkillPrompt(discovery),
    createSkillSummaryPrompt(discovery),
  ];

  for (const def of prompts) {
    promptDefinitions.set(def.prompt.name, def);
  }

  return {
    listPrompts(): Prompt[] {
      return Array.from(promptDefinitions.values()).map((def) => def.prompt);
    },

    async getPrompt(
      name: string,
      args: Record<string, string | undefined>
    ): Promise<GetPromptResult> {
      const definition = promptDefinitions.get(name);
      if (!definition) {
        throw new Error(`Unknown prompt: ${name}`);
      }
      return definition.handler(args);
    },
  };
}

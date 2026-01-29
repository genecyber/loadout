# Loadout

Load out your AI agent with skills. An MCP server that bridges the [Agent Skills spec](https://github.com/anthropics/agent-skills) to any MCP-compatible agent.

## Features

- **Auto-discovery** - Monitors common skill directories and hot-reloads changes
- **MCP Tools** - List, search, get manifests, run scripts, install skills
- **MCP Resources** - Access skill content via `loadout://` URIs
- **MCP Prompts** - Guidance templates for auditing, using, comparing, and creating skills
- **Bundling** - Create publishable skill packs with pre-bundled skills

## Installation

```bash
npm install loadout
```

Or use a pre-bundled skill pack:

```bash
npm install web3-loadout  # Example bundle with crypto/DeFi skills
```

## Quick Start

### Add to Claude Code

```bash
claude mcp add loadout -- npx loadout --mcp --watch --allow-scripts
```

### Run Standalone

```bash
npx loadout --mcp --watch --allow-scripts
```

## CLI Options

| Option | Description |
|--------|-------------|
| `--mcp` | Run as MCP server with stdio transport |
| `--watch` | Enable hot-reload when skills change |
| `--skills-dir <path>` | Add custom skill directory (can be repeated) |
| `--allow-scripts` | Enable script execution tool |

## Skill Discovery

Loadout automatically monitors these directories for skills:

### Bundled Skills (for published packages)
```
./bundled-skills/
```

### Project Local
```
./skills/
./.claude/skills/
./.cursor/skills/
./.codex/skills/
./.agents/skills/
```

### User Home (globally installed)
```
~/.claude/skills/
~/.cursor/skills/
~/.codex/skills/
~/.agents/skills/
```

Skills are directories containing a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does
version: 1.0.0
---

# My Skill

Instructions and documentation...
```

## MCP Tools

### `list_skills`
List all discovered skills.

```json
// Returns
[
  { "name": "skill-name", "description": "...", "path": "/path/to/skill" }
]
```

### `search_skills`
Search skills by name or description.

```json
{ "query": "blockchain" }
```

### `get_skill_manifest`
Get the full parsed structure of a skill.

```json
{ "name": "skill-name" }

// Returns
{
  "name": "skill-name",
  "description": "...",
  "toc": [...],        // Table of contents
  "codeBlocks": [...], // Extracted code examples
  "links": [...],      // Internal and external links
  "files": { "scripts": [], "references": [], "assets": [] }
}
```

### `run_skill_script`
Execute a script from a skill's `scripts/` directory.

```json
{
  "skill": "skill-name",
  "script": "setup.sh",
  "args": ["--verbose"]
}
```

Only `.sh`, `.js`, `.ts`, `.py` files are allowed. Requires `--allow-scripts` flag.

### `install_skill`
Install a bundled skill to an agent's skills directory.

```json
{
  "skill": "evm-swiss-knife",
  "agent": "claude",    // claude, cursor, codex, or agents
  "global": false       // true = ~/.claude/skills/, false = ./.claude/skills/
}
```

### `help`
Get documentation for Loadout.

```json
{ "topic": "tools" }  // tools, resources, prompts, discovery, bundling, or all
```

## MCP Resources

Access skill content via `loadout://` URIs:

| URI Pattern | Description |
|-------------|-------------|
| `loadout://help` | Loadout documentation |
| `loadout://{name}` | Full SKILL.md content |
| `loadout://{name}/manifest` | JSON manifest |
| `loadout://{name}/section/{slug}` | Specific section by header slug |
| `loadout://{name}/code/{index}` | Code block by index |
| `loadout://{name}/references/{file}` | Reference file content |
| `loadout://{name}/scripts/{file}` | Script file content |
| `loadout://{name}/assets/{file}` | Asset file content |

## MCP Prompts

Guidance templates for working with skills:

| Prompt | Description |
|--------|-------------|
| `audit-skill` | Security audit checklist |
| `use-skill` | How to activate and apply a skill |
| `compare-skills` | Compare two skills |
| `create-skill` | Guide for creating new skills |
| `skill-summary` | Generate documentation summary |

## Creating Skill Bundles

Bundle skills into publishable packages:

### 1. Create `bundle.config.json`

```json
{
  "bundles": {
    "web3-loadout": {
      "name": "web3-loadout",
      "description": "Loadout with Web3/crypto skills",
      "version": "1.0.0",
      "skills": [
        "references/crypto-skills/skills/evm-swiss-knife",
        "references/crypto-skills/skills/token-minter"
      ]
    }
  }
}
```

### 2. Build the bundle

```bash
npm run bundle                   # Build all bundles
npm run bundle -- web3-loadout   # Build specific bundle
```

### 3. Publish

```bash
cd bundles/web3-loadout
npm publish
```

### Bundle Output Structure

```
bundles/web3-loadout/
├── dist/              # Compiled MCP server
├── bundled-skills/    # Embedded skills
│   ├── evm-swiss-knife/
│   └── token-minter/
├── package.json       # Named "web3-loadout"
└── README.md
```

## Development

### Local Skills Directory

Place skills in `./skills/` for development (gitignored by default):

```
skills/
├── my-skill/
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   └── assets/
```

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

## Skill Directory Structure

```
my-skill/
├── SKILL.md           # Required: Main skill file with frontmatter
├── scripts/           # Optional: Executable scripts
│   ├── setup.sh
│   └── run.py
├── references/        # Optional: Reference documentation
│   └── api-guide.md
└── assets/            # Optional: Images, data files, etc.
    └── diagram.png
```

## SKILL.md Format

```markdown
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
license: MIT
author: Your Name
---

# My Skill

Main instructions and documentation.

## Section One

Content organized by headers becomes navigable via table of contents.

## Code Examples

```python
# Code blocks are extracted and indexed
print("Hello from skill!")
```

## See Also

- [Local reference](references/guide.md)
- [External link](https://example.com)
```

## License

MIT

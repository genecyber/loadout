# Skill Creation Guide Template

This guide provides a structured approach for building a new skill from scratch, including proper structure, frontmatter, and best practices.

## Overview

Creating a skill involves defining its purpose, structuring the files correctly, writing clear instructions, and ensuring the skill is safe and useful. This guide walks through each step of the creation process.

## Skill Details

Before creating a skill, define:

- **Name**: A clear, descriptive identifier (lowercase, hyphenated)
- **Description**: A concise explanation of what the skill does
- **Purpose**: The problems this skill solves
- **Target Users**: Who will benefit from this skill

## Directory Structure

Create the following structure for your skill:

```
skill-name/
  SKILL.md           # Main skill file (required)
  references/        # Reference documentation (optional)
  scripts/           # Executable scripts (optional)
  assets/            # Images, data files (optional)
```

### Directory Descriptions

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `SKILL.md` | Main entry point | Instructions, examples, metadata |
| `references/` | Supporting docs | Detailed guides, API references |
| `scripts/` | Automation | Shell scripts, Python scripts |
| `assets/` | Static files | Images, templates, data files |

## Step 1: Create the SKILL.md

The SKILL.md file is the heart of your skill. It must have YAML frontmatter followed by markdown content.

### SKILL.md Template

```markdown
---
name: skill-name
description: A brief description of what this skill does
version: 1.0.0
author: your-name
license: MIT
---

# Skill Name

Brief description of what this skill does.

## Overview

Describe the skill's purpose, capabilities, and when it should be used. This section helps users quickly understand if this skill is relevant to their needs.

## Usage

### When to Use This Skill

- Scenario 1 where this skill is helpful
- Scenario 2 where this skill is helpful
- Specific problems it solves

### Prerequisites

- Required tool or dependency
- Required knowledge or setup
- Any system requirements

## Instructions

### Step 1: [First Step Title]

Describe the first step in using this skill. Be specific and actionable.

### Step 2: [Second Step Title]

Continue with subsequent steps. Include code examples where helpful.

```bash
# Example command
example-command --flag value
```

## Examples

### Example 1: [Basic Usage]

Show a simple, common use case:

```
# Code or command example
example here
```

**Expected output:**
```
# What the user should see
output here
```

### Example 2: [Advanced Usage]

Show a more complex scenario:

```
# More advanced example
complex example here
```

## References

Link to reference documentation:

- [Reference Name](references/reference-file.md) - What this reference covers

## Scripts

Document available scripts:

- [Script Name](scripts/script-name.sh) - What this script does

## Notes

Any additional notes, warnings, or tips:

- Important consideration 1
- Warning about common mistake
- Tip for better results
```

### Frontmatter Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier (lowercase, hyphenated) |
| `description` | Yes | Brief description (1-2 sentences) |
| `version` | No | Semantic version (e.g., 1.0.0) |
| `author` | No | Creator's name or handle |
| `license` | No | License type (e.g., MIT, Apache-2.0) |

## Step 2: Add Reference Documentation (Optional)

Create files in the `references/` directory for detailed information.

### Reference File Guidelines

- Use markdown format (.md)
- One topic per file
- Include practical examples
- Link from SKILL.md

### Example Reference Structure

```
references/
  api-reference.md      # API documentation
  configuration.md      # Configuration options
  troubleshooting.md    # Common issues and solutions
  advanced-usage.md     # Advanced patterns
```

### Reference Template

```markdown
# [Topic Name]

## Overview
Brief introduction to this topic.

## Details

### [Subtopic 1]
Detailed explanation...

### [Subtopic 2]
Detailed explanation...

## Examples

### Example 1
```code
example
```

## See Also
- Links to related references
```

## Step 3: Create Scripts (Optional)

Create executable scripts in the `scripts/` directory for automation.

### Script Requirements

1. **Shebang Line**: Start with appropriate interpreter
   ```bash
   #!/bin/bash
   # or
   #!/usr/bin/env python3
   ```

2. **Help/Usage**: Include help information
   ```bash
   if [[ "$1" == "-h" || "$1" == "--help" ]]; then
       echo "Usage: script-name.sh [options] <args>"
       echo "Description of what the script does"
       exit 0
   fi
   ```

3. **Input Validation**: Validate all inputs
   ```bash
   if [[ -z "$1" ]]; then
       echo "Error: Missing required argument"
       exit 1
   fi
   ```

4. **Error Handling**: Handle errors gracefully
   ```bash
   set -euo pipefail  # Exit on error, undefined var, pipe failure
   ```

### Script Security Guidelines

| Do | Don't |
|----|-------|
| Validate all inputs | Use `eval` with user input |
| Quote variables | Hardcode secrets |
| Use full paths | Ignore error codes |
| Limit file access | Write outside skill directory |
| Log actions | Trust external input |

### Example Script Template

```bash
#!/bin/bash
# Script: script-name.sh
# Description: What this script does
# Usage: script-name.sh [options] <required-arg>

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Help function
show_help() {
    cat << EOF
Usage: $(basename "$0") [options] <required-arg>

Description:
    What this script does in detail.

Arguments:
    required-arg    Description of the argument

Options:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output

Examples:
    $(basename "$0") example-value
    $(basename "$0") -v example-value
EOF
}

# Parse arguments
VERBOSE=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

# Validate required argument
if [[ $# -lt 1 ]]; then
    echo "Error: Missing required argument" >&2
    show_help
    exit 1
fi

ARG="$1"

# Main logic
main() {
    if $VERBOSE; then
        echo "Processing: $ARG"
    fi

    # Your code here
    echo "Result for: $ARG"
}

main
```

## Step 4: Add Assets (Optional)

Add supporting files to the `assets/` directory:

- **Images**: Diagrams, screenshots for documentation
- **Templates**: Starter files users can copy
- **Data Files**: JSON schemas, configuration examples
- **Other**: Any static files the skill needs

### Asset Organization

```
assets/
  images/
    diagram.png
    screenshot.png
  templates/
    config-template.yaml
    starter-file.txt
  data/
    schema.json
```

## Step 5: Test the Skill

Before publishing, verify your skill works correctly.

### Testing Checklist

#### SKILL.md Validation
- [ ] Frontmatter parses correctly (valid YAML)
- [ ] Name and description are present
- [ ] All internal links work
- [ ] Code blocks are properly formatted
- [ ] Instructions are clear and complete

#### Script Testing
- [ ] Scripts execute without errors
- [ ] Help flag works (`-h`, `--help`)
- [ ] Invalid input is handled gracefully
- [ ] Edge cases are handled
- [ ] Output matches documentation

#### Reference Validation
- [ ] All referenced files exist
- [ ] Links from SKILL.md work
- [ ] Content is accurate and helpful

#### Discovery Testing
- [ ] Skill appears in skill list
- [ ] Description is displayed correctly
- [ ] Skill can be activated

## Step 6: Final Validation

Complete final validation before release.

### Validation Checklist

- [ ] Valid YAML frontmatter with name and description
- [ ] Clear instructions for use
- [ ] All scripts documented
- [ ] Examples provided where helpful
- [ ] No broken internal links
- [ ] Scripts handle errors gracefully
- [ ] No hardcoded secrets or credentials
- [ ] Appropriate license declared

## Skill Locations

Skills can be installed in these locations:

| Location | Scope | Priority |
|----------|-------|----------|
| `./.claude/skills/` | Project | Highest |
| `~/.claude/skills/` | User | High |
| `~/.codex/skills/` | User (Codex) | Medium |
| `~/.cursor/skills/` | User (Cursor) | Medium |

### Installation Commands

```bash
# Project-level installation
mkdir -p ./.claude/skills/skill-name
cp -r skill-name/* ./.claude/skills/skill-name/

# User-level installation
mkdir -p ~/.claude/skills/skill-name
cp -r skill-name/* ~/.claude/skills/skill-name/
```

## Best Practices

### Writing Quality

- **Be Concise**: Don't over-explain simple concepts
- **Be Complete**: Cover all necessary steps
- **Be Practical**: Include real-world examples
- **Be Consistent**: Use consistent formatting and terminology

### Maintenance

- **Version Updates**: Increment version for changes
- **Changelog**: Document what changed
- **Compatibility**: Note breaking changes
- **Testing**: Re-test after updates

### Security

- **Review Scripts**: Audit all script code
- **Minimal Permissions**: Request only what's needed
- **No Secrets**: Never include credentials
- **Safe Defaults**: Default to safe behavior

## Creation Workflow Summary

```
1. PLAN
   ├── Define purpose
   ├── Identify use cases
   └── Plan structure

2. CREATE
   ├── Write SKILL.md
   ├── Add references
   └── Create scripts

3. TEST
   ├── Validate SKILL.md
   ├── Test scripts
   └── Verify links

4. VALIDATE
   ├── Complete checklist
   ├── Security review
   └── Documentation review

5. INSTALL
   ├── Choose location
   └── Copy files
```

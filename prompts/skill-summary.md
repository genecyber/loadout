# Skill Documentation Summary Guide Template

This guide provides a structured approach for generating comprehensive documentation summaries for skills.

## Overview

A skill summary provides a quick reference for users to understand what a skill does and how to use it. This guide helps create consistent, useful summaries that can serve as quick reference cards, README sections, or documentation portal entries.

## Skill Information to Gather

Before generating a summary, collect:

- **Name**: The skill's identifier
- **Description**: What the skill does
- **Path**: Location of the skill directory
- **SKILL.md Path**: Location of the main skill file
- **Author**: Who created the skill (if specified)
- **Version**: Current version (if specified)
- **License**: License type (if specified)

## Current Structure Analysis

### Table of Contents
Document the skill's structure by listing its sections:
- Main sections and subsections
- Logical flow of content
- Key topics covered

### Files Inventory

| File Type | Count | Files |
|-----------|-------|-------|
| Scripts | | List each script |
| References | | List each reference |
| Assets | | List each asset |

### Code Blocks
Document code examples found:
- Language used
- Location (line number)
- Purpose of each block

## Summary Generation Instructions

### Step 1: Read the Full Content

Load and read the complete SKILL.md file to understand:
- The skill's full capabilities
- All documented features
- Examples and use cases
- Any warnings or notes

### Step 2: Generate Summary Components

Create each component of the summary:

#### 1. Overview (2-3 sentences)

Answer these questions in a concise paragraph:
- What does this skill do?
- What are the primary use cases?
- Who is the target audience?

**Template:**
```markdown
## Overview

[Skill name] provides [main capability]. It is designed for [primary use case]
and helps users [key benefit]. Best suited for [target audience or scenario].
```

#### 2. Key Features (bullet list)

List the main capabilities:
- Focus on user-facing features
- Include unique or notable aspects
- Keep descriptions brief (one line each)

**Template:**
```markdown
## Key Features

- **[Feature 1]**: Brief description
- **[Feature 2]**: Brief description
- **[Feature 3]**: Brief description
- **[Feature 4]**: Brief description
```

#### 3. Quick Start (numbered steps)

Provide minimal steps to begin using the skill:
- Include only essential steps
- Keep each step actionable
- Aim for 3-5 steps maximum

**Template:**
```markdown
## Quick Start

1. [First action to take]
2. [Second action to take]
3. [Third action to take]
4. [Verify success / Next step]
```

#### 4. Available Commands/Scripts

List each script with usage information:

**Template:**
```markdown
## Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `script-name.sh` | What it does | `./script-name.sh <args>` |
| `another-script.py` | What it does | `python another-script.py <args>` |
```

Or in list format:
```markdown
## Available Scripts

- **`script-name.sh`** - Brief description
  ```bash
  ./script-name.sh [options] <argument>
  ```

- **`another-script.py`** - Brief description
  ```bash
  python another-script.py [options] <argument>
  ```
```

#### 5. Reference Documentation

List available references with brief descriptions:

**Template:**
```markdown
## Reference Documentation

| Reference | Description |
|-----------|-------------|
| [API Reference](references/api.md) | Complete API documentation |
| [Configuration](references/config.md) | Configuration options guide |
| [Examples](references/examples.md) | Additional usage examples |
```

#### 6. Dependencies/Requirements

List prerequisites clearly:

**Template:**
```markdown
## Requirements

### Prerequisites
- Requirement 1 (e.g., Python 3.8+)
- Requirement 2 (e.g., Node.js 16+)

### Required Tools
- Tool 1 with installation link
- Tool 2 with installation link

### Configuration
- Any required environment variables
- Any required configuration files
```

#### 7. Examples

Provide 1-2 clear usage examples:

**Template:**
```markdown
## Examples

### Basic Usage

```bash
# Description of what this example does
command-or-code-here
```

**Output:**
```
expected output here
```

### Common Pattern

```bash
# Description of a common use case
another-example-here
```
```

### Step 3: Format Output

Compile the components into a clean markdown summary.

#### Complete Summary Template

```markdown
# [Skill Name] - Quick Reference

> [One-line description from frontmatter]

## Overview

[2-3 sentence overview covering what, why, and for whom]

## Key Features

- **[Feature 1]**: Description
- **[Feature 2]**: Description
- **[Feature 3]**: Description

## Quick Start

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Available Scripts

| Script | Description |
|--------|-------------|
| `script.sh` | What it does |

## Reference Documentation

- [Reference Name](path) - Description

## Requirements

- Requirement 1
- Requirement 2

## Example

```bash
# Basic usage example
example-command
```

---

**Version**: X.Y.Z | **Author**: Name | **License**: MIT
```

## Summary Quality Guidelines

### Content Standards

| Aspect | Target |
|--------|--------|
| Word Count | Under 500 words |
| Overview Length | 2-3 sentences |
| Quick Start Steps | 3-5 steps |
| Examples | 1-2 examples |

### Formatting Standards

- **Scannable**: Use headers, lists, and tables
- **Consistent**: Follow template structure
- **Clean**: No unnecessary content
- **Linked**: Reference files are linked

### Actionable Content

Every section should help users:
- Understand what they can do
- Know how to get started
- Find more detailed information
- Accomplish common tasks

## Summary Use Cases

### Quick Reference Card
- Print-friendly format
- Key information at a glance
- Minimal scrolling required

### README Section
- Can be embedded in project README
- Introduces the skill to new users
- Links to full documentation

### Documentation Portal
- Consistent format across skills
- Searchable content
- Easy navigation

## Generation Workflow Summary

```
1. GATHER
   ├── Read SKILL.md
   ├── Inventory files
   └── Note structure

2. ANALYZE
   ├── Identify key features
   ├── Extract prerequisites
   └── Find best examples

3. COMPOSE
   ├── Write overview
   ├── List features
   ├── Document scripts
   └── Include examples

4. FORMAT
   ├── Apply template
   ├── Check word count
   └── Verify links

5. REVIEW
   ├── Verify accuracy
   ├── Check completeness
   └── Ensure clarity
```

## Common Issues to Avoid

| Issue | Solution |
|-------|----------|
| Too verbose | Focus on essentials only |
| Missing features | Review SKILL.md thoroughly |
| Broken links | Verify all paths |
| Outdated info | Check against current version |
| Unclear steps | Test the quick start yourself |
| No examples | Extract from SKILL.md or create |

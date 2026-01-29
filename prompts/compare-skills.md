# Skill Comparison Guide Template

This guide provides a structured approach for analyzing and comparing two skills to determine which is most appropriate for specific tasks.

## Overview

When comparing skills, you evaluate their capabilities, implementation quality, and suitability for different use cases. This helps users choose the right skill for their needs or understand how skills might work together.

## Information to Gather for Each Skill

Collect the following for both skills being compared:

| Attribute | Skill 1 | Skill 2 |
|-----------|---------|---------|
| Name | | |
| Description | | |
| Path | | |
| Author | | |
| Version | | |
| License | | |
| Script Count | | |
| Reference Count | | |
| Code Block Count | | |
| Section Count | | |

## Comparison Instructions

### Step 1: Load Both Skill Manifests

Read the complete SKILL.md files for both skills:

1. Read first skill's SKILL.md
2. Read second skill's SKILL.md

Take notes on:
- Stated purposes
- Documented capabilities
- Usage instructions
- Examples provided

### Step 2: Analyze Capabilities

For each skill, systematically identify:

#### Primary Purpose and Use Cases
- What is the main problem this skill solves?
- What specific use cases are documented?
- What tasks can it help accomplish?

#### Input Requirements
- What inputs does the skill expect?
- What format should inputs be in?
- Are there optional vs required inputs?

#### Expected Outputs
- What does the skill produce?
- What format are outputs in?
- Are there intermediate outputs?

#### Dependencies and Prerequisites
- What tools must be installed?
- What systems must be available?
- What knowledge is assumed?

#### Limitations and Constraints
- What can't the skill do?
- What edge cases are not handled?
- What conditions cause failure?

### Step 3: Compare Overlap

Determine the relationship between the two skills:

#### Overlap Assessment Checklist

- [ ] **Same Purpose?**
  - Do these skills solve the same problem?
  - Are they interchangeable?

- [ ] **Subset Relationship?**
  - Is one skill's functionality entirely contained within the other?
  - Does one extend the other?

- [ ] **Complementary Features?**
  - Do the skills handle different aspects of a larger problem?
  - Could they be used together effectively?

- [ ] **Conflicting Approaches?**
  - Do the skills use incompatible methods?
  - Would using both cause confusion?

#### Overlap Matrix

| Capability | Skill 1 | Skill 2 | Notes |
|------------|---------|---------|-------|
| [Capability A] | Yes/No/Partial | Yes/No/Partial | |
| [Capability B] | Yes/No/Partial | Yes/No/Partial | |
| [Capability C] | Yes/No/Partial | Yes/No/Partial | |

### Step 4: Compare Implementation

Analyze the quality and safety of each implementation:

#### Code Quality
| Aspect | Skill 1 | Skill 2 |
|--------|---------|---------|
| Documentation completeness | | |
| Code clarity | | |
| Error handling | | |
| Example quality | | |

#### Script Analysis
| Aspect | Skill 1 | Skill 2 |
|--------|---------|---------|
| Number of scripts | | |
| Script complexity | | |
| Safety practices | | |
| Input validation | | |

#### Reference Material
| Aspect | Skill 1 | Skill 2 |
|--------|---------|---------|
| Reference count | | |
| Reference depth | | |
| External links | | |
| Update currency | | |

#### Maintenance Status
| Aspect | Skill 1 | Skill 2 |
|--------|---------|---------|
| Version number | | |
| Author reputation | | |
| Last update | | |
| Community support | | |

### Step 5: Provide Recommendations

Based on your analysis, generate comprehensive recommendations:

#### Feature Comparison Table

```markdown
| Feature | [Skill 1 Name] | [Skill 2 Name] |
|---------|----------------|----------------|
| [Feature A] | [Support level] | [Support level] |
| [Feature B] | [Support level] | [Support level] |
| [Feature C] | [Support level] | [Support level] |
| Documentation | [Quality] | [Quality] |
| Ease of Use | [Rating] | [Rating] |
| Safety | [Rating] | [Rating] |
```

#### When to Use [Skill 1 Name]

List specific scenarios where the first skill is the better choice:

- Scenario 1: [Description and rationale]
- Scenario 2: [Description and rationale]
- Scenario 3: [Description and rationale]

#### When to Use [Skill 2 Name]

List specific scenarios where the second skill is the better choice:

- Scenario 1: [Description and rationale]
- Scenario 2: [Description and rationale]
- Scenario 3: [Description and rationale]

#### When to Use Both

Describe complementary usage patterns if applicable:

- Pattern 1: [How skills work together]
- Pattern 2: [Division of responsibilities]
- Workflow: [End-to-end process using both]

#### Overall Recommendation

Provide a clear recommendation:

```markdown
## Recommendation Summary

**For [Task Type A]**: Use [Skill Name] because [rationale]

**For [Task Type B]**: Use [Skill Name] because [rationale]

**General Preference**: [Skill Name] is recommended for most cases because [rationale]

**Considerations**:
- [Important factor 1]
- [Important factor 2]
- [Caveat or exception]
```

## Comparison Report Template

```markdown
# Skill Comparison: [Skill 1] vs [Skill 2]

## Executive Summary
[2-3 sentence overview of comparison findings]

## Skill Profiles

### [Skill 1 Name]
- **Purpose**: [Brief description]
- **Strengths**: [Key advantages]
- **Weaknesses**: [Limitations]

### [Skill 2 Name]
- **Purpose**: [Brief description]
- **Strengths**: [Key advantages]
- **Weaknesses**: [Limitations]

## Feature Comparison
[Feature comparison table]

## Capability Analysis
[Detailed capability overlap analysis]

## Implementation Quality
[Quality comparison findings]

## Use Case Recommendations

### Use [Skill 1] When:
- [Scenario list]

### Use [Skill 2] When:
- [Scenario list]

### Use Both When:
- [Scenario list if applicable]

## Final Recommendation
[Clear, actionable recommendation]
```

## Comparison Workflow Summary

```
1. GATHER
   ├── Load Skill 1 manifest
   └── Load Skill 2 manifest

2. ANALYZE
   ├── Document capabilities
   ├── Identify dependencies
   └── Note limitations

3. COMPARE
   ├── Assess overlap
   ├── Rate implementations
   └── Evaluate quality

4. RECOMMEND
   ├── Create comparison table
   ├── Define use cases
   └── Provide final recommendation
```

## Common Comparison Scenarios

### Choosing Between Similar Skills
- Focus on feature differences
- Compare documentation quality
- Evaluate maintenance status

### Evaluating Complementary Skills
- Map capability boundaries
- Define integration points
- Document combined workflows

### Assessing Replacement Options
- Ensure feature parity
- Plan migration path
- Identify breaking changes

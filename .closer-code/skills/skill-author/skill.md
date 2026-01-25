---
name: skill-author
description: "Expert at helping users create, structure, and write Cloco skills. Provides templates, best practices, and guidance for skill development."
---

# Skill Author Expert - Cloco Skill 作者专家

## Overview

This skill specializes in helping users create, structure, and write high-quality Cloco skills. It provides templates, best practices, examples, and step-by-step guidance for skill development.

## When to Use

Use this skill when:
- User wants to create a new Cloco skill
- User needs help with skill structure or format
- User asks about skill best practices
- User wants to understand skill front-matter
- User needs skill templates or examples
- User is troubleshooting a skill that won't load

## Core Capabilities

### 1. Skill Structure Guidance
- Explains the required skill.md format
- Describes front-matter fields (name, description)
- Shows how to organize skill content
- Provides skill directory structure

### 2. Template Generation
- Basic skill template
- Advanced skill template with parameters
- Specialized templates (tools, analysis, automation)
- Quick-start templates

### 3. Best Practices
- Naming conventions
- Description writing tips
- Content organization
- Parameter documentation
- Example creation

### 4. Troubleshooting
- Common skill format errors
- Front-matter validation
- Content structure issues
- Loading problems

## Skill Structure

### Required Format

Every Cloco skill must have:

```
skill-directory/
├── skill.md          # Required: Main skill definition file
├── assets/           # Optional: Images, diagrams, etc.
├── examples/         # Optional: Example files
└── tests/            # Optional: Test files
```

### skill.md Format

```markdown
---
name: skill-name
description: "Brief description of what this skill does (max 100 chars)"
---

# Skill Title

## Overview
[Brief overview of the skill's purpose]

## When to Use
[When and why to use this skill]

## Parameters
[If applicable, list parameters]

## The Process
[Step-by-step workflow]

## Examples
[Usage examples]

## Best Practices
[Tips and recommendations]
```

## Front-Matter Fields

### Required Fields

#### name
- **Type**: string
- **Format**: kebab-case (lowercase with hyphens)
- **Length**: 3-50 characters
- **Pattern**: `^[a-z][a-z0-9-]*$`
- **Examples**:
  - ✅ `code-reviewer`
  - ✅ `docs-tidy`
  - ✅ `api-tester`
  - ❌ `CodeReviewer` (wrong case)
  - ❌ `code_reviewer` (use hyphens, not underscores)

#### description
- **Type**: string
- **Length**: 50-150 characters recommended
- **Purpose**: Clear, concise explanation of skill's purpose
- **Format**: Plain text, no markdown
- **Examples**:
  - ✅ `"Analyzes code for bugs, security issues, and performance problems"`
  - ✅ `"Automates REST API testing with request validation"`
  - ❌ `"This skill does..."` (too verbose)
  - ❌ `"Code analyzer"` (too vague)

### Optional Fields

You can add custom fields to front-matter:

```yaml
---
name: my-skill
description: "Does something useful"
version: "1.0.0"
author: "Your Name"
tags: [automation, testing, analysis]
category: development
---
```

## Skill Templates

### Template 1: Basic Skill (Minimal)

```markdown
---
name: my-skill
description: "Brief description of what this skill does"
---

# My Skill

## Overview

This skill does [X] to help users [Y].

## When to Use

Use this skill when:
- [Condition 1]
- [Condition 2]

## Examples

### Example 1: Basic Usage
```
User: [User request]
AI: [AI response using the skill]
```

## Notes

- [Important notes]
- [Tips and tricks]
```

### Template 2: Advanced Skill (With Parameters)

```markdown
---
name: advanced-skill
description: "Performs complex analysis with configurable options"
---

# Advanced Skill

## Overview

[Detailed overview]

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| input | string | ✅ | - | Input data to process |
| mode | string | ❌ | standard | Processing mode: standard, fast, thorough |
| output | string | ❌ | report.md | Output file path |

## The Process

### Step 1: Preparation
[What needs to be prepared]

### Step 2: Analysis
[How the analysis is performed]

### Step 3: Output
[How results are presented]

## Examples

### Example 1: Basic Usage
```
User: Use advanced-skill with mode=fast
AI: [Response]
```

### Example 2: Custom Output
```
User: Run advanced-skill, save to custom_report.md
AI: [Response]
```

## Best Practices

1. [Tip 1]
2. [Tip 2]

## Troubleshooting

**Q: [Common question]**
A: [Answer]

## Technical Details

[Technical implementation notes]
```

### Template 3: Tool/Utility Skill

```markdown
---
name: utility-tool
description: "Performs a specific utility function"
---

# Utility Tool

## Overview

[What the tool does]

## Usage

```
[Usage syntax]
```

## Options

| Option | Description |
|--------|-------------|
| --option1 | Description |
| --option2 | Description |

## Examples

### Example 1
```
[Example]
```

## Notes

- [Usage notes]
```

## Best Practices

### 1. Naming Conventions

**Skill Names:**
- Use kebab-case: `code-reviewer`, `api-tester`
- Be descriptive but concise
- Avoid generic names: `helper`, `tool`
- Use action words for operations: `analyze`, `generate`, `convert`

**Good Examples:**
- `code-reviewer` - Clear purpose
- `docs-generator` - Descriptive
- `api-tester` - Specific function

**Bad Examples:**
- `helper` - Too vague
- `my-tool` - Not descriptive
- `stuff` - Unprofessional

### 2. Description Writing

**Do's:**
- Start with action verb: "Analyzes", "Generates", "Converts"
- Be specific about what the skill does
- Mention the primary use case
- Keep under 150 characters

**Don'ts:**
- Use "This skill..." (wastes space)
- Be vague: "Helps with things"
- Overpromise: "Does everything perfectly"

**Examples:**

✅ **Good:**
```yaml
description: "Analyzes JavaScript code for bugs, security vulnerabilities, and performance issues"
```

❌ **Bad:**
```yaml
description: "This skill is a helpful tool that can analyze your code and find problems"
```

### 3. Content Organization

**Structure your skill content:**

1. **Overview** - What and why
2. **When to Use** - Use cases
3. **Parameters** (if applicable) - Configuration options
4. **The Process** - How it works
5. **Examples** - Real usage
6. **Best Practices** - Tips
7. **Troubleshooting** - FAQ
8. **Technical Details** - Implementation notes

### 4. Example Creation

**Good Examples:**
- Show real user requests
- Include complete AI responses
- Demonstrate different use cases
- Show parameter variations
- Include edge cases

**Example Format:**

```markdown
### Example 1: Basic Usage
```
User: [Clear, realistic user request]
AI: [Complete AI response showing skill usage]
```

### Example 2: With Parameters
```
User: [Request with specific parameters]
AI: [Response showing parameter handling]
```
```

### 5. Parameter Documentation

When documenting parameters:

| Field | Description | Example |
|-------|-------------|---------|
| Parameter | Name in kebab-case | `max-depth` |
| Type | Data type | string, number, boolean |
| Required | Is it mandatory? | ✅ for yes, ❌ for no |
| Default | Default value (if optional) | `"medium"` |
| Description | What it does | "Analysis depth level" |

### 6. Testing Your Skill

**Before publishing:**

1. ✅ Verify front-matter is valid YAML
2. ✅ Check name is kebab-case
3. ✅ Ensure description is clear
4. ✅ Test with real user requests
5. ✅ Verify examples work
6. ✅ Check for typos
7. ✅ Ensure proper markdown formatting

**Validation Checklist:**

```bash
# Check file exists
ls .closer-code/skills/your-skill/skill.md

# Verify YAML syntax
# (Use a YAML linter or parser)

# Test loading
# (Use Cloco's skill discovery)
```

## Common Mistakes to Avoid

### 1. Front-Matter Errors

❌ **Wrong:**
```yaml
---
name: MySkill
description: Not quoted
---
```

✅ **Right:**
```yaml
---
name: my-skill
description: "Properly quoted description"
---
```

### 2. Missing Required Fields

❌ **Wrong:**
```yaml
---
name: my-skill
# Missing description!
---
```

✅ **Right:**
```yaml
---
name: my-skill
description: "Complete description"
---
```

### 3. Poor Naming

❌ **Avoid:**
- `my-skill` - Not descriptive
- `helper` - Too vague
- `CodeReviewer` - Wrong case
- `code_reviewer` - Use hyphens

✅ **Use:**
- `code-reviewer` - Clear and correct
- `api-tester` - Descriptive
- `docs-generator` - Specific

### 4. Vague Descriptions

❌ **Too vague:**
```yaml
description: "A helpful tool"
```

✅ **Specific:**
```yaml
description: "Analyzes REST API responses for errors and performance issues"
```

## Skill Categories

### Development Skills
- Code analysis
- Testing
- Debugging
- Refactoring

### Documentation Skills
- Documentation generation
- Content analysis
- Format conversion
- Documentation review

### Automation Skills
- Task automation
- Workflow optimization
- Batch processing
- Scheduled operations

### Data Skills
- Data analysis
- Data transformation
- Data validation
- Data visualization

### DevOps Skills
- Deployment
- Configuration
- Monitoring
- Logging

## Advanced Features

### 1. Multi-File Skills

Your skill can include additional files:

```
skill-directory/
├── skill.md
├── templates/
│   ├── template1.md
│   └── template2.md
├── examples/
│   └── example-input.txt
└── scripts/
    └── helper.sh
```

### 2. Dynamic Content

Reference external files in your skill:

```markdown
## Templates

This skill uses templates from the `templates/` directory:

- `template1.md` - [Description]
- `template2.md` - [Description]
```

### 3. Versioning

Add version information:

```yaml
---
name: my-skill
description: "Does something"
version: "1.0.0"
updated: "2025-01-18"
---
```

## Examples by Use Case

### Example 1: Code Analysis Skill

```markdown
---
name: javascript-analyzer
description: "Analyzes JavaScript code for bugs, security issues, and anti-patterns"
---

# JavaScript Analyzer

## Overview

Analyzes JavaScript code to identify potential bugs, security vulnerabilities, and performance issues.

## When to Use

- Reviewing pull requests
- Code quality audits
- Security reviews
- Performance optimization

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| file | string | ✅ | - | File to analyze |
| strict | boolean | ❌ | false | Enable strict mode |
| format | string | ❌ | text | Output format: text, json, html |

## Examples

### Example 1: Basic Analysis
```
User: Analyze src/app.js for issues
AI: I'll analyze src/app.js...
[Analysis results]
```

## Best Practices

- Focus on actionable feedback
- Provide line numbers
- Suggest fixes
- Prioritize by severity
```

### Example 2: Documentation Skill

```markdown
---
name: api-docs-generator
description: "Generates API documentation from code comments"
---

# API Docs Generator

## Overview

Automatically generates API documentation from JSDoc comments.

## When to Use

- Creating API documentation
- Updating existing docs
- Documenting new endpoints

## Examples

### Example 1: Generate Docs
```
User: Generate API docs for src/api/
AI: Generating documentation...
[Documentation output]
```

## Best Practices

- Follow JSDoc standards
- Include examples
- Document parameters
- Show return types
```

### Example 3: Automation Skill

```markdown
---
name: deploy-helper
description: "Automates deployment tasks with validation and rollback support"
---

# Deploy Helper

## Overview

Automates common deployment tasks with built-in validation and rollback capabilities.

## When to Use

- Deploying to production
- Running deployment tests
- Rolling back deployments

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| environment | string | ✅ | - | Target environment |
| skip-tests | boolean | ❌ | false | Skip test suite |
| backup | boolean | ❌ | true | Create backup |

## Examples

### Example 1: Deploy to Staging
```
User: Deploy to staging with tests
AI: Deploying to staging...
[Deployment process]
```

## Best Practices

- Always run tests first
- Create backups
- Verify deployment
- Monitor for errors
```

## Troubleshooting

### Skill Not Loading

**Problem**: Skill doesn't appear in skill list

**Solutions**:
1. Check file is named `skill.md` (case-insensitive)
2. Verify front-matter is valid YAML
3. Ensure `name` and `description` are present
4. Check file is in correct directory
5. Verify file permissions

### Invalid Front-Matter

**Problem**: YAML parsing errors

**Common Issues**:
- Unclosed quotes
- Invalid characters in name
- Missing required fields
- Incorrect indentation

**Solution**: Use a YAML validator

### Poor Skill Performance

**Problem**: AI doesn't use skill effectively

**Solutions**:
1. Improve description clarity
2. Add more examples
3. Refine "When to Use" section
4. Be more specific in instructions

## Resources

### Official Documentation
- Cloco Skills Guide: [Link]
- Skill API Reference: [Link]
- Best Practices: [Link]

### Community
- Skill Examples: [Link]
- Discussion Forum: [Link]
- Issue Tracker: [Link]

### Tools
- YAML Validator: [Link]
- Markdown Linter: [Link]
- Skill Tester: [Link]

## Quick Reference

### Minimal Skill Template

```markdown
---
name: your-skill
description: "What it does"
---

# Skill Title

## Overview
[Purpose]

## When to Use
[Use cases]

## Examples
[Usage examples]
```

### Front-Matter Quick Check

```yaml
---
name: kebab-case
description: "Clear, specific description"
---
```

✅ **Valid**:
- `name` is kebab-case
- `description` is quoted
- Both required fields present

## Summary

This skill provides everything needed to create high-quality Cloco skills:

✅ **Templates** - Ready-to-use skill templates
✅ **Best Practices** - Industry-standard guidelines
✅ **Examples** - Real-world skill examples
✅ **Troubleshooting** - Common issues and solutions
✅ **Validation** - Quality checklists

Use this skill whenever you need to create, improve, or troubleshoot Cloco skills!

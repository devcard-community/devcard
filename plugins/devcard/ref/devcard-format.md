---
name: devcard-format
description: "Schema reference, validation rules, and rendering instructions for devcard YAML files"
---

# Devcard Format Skill

You are an expert at working with devcard YAML files. Use this skill whenever you need to validate, create, or render devcard data.

## Schema (v1)

A valid `devcard.yaml` follows this schema:

```yaml
schema_version: "1"

# REQUIRED FIELDS
name: "Full Name"                    # Display name
title: "Role / Tagline"             # One-line professional identity
bio: "Short description"            # 1-2 sentence summary
stack:                               # At least one category required
  category_name: [Tech1, Tech2]     # Freeform category keys
links:
  github: "https://github.com/username"  # GitHub link required

# RECOMMENDED FIELDS
location: "City, Country"
archetype: "The Visualizer"                    # Developer classification
dna: >                                          # AI-generated personality read (2-3 sentences)
  Full-stack polyglot with a spatial computing
  obsession. Builds tools that make complex
  things simple, then open-sources them before
  they're done.
interests: [Creative Coding, AI Agents, WebGL]  # Distilled themes from starred repos
next_project: >                                  # A personalized project idea (third person, gender-neutral)
  An end-to-end spatial capture app — iPhone LiDAR
  to Gaussian Splat to Quest 3 walkthrough.
about: |
  Multi-line extended bio.
  Supports paragraphs.

experience:
  - role: "Job Title"
    company: "Company Name"
    period: "2024-present"
    highlight: "Key achievement"

projects:
  - name: "Project Name"
    description: "What it does"
    status: shipped              # shipped | wip | concept | archived
    tags: [tag1, tag2]
    link: "https://..."          # Optional

links:
  github: "https://github.com/username"   # Required
  linkedin: "https://..."                  # Optional
  twitter: "https://..."                   # Optional
  website: "https://..."                   # Optional

private_note: "Also maintains 12 private projects in Python and Go"  # Aggregate only

# CLAUDE CODE FINGERPRINT (optional)
claude:
  since: "2026-01-03"                   # First session date
  sessions: 104                          # Total session count
  messages: 43043                        # Total message count
  model: "opus"                          # Primary model: opus | sonnet | haiku
  style: "Marathon Architect"            # AI-generated collaboration label (1-3 words)
  style_description: >                   # 1-2 sentences referencing actual numbers
    Runs deep, sustained sessions averaging 400+
    messages. Prefers to stay in one context and
    iterate rather than starting fresh.
  rhythm: "Morning Builder"              # AI-generated time pattern label
  peak_hours: [9, 10, 11]              # Top 3 active hours (0-23)
  hour_distribution:                     # 24 values (index = hour), for heatmap
    [0,0,0,0,0,0,0,0,1,13,24,8,6,11,5,8,0,0,1,7,2,7,9,1]

created_at: "YYYY-MM-DD"
updated_at: "YYYY-MM-DD"
```

## Validation Rules

1. **Required fields**: `name`, `title`, `bio`, `stack` (with at least one category containing at least one item), `links.github`
2. **`schema_version`** must be `"1"`
3. **`stack`** categories are freeform keys (e.g., `frontend`, `backend`, `ai_tools`, `devops`)
4. **`projects[].status`** must be one of: `shipped`, `wip`, `concept`, `archived`
5. **`experience[].period`** should use format: `YYYY-present` or `YYYY-YYYY`
6. **`links.github`** must be a valid GitHub profile URL
7. **Dates** use `YYYY-MM-DD` format
8. **`archetype`** string, one developer classification (e.g., "The Visualizer", "The Toolsmith", "The Architect")
9. **`dna`** string, max ~300 characters, AI-generated review of the developer (2-3 sentences, critic voice — observe patterns, interpret, make a judgment call; not a profile or summary)
10. **`interests`** array of 3-8 string items, distilled themes from starred repos or manual input
11. **`next_project`** string, 1-2 sentences, a personalized project idea based on their skill intersection. Third person, gender-neutral
12. **`private_note`** string, aggregate-only summary of private repos (no names or descriptions)
13. **`claude`** object, optional. When present, all sub-fields are optional
14. **`claude.since`** date string in `YYYY-MM-DD` format (first session date)
15. **`claude.sessions`** and **`claude.messages`** positive integers
16. **`claude.model`** string, one of: `opus`, `sonnet`, `haiku`
17. **`claude.style`** string, 1-3 word AI-generated collaboration pattern label
18. **`claude.style_description`** string, 1-2 sentences, max ~200 chars. Must reference actual metrics, no buzzwords
19. **`claude.rhythm`** string, AI-generated time pattern label (e.g., "Morning Builder", "Night Owl")
20. **`claude.peak_hours`** array of 1-3 integers in range 0-23
21. **`claude.hour_distribution`** array of exactly 24 non-negative numbers (index = hour, values = session counts)

## Card Layout Reference

When rendering a devcard, follow this open layout (no box borders):

```
<NAME in UPPERCASE bold monospace>
<title> · <location>
Claude's read: <archetype>                              ← dim prefix + purple italic value
──────────────────────────────────────────────────────────

Claude's read                                        ← dim header
  <dna text, italic>                                 ← special quote/read

Bio
<bio text, wrapped at ~58 chars>

About
<about text, wrapped at ~58 chars>

Stack
<category>      <tech · tech · tech>

Interests
<interest · interest · interest>                     ← dot-separated

Projects
▸ <name>  [status]
  <description>

Experience
<role> @ <company> (<period>)
  <highlight>

<private_note>                                       ← dim italic footnote

Links
<label>         <url>

──────────────────────────────────────────────────────────

❯ Claude's Insights                                 ← collapsible disclosure, collapsed by default
  WHAT TO BUILD NEXT  <next_project text>            ← revealed on click

❯ Claude Code                                       ← collapsible disclosure, collapsed by default
  <style>                                            ← purple, like archetype
  "<style_description>"                              ← italic
  <sessions> sessions · <messages> messages · since <since>
  Model       <model>
  Rhythm      <rhythm> (peak: <peak_hours>)
  ░░░░░░░░▒███▓▒█▒▓░░▒▓▒█▒░                        ← 24-cell heatmap, claudeOrange
  0       6      12     18  23
```

## Inline Rendering Fallback

If the Node.js render script is unavailable, render the card directly. Follow these rules:

1. NO box borders — open layout with only two thin `─` dividers (after title/archetype, at bottom)
2. Render name in UPPERCASE bold monospace text
3. Title and location on one line, joined with ` · `
4. Archetype: standalone in purple italic (no prefix)
5. DNA: "Claude's read" header (dim), then italic text indented 2 spaces
6. Section headers: plain `Bio`, `About`, `Stack`, `Interests`, `Projects`, `Experience`, `Links`
7. Stack techs separated by ` · ` (middle dot), category labels left-padded to align
8. Interests as dot-separated list (` · `) under `Interests` header
9. Projects: `▸` bullet, name, `[status]` tag. Description indented on next line
10. Private note as dim italic text after Experience, before Links (no section header)
11. Links: label left-padded, URL after
12. Omit empty/missing sections entirely
13. Output as a single code block — no text before or after it
14. Claude's Insights (dna, next_project) and Claude Code sections render as collapsible disclosures after the bottom divider, before the chat prompt. Collapsed by default with `❯` chevron prefix
15. Claude Code heatmap: 24 characters using ` ` (0), `░` (low), `▒` (medium), `▓` (high), `█` (peak), colored claudeOrange. Hour axis below: `0       6      12     18  23`

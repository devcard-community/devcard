<img src="plugins/devcard/assets/logo.svg" width="36" alt="devcard" />

# devcard

A Claude Code plugin that turns your GitHub profile into an interactive developer card - with an AI-written review of your work, a Claude Code collaboration fingerprint, and an activity heatmap.

Zero npm dependencies. Pure Node.js ESM.

## Install

In Claude Code, run:

```
/plugin marketplace add devcard-community/devcard
/plugin install devcard@devcard
```

## Commands

| Command | What it does |
|---|---|
| `/devcard:init` | Create your card from your GitHub profile |
| `/devcard:update` | Update fields, refresh GitHub data, or regenerate AI insights |
| `/devcard:stats` | Add your Claude Code collaboration fingerprint |
| `/devcard:view` | Render your card (web viewer + terminal fallback) |
| `/devcard:export` | Generate a shareable SVG |
| `/devcard:publish` | Submit your card to the [community registry](https://devcard-community.github.io/registry/) |
| `/devcard:unpublish` | Remove your card from the registry |

## Quick start

```
/devcard:init your-github-username
/devcard:stats
/devcard:view
```

## What's on a card

| Section | What it captures |
|---|---|
| **Identity** | Name, title, location, links |
| **Stack** | Technologies grouped by domain |
| **Projects** | What you've shipped, with status tags |
| **Archetype** | An AI-assigned developer personality |
| **DNA** | A critic's review of your body of work |
| **Next project** | A tailored project idea from Claude |
| **Claude Code stats** | Session depth, peak hours, model preference, activity heatmap |

The DNA isn't a profile summary. It reads like the closing paragraph of a review - Claude observes patterns in your repos, interprets what they reveal, and makes a judgment call.

## Claude Code statistics

`/devcard:stats` extracts your usage patterns from `~/.claude/stats-cache.json`:

- **Style** - a collaboration label based on session depth, model choice, and temporal patterns
- **Rhythm** - when you work (Morning Builder, Night Owl, All-Day Coder)
- **Heatmap** - 24-cell hour distribution showing your peak coding hours

```
Claude Code Statistics
  Marathon Architect
  Runs deep, sustained sessions averaging 400+ messages.
  104 sessions · 43K messages · since 2026-01-03
  Model     opus
  Rhythm    Morning Builder (peak: 9, 10, 11h)
  ░░░░░░░░▒███▓▒█▒▓░░▒▓▒█▒░
  0       6      12     18  23
```

## Card file

Your card lives at `~/.devcard/devcard.yaml`. All commands read from and write to this path.

Required fields: `name`, `title`, `bio`, `stack` (at least one category), and `links.github`.

```yaml
schema_version: "1"
name: "Your Name"
title: "Your Title"
bio: "One-line description"

stack:
  frontend: [React, TypeScript]
  backend: [Python, FastAPI]

links:
  github: "https://github.com/you"
```

AI-generated fields (`archetype`, `dna`, `next_project`) are created by `/devcard:init` and refreshed with `/devcard:update`. The `claude` section is added by `/devcard:stats`.

Full schema reference: [`plugins/devcard/ref/devcard-format.md`](plugins/devcard/ref/devcard-format.md)

## Rendering

Three output formats, all zero-dependency:

- **Web viewer** - interactive HTML with chat, collapsible sections, and Claude Code disclosures
- **Terminal** - ANSI-colored ASCII art with block-character heatmap
- **SVG** - embeddable card for READMEs and social sharing

## Community registry

```
/devcard:publish           # submit your card to the registry
/devcard:unpublish         # remove your card from the registry
/devcard:view @username    # view someone else's card
```

Published cards get a public gallery page with social preview images at [devcard-community.github.io/registry](https://devcard-community.github.io/registry/).

## Requirements

- [Claude Code](https://claude.ai/code)
- Node.js 18+
- GitHub CLI (`gh`) for init, publish, and remote viewing

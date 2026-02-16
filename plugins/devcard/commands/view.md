---
description: "View a devcard — launches web viewer with terminal fallback"
argument-hint: "[@username | plain]"
---

# Devcard View

Do not narrate. Do not explain steps. Just render the card.

## Step 0: Resolve plugin directory

All `node` commands below use `${PLUGIN_DIR}`. Resolve it **before** running any scripts:

1. Read `~/.devcard/plugin_path`. If it exists and contains a path to a directory with a `scripts/` subdirectory, use that path as `${PLUGIN_DIR}`.
2. If the file is missing or stale, locate the plugin: find a directory containing both `.claude-plugin/plugin.json` and `scripts/serve-card.mjs`. Search `~/projects/devcard` first, then `~/devcard`, then `~/projects/` (depth 3). Use the Glob tool — do **not** run `find` across the home directory.
3. Once found, write the absolute path to `~/.devcard/plugin_path` for instant resolution in future commands.

If the plugin directory cannot be found:
```
Cannot locate the devcard plugin scripts.
Reinstall: git clone https://github.com/devcard-community/devcard.git && claude --plugin-dir ./devcard
```
And skip Steps 2-3 (still render the inline fallback from Step 4).

## Step 1: Determine mode and YAML file

- **Argument is `plain`**: set **plain mode** (terminal render only, no browser). Use `~/.devcard/devcard.yaml`.
- **No argument**: use `~/.devcard/devcard.yaml`.
- **Argument starts with `@`**: strip the `@` and fetch the remote card:

```bash
gh api -H "Accept: application/vnd.github.raw+json" "repos/devcard-community/registry/contents/cards/@{username}.yaml" > /tmp/devcard-remote.yaml
```

If the command fails (non-zero exit), inform the user: `Card not found: @{username} is not in the registry.` and stop.

Use `/tmp/devcard-remote.yaml` as the YAML file for the next steps.

## Step 2: Render the card

**IMPORTANT:** Only ONE rendering path. If plain mode, render terminal text ONLY. Otherwise, launch web viewer ONLY. Never do both.

### If plain mode — terminal render only

Run:

```bash
node "${PLUGIN_DIR}/scripts/render-card.mjs" {yaml_file} --plain > /tmp/devcard-render.txt 2>&1
```

Read `/tmp/devcard-render.txt`. If it contains a rendered card (starts with `█` characters or a blank line followed by `█`), output its ENTIRE contents inside a code block. Every line, no truncation.

If the render script fails, use the inline fallback from Step 3.

**Do not launch the web viewer.** Stop after rendering.

### Otherwise (no `plain` argument) — launch the web viewer ONLY

Skip the terminal render entirely. Do NOT run `render-card.mjs`. Only launch the web server:

Kill any existing devcard server, then start the local web server. The server opens a Chrome app window (chromeless, terminal-sized) automatically:

```bash
kill $(lsof -ti:3456) 2>/dev/null; node "${PLUGIN_DIR}/scripts/serve-card.mjs" {yaml_file} --port=3456 &
```

After the server starts, output exactly:

```
devcard → http://localhost:3456
```

Do **not** render a terminal card alongside the browser. The web viewer is the primary output.

## Step 3: Inline fallback (if scripts unavailable)

Read the YAML file. If it doesn't exist: `No devcard.yaml found at ~/.devcard/devcard.yaml. Run /devcard:init to create one.`

Render the card as a code block following this EXACT format. NO box borders. NO `╔═══╗`. NO `║` side borders.

```
<NAME in block letters — see font below>
<title> · <location>
──────────────────────────────────────────────────────────

Bio
<bio text wrapped at 58 chars>

About
<about text wrapped at 58 chars>

Stack
<Category>      <tech · tech · tech>
<Category>      <tech · tech · tech>

Interests
<interest · interest · interest>

Projects
▸ <name>  [status]
  <description>
▸ <name>  [status]
  <description>

Experience
<role> @ <company> (<period>)
  <highlight>

<private_note>

Links
<Label>         <url>
<Label>         <url>

Claude's Take
  <archetype, italic>
  <dna text, italic>

  ▍ What to Build Next
  ▍ <next_project text>

──────────────────────────────────────────────────────────
```

CRITICAL RULES for inline fallback:
- NO box borders. Open layout only. Two thin `─` dividers (after title line, at bottom).
- Developer content first: Bio, About, Stack, Interests, Projects, Experience, Links.
- Claude's Take section after Links: umbrella for all Claude analysis (archetype, DNA, next_project).
- Archetype as italic purple text (no "Claude calls you" prefix).
- DNA as italic orange text under the archetype.
- "What to Build Next" with `▍` bar prefix (different visual treatment).
- Section headers are single words: `Bio`, `About`, `Stack`, `Interests`, `Projects`, `Experience`, `Links`, then `Claude's Take`.
- Stack tech items separated by ` · ` (middle dot)
- Interests as dot-separated list (` · `) under `Interests` header
- Projects use `▸` bullet, then name, then `[status]` tag. Description indented below.
- Private note as dim text after Experience, before Links (no section header)
- Omit sections that have no data.
- Name: render each letter of the UPPERCASE name using this block font (6 lines tall):

```
A: █████╗    B: ██████╗   C:  ██████╗   D: ██████╗    E: ███████╗
  ██╔══██╗     ██╔══██╗     ██╔════╝     ██╔══██╗     ██╔════╝
  ███████║     ██████╔╝     ██║          ██║  ██║     █████╗
  ██╔══██║     ██╔══██╗     ██║          ██║  ██║     ██╔══╝
  ██║  ██║     ██████╔╝     ╚██████╗     ██████╔╝     ███████╗
  ╚═╝  ╚═╝     ╚═════╝      ╚═════╝     ╚═════╝      ╚══════╝

F: ███████╗  G:  ██████╗   H: ██╗  ██╗  I: ██╗  J:      ██╗
  ██╔════╝     ██╔════╝     ██║  ██║     ██║       ██║
  █████╗       ██║  ███╗    ███████║     ██║       ██║
  ██╔══╝       ██║   ██║    ██╔══██║     ██║  ██   ██║
  ██║          ╚██████╔╝    ██║  ██║     ██║  ╚█████╔╝
  ╚═╝           ╚═════╝     ╚═╝  ╚═╝     ╚═╝   ╚════╝

K: ██╗  ██╗  L: ██╗       M: ███╗   ███╗  N: ███╗   ██╗
  ██║ ██╔╝     ██║         ████╗ ████║     ████╗  ██║
  █████╔╝      ██║         ██╔████╔██║     ██╔██╗ ██║
  ██╔═██╗      ██║         ██║╚██╔╝██║     ██║╚██╗██║
  ██║  ██╗     ███████╗    ██║ ╚═╝ ██║     ██║ ╚████║
  ╚═╝  ╚═╝     ╚══════╝    ╚═╝     ╚═╝     ╚═╝  ╚═══╝

O:  ██████╗   P: ██████╗   Q:  ██████╗   R: ██████╗
  ██╔═══██╗     ██╔══██╗     ██╔═══██╗     ██╔══██╗
  ██║   ██║     ██████╔╝     ██║   ██║     ██████╔╝
  ██║   ██║     ██╔═══╝      ██║▄▄ ██║     ██╔══██╗
  ╚██████╔╝     ██║          ╚██████╔╝     ██║  ██║
   ╚═════╝      ╚═╝           ╚══▀▀═╝      ╚═╝  ╚═╝

S: ███████╗  T: ████████╗  U: ██╗   ██╗  V: ██╗   ██╗
  ██╔════╝     ╚══██╔══╝     ██║   ██║     ██║   ██║
  ███████╗        ██║        ██║   ██║     ██║   ██║
  ╚════██║        ██║        ██║   ██║     ╚██╗ ██╔╝
  ███████║        ██║        ╚██████╔╝      ╚████╔╝
  ╚══════╝        ╚═╝         ╚═════╝        ╚═══╝

W: ██╗    ██╗  X: ██╗  ██╗  Y: ██╗   ██╗  Z: ███████╗
  ██║    ██║     ╚██╗██╔╝     ╚██╗ ██╔╝     ╚══███╔╝
  ██║ █╗ ██║      ╚███╔╝       ╚████╔╝        ███╔╝
  ██║███╗██║      ██╔██╗        ╚██╔╝        ███╔╝
  ╚███╔███╔╝     ██╔╝ ██╗       ██║        ███████╗
   ╚══╝╚══╝      ╚═╝  ╚═╝       ╚═╝        ╚══════╝

(space): 3 chars wide, 6 lines tall
```

If the full name is wider than ~50 chars in block letters, render first name and last name on separate lines.

## Remote cards (argument starts with @)

After rendering a remote card, enter chat mode. Read `${PLUGIN_DIR}/ref/devcard-chat.md` for chat mode rules and boundaries.

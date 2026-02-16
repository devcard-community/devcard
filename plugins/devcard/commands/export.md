---
description: "Generate a shareable SVG image from your devcard"
---

# Devcard Export

Generate a shareable SVG image from `devcard.yaml` for embedding in GitHub READMEs, social media, and portfolios.

## Step 0: Resolve plugin directory

The export script uses `${PLUGIN_DIR}`. Resolve it **before** running:

1. Read `~/.devcard/plugin_path`. If it exists and contains a path to a directory with a `scripts/` subdirectory, use that path as `${PLUGIN_DIR}`.
2. If the file is missing or stale, locate the plugin: find a directory containing both `.claude-plugin/plugin.json` and `scripts/export-card.mjs`. Search `~/projects/devcard` first, then `~/devcard`, then `~/projects/` (depth 3). Use the Glob tool — do **not** run `find` across the home directory.
3. Once found, write the absolute path to `~/.devcard/plugin_path` for instant resolution in future commands.

If the plugin directory cannot be found:
```
Cannot locate the devcard plugin scripts.
Reinstall: git clone https://github.com/devcard-community/devcard.git && claude --plugin-dir ./devcard
```
And stop.

## Step 1: Check for devcard.yaml

Check if `~/.devcard/devcard.yaml` exists.

If it does NOT exist:
```
No devcard.yaml found at ~/.devcard/devcard.yaml
Run /devcard:init to create one.
```
And stop.

## Step 2: Generate SVG

Run the export script:

```bash
cat ~/.devcard/devcard.yaml | node ${PLUGIN_DIR}/scripts/export-card.mjs devcard.svg
```

## Step 3: Confirm and suggest usage

If export succeeds, display:

```
Exported devcard.svg

Add it to your GitHub README:

  ![devcard](./devcard.svg)

Or embed it in any markdown:

  <img src="./devcard.svg" alt="devcard" width="600" />
```

If the script fails, inform the user of the error and suggest checking that their `devcard.yaml` is valid.

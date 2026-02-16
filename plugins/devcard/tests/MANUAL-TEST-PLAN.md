# Devcard Manual Test Plan

**Version:** 1.0
**Last updated:** 2026-02-12
**Scope:** End-to-end QA for all 6 slash commands + registry CI/CD + cross-cutting concerns

## How to Use This Plan

Each test case follows this format:

- **ID**: Unique identifier (section prefix + number)
- **Title**: What the test verifies
- **Preconditions**: State required before starting
- **Steps**: Numbered actions to perform
- **Expected**: What should happen at each step
- **Pass/Fail**: `[ ]` checkbox to mark result

Run tests in lifecycle order: INIT -> STATS -> VIEW -> EXPORT -> UPDATE -> PUBLISH.

### Environment Requirements

- macOS or Linux with Node.js 18+
- Claude Code CLI installed and configured
- GitHub CLI (`gh`) installed and authenticated
- Devcard plugin loaded: `claude --plugin-dir /path/to/devcard`
- A GitHub account with public repos (for auto-generate tests)

### Cleanup Between Tests

Unless stated otherwise, back up and remove `~/.devcard/` before each INIT test:

```bash
mv ~/.devcard ~/.devcard-backup-$(date +%s) 2>/dev/null
```

Restore afterward if needed:

```bash
rm -rf ~/.devcard && mv ~/.devcard-backup-* ~/.devcard
```

---

## 1. INIT -- Card Creation

### INIT-01: Quick Mode happy path (GitHub auto-generate)

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist
- `gh auth status` succeeds
- You know a valid GitHub username with 5+ public repos

**Steps:**
1. Run `/devcard:init <your-github-username>`
2. When prompted "is this your GitHub username?", select "Yes, that's me"
3. Wait for GitHub data fetch and draft generation
4. Review the displayed YAML draft
5. When prompted "Would you like to edit anything?", select "Looks good, save it"
6. When prompted about adding links, select "Skip"
7. If prompted about Claude Code fingerprint, select "Skip for now"

**Expected:**
- [ ] Step 2: confirmation prompt appears with correct username
- [ ] Step 3: no errors during fetch; profile, repos, and starred data pulled
- [ ] Step 4: YAML contains: `name`, `title`, `bio`, `about`, `stack` (with categorized languages), `projects` (top 5 by stars), `links.github`, `archetype`, `dna`, `next_project`
- [ ] Step 4: `dna` is third-person, under 300 chars, reads like a critic's review (not a LinkedIn summary)
- [ ] Step 4: `next_project` uses third-person gender-neutral language
- [ ] Step 4: `interests` present if starred repos were fetched (4-7 themes)
- [ ] Step 5: file written to `~/.devcard/devcard.yaml`
- [ ] Step 5: `~/.devcard/plugin_path` file created with absolute path to plugin directory
- [ ] Step 5: YAML contains `schema_version: "1"`, `created_at`, `updated_at` set to today
- [ ] Step 7: confirmation message shows next steps including `/devcard:stats`

---

### INIT-02: Quick Mode with name-like argument triggers search

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:init John Smith` (or any name-like input with spaces)
2. Observe the GitHub user search results
3. Select one of the suggested GitHub usernames (or "None of these")

**Expected:**
- [ ] Step 1: Claude recognizes the input as a name, not a username
- [ ] Step 2: prompt says "That looks like a name. Did you mean one of these GitHub accounts?" with up to 3 matches from `gh api search/users`
- [ ] Step 2: each option shows login as label, display name + github.com link as description
- [ ] Step 2: final option is "None of these"
- [ ] Step 3 (if match selected): proceeds to Quick Mode with that username
- [ ] Step 3 (if "None of these"): asks for username manually with "Build manually instead" escape option

---

### INIT-03: Quick Mode with wrong username correction

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:init someinvaliduser12345`
2. When prompted "is this your GitHub username?", select "No, wrong username"
3. Enter the correct username when prompted
4. Confirm the corrected username
5. Continue through Quick Mode to completion

**Expected:**
- [ ] Step 2: re-prompts for the correct username
- [ ] Step 3: re-confirms with the new username
- [ ] Step 4: proceeds with fetching data for the corrected username
- [ ] Step 5: card generated successfully with corrected username's data

---

### INIT-04: Quick Mode with `gh` not installed or not authenticated

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist
- Either `gh` is not installed, or run `gh auth logout` first

**Steps:**
1. Run `/devcard:init validusername`
2. Confirm the username when prompted

**Expected:**
- [ ] Step 2: error message appears with exact text:
  ```
  GitHub CLI (gh) is required for auto-generate mode.
  Install: https://cli.github.com
  Auth:    gh auth login

  Alternatively, use /devcard:init manual to build your card interactively.
  ```
- [ ] No file created at `~/.devcard/devcard.yaml`
- [ ] Process stops cleanly (no crash, no partial file)

**Cleanup:** Re-authenticate with `gh auth login` if you logged out.

---

### INIT-05: Quick Mode links follow-up

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:init <your-github-username>`
2. Complete Quick Mode through draft approval ("Looks good, save it")
3. At the links follow-up, select "Add Twitter/X" and "Add email" (multi-select)
4. Enter a Twitter handle when prompted
5. Enter an email address when prompted
6. Complete remaining steps

**Expected:**
- [ ] Step 3: multi-select prompt appears with options: Add Twitter/X, Add LinkedIn, Add email, Skip
- [ ] Step 3: multiple options can be selected simultaneously
- [ ] Step 4: prompted for Twitter/X handle specifically
- [ ] Step 5: prompted for email specifically
- [ ] After save: `links` section in YAML contains `github`, `twitter` (or `x`), and `email` entries
- [ ] Links follow-up only appears if `links` only had `github` (and optionally `website`)

---

### INIT-06: Quick Mode with Claude Code fingerprint opt-in

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist
- `~/.claude/stats-cache.json` EXISTS with 5+ sessions
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:init <your-github-username>`
2. Complete Quick Mode through links step
3. When prompted about Claude Code fingerprint, select "Yes, add it"
4. Confirm timezone if prompted
5. Review the `claude:` section shown
6. Select "Looks good, add it"

**Expected:**
- [ ] Step 3: fingerprint prompt appears because stats-cache.json exists
- [ ] Step 4: timezone detection prompt shows correct system timezone
- [ ] Step 5: displayed `claude:` section contains: `since`, `sessions`, `messages`, `model`, `style`, `style_description`, `rhythm`, `peak_hours`, `hour_distribution`
- [ ] Step 5: `style` is a 1-3 word specific label (not generic)
- [ ] Step 5: `style_description` references actual numbers, under 200 chars
- [ ] Step 5: privacy notice displayed about behavioral patterns being visible
- [ ] Step 6: `claude:` section present in saved `~/.devcard/devcard.yaml`
- [ ] Final confirmation shows next steps WITHOUT `/devcard:stats` (since stats were added)

---

### INIT-07: Quick Mode with Claude Code fingerprint skip (no stats-cache)

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist
- `~/.claude/stats-cache.json` does NOT exist (rename it temporarily)
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:init <your-github-username>`
2. Complete Quick Mode through links step
3. Observe what happens after links

**Expected:**
- [ ] Step 3: NO prompt about Claude Code fingerprint appears
- [ ] Proceeds directly to completion message
- [ ] Final confirmation includes `/devcard:stats` in next steps (since stats were not added)
- [ ] No `claude:` section in saved YAML

**Cleanup:** Restore `~/.claude/stats-cache.json` if renamed.

---

### INIT-08: Manual Mode full walkthrough

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:init manual`
2. Enter name when prompted (e.g., "Jane Developer")
3. Enter title when prompted (e.g., "Full-Stack Engineer")
4. Enter bio when prompted
5. Enter tech stack as comma-separated list (e.g., "TypeScript, React, Python, FastAPI, PostgreSQL, Docker")
6. Enter GitHub profile URL
7. At optional fields prompt, multi-select: "Add location", "Add about section", "Generate DNA, Archetype & Insights", "Add interests"
8. Enter location
9. Enter about section (2-4 sentences)
10. Review generated DNA/archetype/insights
11. Enter interests (comma-separated)
12. Handle Claude Code fingerprint step (skip or add)

**Expected:**
- [ ] Step 1: goes directly to Manual Mode (no GitHub API calls)
- [ ] Steps 2-6: each field prompted individually via AskUserQuestion
- [ ] Step 6: GitHub URL accepted as a link
- [ ] Step 7: multi-select prompt with all optional sections listed
- [ ] Step 7: "Generate DNA, Archetype & Insights" is among the options
- [ ] Step 10: archetype, dna, next_project generated from the manually-entered data
- [ ] Step 10: all AI-generated fields follow third-person, gender-neutral voice rules
- [ ] After save: YAML at `~/.devcard/devcard.yaml` contains all entered fields
- [ ] `schema_version: "1"` present
- [ ] `created_at` and `updated_at` set to today
- [ ] `~/.devcard/plugin_path` written
- [ ] Stack technologies are categorized (e.g., TypeScript/React under `frontend`, Python/FastAPI under `backend`)

---

### INIT-09: Manual Mode minimal card (required fields only)

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:init manual`
2. Enter name, title, bio, stack, and GitHub URL (required fields)
3. At optional fields prompt, select "Skip -- save what we have"
4. Handle Claude Code fingerprint step (skip)

**Expected:**
- [ ] Step 3: proceeds directly to save without asking for optional fields
- [ ] Saved YAML contains only: `schema_version`, `name`, `title`, `bio`, `stack`, `links.github`, `created_at`, `updated_at`
- [ ] No `about`, `archetype`, `dna`, `projects`, `experience`, `interests` sections
- [ ] File is valid YAML (parseable without errors)

---

### INIT-10: No argument provided (mode selection)

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:init` (no argument)
2. Observe the mode selection prompt
3. Select "Auto-generate from GitHub"
4. Enter a GitHub username when prompted

**Expected:**
- [ ] Step 2: AskUserQuestion with "How would you like to create your devcard?"
- [ ] Step 2: options are "Auto-generate from GitHub" and "Build manually"
- [ ] Step 3: follow-up asks for GitHub username with "I'm not sure" escape option
- [ ] Step 4: proceeds to Quick Mode with entered username

---

### INIT-11: Re-init when devcard.yaml already exists

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS (from a previous init)

**Steps:**
1. Note the current contents of `~/.devcard/devcard.yaml`
2. Run `/devcard:init <github-username>`
3. Complete the init flow
4. Compare the new file to the original

**Expected:**
- [ ] Init proceeds normally (does not block on existing file)
- [ ] The new YAML overwrites the old one
- [ ] `created_at` is set to today's date (new card, not an update)
- [ ] All fields are freshly generated (not merged with old data)

---

## 2. STATS -- Claude Code Fingerprint

### STATS-01: Happy path (stats-cache exists, 5+ sessions)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.claude/stats-cache.json` EXISTS with `totalSessions >= 5`

**Steps:**
1. Run `/devcard:stats`
2. Observe the metrics extraction output
3. Confirm timezone when prompted ("Yes, that's correct")
4. Review the `claude:` section presented
5. Select "Looks good, add it"

**Expected:**
- [ ] Step 2: no extraction errors; metrics computed silently
- [ ] Step 3: system timezone detected and displayed (e.g., "Asia/Jerusalem")
- [ ] Step 4: `claude:` section shown with all fields: `since`, `sessions`, `messages`, `model`, `style`, `style_description`, `rhythm`, `peak_hours`, `hour_distribution`
- [ ] Step 4: `since` matches `firstSessionDate` from stats-cache
- [ ] Step 4: `sessions` and `messages` are positive integers matching stats-cache
- [ ] Step 4: `model` is a family name (e.g., "opus", "sonnet", "haiku"), not a full model ID
- [ ] Step 4: `hour_distribution` is a 24-element array of non-negative integers
- [ ] Step 4: `peak_hours` is a sorted array of 1-3 hour values
- [ ] Step 4: `rhythm` matches peak hour distribution (Morning Builder / Afternoon Sprinter / Night Owl / Late Night Hacker / All-Day Coder)
- [ ] Step 4: privacy notice appears about behavioral patterns
- [ ] Step 5: `claude:` section merged into devcard.yaml
- [ ] Step 5: `updated_at` changed to today
- [ ] Step 5: all other fields in devcard.yaml preserved unchanged
- [ ] Confirmation shows `/devcard:view` and `/devcard:update` as next steps

---

### STATS-02: Low session count warning (<5 sessions)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.claude/stats-cache.json` EXISTS with `totalSessions < 5` (edit the file temporarily)

**Steps:**
1. Run `/devcard:stats`
2. Observe the low-data warning
3. Select "Proceed anyway"
4. Complete the remaining steps

**Expected:**
- [ ] Step 2: warning says "You have only N sessions recorded. The fingerprint may not be representative yet."
- [ ] Step 2: options are "Proceed anyway" and "Cancel"
- [ ] Step 3: continues to timezone check and label generation
- [ ] Step 4: `claude:` section generated despite low data

**Variant:** Repeat step 3 selecting "Cancel" instead.
- [ ] Process stops cleanly with no changes to devcard.yaml

---

### STATS-03: Stale stats warning (7+ days old)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.claude/stats-cache.json` EXISTS with `lastComputedDate` older than 7 days

**Steps:**
1. Run `/devcard:stats`
2. Observe staleness notice

**Expected:**
- [ ] Step 2: informational message: "Note: Your Claude Code stats were last updated on {date}. The fingerprint will reflect data up to that date."
- [ ] Process continues normally (staleness is informational, not blocking)
- [ ] Generated data reflects the stale stats (not current activity)

---

### STATS-04: Timezone confirmation and offset adjustment

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.claude/stats-cache.json` EXISTS with 5+ sessions

**Steps:**
1. Run `/devcard:stats`
2. When asked about timezone, select "No, different timezone"
3. Specify a timezone with a different UTC offset (e.g., "America/New_York" if you are in Asia)
4. Review the generated `claude:` section

**Expected:**
- [ ] Step 2: follow-up asks which timezone you use
- [ ] Step 3: the `hour_distribution` array is shifted by the offset between the two timezones
- [ ] Step 3: `peak_hours` reflect the shifted hours
- [ ] Step 4: `rhythm` label is recalculated based on shifted hour distribution
- [ ] If original peak was hour 14 in UTC+3 and you selected UTC-5, the peak shifts to hour 6

---

### STATS-05: Missing stats-cache.json

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.claude/stats-cache.json` does NOT exist

**Steps:**
1. Run `/devcard:stats`

**Expected:**
- [ ] Error message:
  ```
  No Claude Code usage data found at ~/.claude/stats-cache.json.
  This file is generated automatically by Claude Code after a few sessions.
  ```
- [ ] Process stops cleanly
- [ ] No changes to devcard.yaml

---

### STATS-06: Missing devcard.yaml

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:stats`

**Expected:**
- [ ] Error message:
  ```
  No devcard.yaml found at ~/.devcard/devcard.yaml
  Run /devcard:init to create one.
  ```
- [ ] Process stops immediately

---

## 3. VIEW -- Card Viewing

### VIEW-01: Local card with web viewer (default)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with complete data
- Port 3456 is free (`lsof -ti:3456` returns nothing)
- Plugin directory is accessible

**Steps:**
1. Run `/devcard:view`
2. Observe terminal output
3. Check if a browser window opens

**Expected:**
- [ ] Step 1: any existing server on port 3456 is killed first
- [ ] Step 2: output is ONLY `devcard -> http://localhost:3456` (no terminal card)
- [ ] Step 2: NO plain-text card rendered inline -- browser is the primary output
- [ ] Step 3: Chrome app window opens (chromeless, terminal-sized) showing the card
- [ ] Web viewer shows: name, title, location, bio, about, stack, projects, links, Claude's Take section
- [ ] Web viewer heatmap renders if `claude.hour_distribution` or `claude.heatmap` exists

---

### VIEW-02: Local card with terminal plain-text (explicit `plain` argument)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with complete data
- Plugin directory is accessible

**Steps:**
1. Run `/devcard:view plain`
2. Examine the terminal output carefully
3. Confirm NO browser window opens

**Expected:**
- [ ] Step 2: terminal output is a complete card inside a code block
- [ ] Name rendered in block letters (6 lines tall, using `█ ╔ ╗ ║ ╚ ╝ ═` characters)
- [ ] Title and location on the line below name, separated by ` . `
- [ ] Thin `─` divider after title line
- [ ] Sections appear in order: Bio, About, Stack, Interests, Projects, Experience, Links, Claude's Take
- [ ] Stack items separated by ` . ` (middle dot)
- [ ] Projects use `▸` bullet, name, `[status]` tag, description indented below
- [ ] Claude's Take section contains: archetype, dna, "What to Build Next"
- [ ] "What to Build Next" uses `▍` bar prefix
- [ ] Second thin `─` divider at bottom
- [ ] NO box borders (`╔═══╗`, `║` side borders)
- [ ] Sections with no data are omitted (not shown as empty headers)
- [ ] Step 3: NO browser window opened -- terminal only

---

### VIEW-03: Local card inline fallback (plugin not found)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.devcard/plugin_path` points to a nonexistent directory (edit it to an invalid path)

**Steps:**
1. Run `/devcard:view`
2. Observe the output

**Expected:**
- [ ] Warning about plugin scripts not found
- [ ] Card still renders inline as a formatted code block (the fallback format)
- [ ] All sections from the YAML are displayed
- [ ] No crash or unhandled error

**Cleanup:** Restore `~/.devcard/plugin_path` to the correct path.

---

### VIEW-04: Remote card (`@username` from registry)

**Preconditions:**
- A card exists in the registry for a known username (e.g., `@shayse`)
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:view @shayse` (or a username known to be in the registry)
2. Observe the output
3. Try interacting in chat mode after the card renders

**Expected:**
- [ ] Step 1: fetches card from `devcard-community/registry` repo via `gh api`
- [ ] Step 2: card renders (web viewer + terminal fallback) using the remote YAML
- [ ] Step 2: remote card data matches what is in the registry `cards/@shayse.yaml`
- [ ] Step 3: chat mode activates after rendering (per `devcard-chat.md` rules)
- [ ] Remote YAML is saved to `/tmp/devcard-remote.yaml` during the process

---

### VIEW-05: Remote card with nonexistent username

**Preconditions:**
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:view @nonexistent_user_12345`

**Expected:**
- [ ] Error message: `Card not found: @nonexistent_user_12345 is not in the registry.`
- [ ] Process stops cleanly
- [ ] No crash or unhandled exception

---

### VIEW-06: No devcard.yaml exists (local view)

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:view` (no argument)

**Expected:**
- [ ] Error message:
  ```
  No devcard.yaml found at ~/.devcard/devcard.yaml. Run /devcard:init to create one.
  ```
- [ ] Process stops cleanly

---

### VIEW-07: Plugin directory resolution via cached path

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.devcard/plugin_path` EXISTS with correct path

**Steps:**
1. Run `/devcard:view`
2. Observe whether plugin resolution is instant or requires searching

**Expected:**
- [ ] Plugin path read from `~/.devcard/plugin_path` without filesystem search
- [ ] No Glob calls to locate the plugin directory
- [ ] Card renders normally

**Variant:** Delete `~/.devcard/plugin_path` and run again.
- [ ] Plugin found by searching: `~/projects/devcard` first, then `~/devcard`, then `~/projects/` (depth 3)
- [ ] `~/.devcard/plugin_path` recreated with the found path

---

## 4. EXPORT -- SVG Generation

### EXPORT-01: Happy path SVG generation

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with complete data
- Plugin directory is accessible
- No `devcard.svg` in current working directory (or it will be overwritten)

**Steps:**
1. Run `/devcard:export`
2. Check for the SVG file in the current directory
3. Open `devcard.svg` in a browser or SVG viewer

**Expected:**
- [ ] Step 1: no errors during export
- [ ] Step 2: `devcard.svg` file created in current working directory
- [ ] Step 2: file is valid SVG (starts with `<svg` or `<?xml`)
- [ ] Step 3: SVG renders visually with: name, title, bio, stack, projects, links
- [ ] Step 3: if `claude.hour_distribution` exists, heatmap renders as 24 colored characters
- [ ] Step 3: archetype appears in card header (not in Claude's Take section)
- [ ] Confirmation message includes markdown embed snippets:
  ```
  ![devcard](./devcard.svg)
  ```
  and
  ```
  <img src="./devcard.svg" alt="devcard" width="600" />
  ```

---

### EXPORT-02: Plugin directory resolution

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `~/.devcard/plugin_path` EXISTS

**Steps:**
1. Run `/devcard:export`
2. Verify the export uses the cached plugin path

**Expected:**
- [ ] Plugin path resolved from `~/.devcard/plugin_path`
- [ ] `export-card.mjs` executed from the correct plugin directory
- [ ] SVG generated successfully

**Variant:** Delete `~/.devcard/plugin_path`, run again.
- [ ] Plugin found via search, `plugin_path` recreated, export succeeds

---

### EXPORT-03: No devcard.yaml exists

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:export`

**Expected:**
- [ ] Error message:
  ```
  No devcard.yaml found at ~/.devcard/devcard.yaml
  Run /devcard:init to create one.
  ```
- [ ] Process stops cleanly
- [ ] No SVG file created

---

### EXPORT-04: SVG content validation

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with: name, title, bio, stack (2+ categories), projects (2+ items), links, claude section with hour_distribution, archetype, dna

**Steps:**
1. Run `/devcard:export`
2. Open `devcard.svg` in a text editor
3. Search for key content

**Expected:**
- [ ] SVG contains the developer's name
- [ ] SVG contains stack categories and technologies
- [ ] SVG contains project names
- [ ] SVG contains the archetype text
- [ ] SVG contains heatmap visualization (24 characters using block elements)
- [ ] SVG contains link URLs
- [ ] No raw HTML entities visible in rendered output (proper escaping)
- [ ] Special characters in bio/about are escaped (no raw `<`, `>`, `&`)

---

## 5. UPDATE -- Card Modification

### UPDATE-01: Refresh GitHub data (apply all)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with `links.github` set to a valid GitHub profile
- `gh auth status` succeeds
- Some time has passed since init (or GitHub profile has changed)

**Steps:**
1. Run `/devcard:update refresh`
2. Wait for GitHub data fetch (should be silent -- no raw API output)
3. Review the diff summary
4. Select "Apply all"

**Expected:**
- [ ] Step 2: no raw API responses shown in terminal
- [ ] Step 2: no narration of which APIs are being called
- [ ] Step 3: diff shown in the specified format:
  ```
  GitHub refresh -- N field(s) changed:
    stack
      + added: ...
    projects
      - updated: ... (new description)
      + added: ...
  ```
- [ ] Step 3: only changed fields shown (unchanged fields omitted)
- [ ] Step 3: stack shows only additions and removals (not full list)
- [ ] Step 3: projects shows only added/updated/reordered (not full list)
- [ ] Step 4: all changes applied to devcard.yaml
- [ ] Step 4: `updated_at` set to today
- [ ] Step 4: `created_at` and `schema_version` preserved exactly
- [ ] Confirmation lists changed field names

**Variant:** If nothing changed:
- [ ] Message: "GitHub data is already up to date -- no changes needed."
- [ ] No file modifications

---

### UPDATE-02: Refresh GitHub data (pick individual changes)

**Preconditions:**
- Same as UPDATE-01, with changes available

**Steps:**
1. Run `/devcard:update refresh`
2. Review the diff summary
3. Select "Let me pick"
4. Accept some changes, reject others

**Expected:**
- [ ] Step 3: each changed field presented individually via AskUserQuestion
- [ ] Step 4: only accepted changes applied to YAML
- [ ] Rejected fields remain at their previous values
- [ ] `updated_at` still updated to today (since some changes were applied)

---

### UPDATE-03: Edit Fields -- Identity group

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS

**Steps:**
1. Run `/devcard:update edit`
2. Select "Identity" (name, title, location, bio)
3. For name: select "Keep as-is"
4. For title: enter a new value via "Other"
5. For location: enter a new value
6. For bio: select "Keep as-is"

**Expected:**
- [ ] Step 2: field group selection with Identity, Content, Career options (multi-select)
- [ ] Step 3: current name value displayed, "Keep as-is" option available
- [ ] Step 4: current title shown, new value accepted via text input
- [ ] Step 5: location prompt shows current value (or "not set" if empty)
- [ ] Step 6: bio unchanged
- [ ] After save: only title and location changed in YAML
- [ ] Name and bio retain original values
- [ ] `updated_at` set to today

---

### UPDATE-04: Edit Fields -- Content group

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with stack, about, interests, and projects

**Steps:**
1. Run `/devcard:update edit`
2. Select "Content" (about, interests, stack, projects)
3. For stack: select "Add technologies", enter "Rust, Zig"
4. For about: enter a new about section
5. For interests: select "Add interests", enter "WebAssembly, Edge Computing"
6. For projects: select "Add a project", enter name/description/status/tags

**Expected:**
- [ ] Step 3: current stack displayed in categorized format
- [ ] Step 3: new technologies categorized automatically (Rust -> systems, Zig -> systems)
- [ ] Step 3: existing stack items preserved (merge, not replace)
- [ ] Step 4: current about shown, new value replaces it
- [ ] Step 5: current interests listed, new interests added (not replacing)
- [ ] Step 5: total interests capped at reasonable count
- [ ] Step 6: new project added with all required fields (name, description, status, tags)
- [ ] After save: all changes reflected, existing data not lost

---

### UPDATE-05: Refresh Claude Insights

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with archetype, dna, next_project

**Steps:**
1. Run `/devcard:update insights`
2. Review old vs new comparisons for each insight field
3. Select "Accept all new"

**Expected:**
- [ ] Step 2: each field shown with old and new values:
  ```
  archetype:
    old: "The Visualizer"
    new: "The Architect"
  ```
- [ ] Step 2: all 3 insight fields compared (archetype, dna, next_project)
- [ ] Step 2: new values follow the same rules as init (third-person, gender-neutral, dna under 300 chars)
- [ ] Step 3: all insight fields replaced with new versions
- [ ] `updated_at` set to today

**Variant:** Select "Pick individually" and choose a mix of old/new.
- [ ] Each field prompted individually with truncated previews
- [ ] Only selected "New" fields are updated; "Original" fields stay unchanged

---

### UPDATE-06: Multiple modes selected at once

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with `links.github` set
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:update` (no argument)
2. Multi-select: "Refresh GitHub data" AND "Refresh Claude insights"
3. Complete both flows

**Expected:**
- [ ] Step 2: multi-select prompt allows choosing multiple modes
- [ ] Modes execute sequentially: GitHub refresh first, then Claude insights
- [ ] Claude insights regeneration uses the updated data from GitHub refresh
- [ ] Single save at the end with all changes from both modes
- [ ] `updated_at` set to today once
- [ ] Confirmation lists all changed fields from both modes

---

### UPDATE-07: No devcard.yaml exists

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:update`

**Expected:**
- [ ] Error message:
  ```
  No devcard.yaml found at ~/.devcard/devcard.yaml
  Run /devcard:init to create one.
  ```
- [ ] Process stops immediately

---

## 6. PUBLISH -- Community Publishing

### PUBLISH-01: Happy path (fork + PR workflow)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS with valid data (passes schema validation)
- `links.github` is set to your actual GitHub profile
- `gh auth status` succeeds
- You have NOT previously published (no existing PR)

**Steps:**
1. Run `/devcard:publish`
2. Wait for preflight checks (auth, schema validation)
3. Wait for fork + branch + PR creation

**Expected:**
- [ ] Step 2: no validation errors (card is schema-valid)
- [ ] Step 2: GitHub username extracted from `links.github`
- [ ] Step 3: registry repo forked (or fork already exists)
- [ ] Step 3: branch `devcard/{username}` created
- [ ] Step 3: card copied to `cards/@{username}.yaml` in the fork
- [ ] Step 3: commit message is "Add @{username} devcard"
- [ ] Step 3: PR opened against the registry with title "Add @{username} devcard"
- [ ] Confirmation shows PR URL
- [ ] Confirmation includes: "Once merged, anyone can view your card with: /devcard:view @{username}"

---

### PUBLISH-02: GitHub CLI not authenticated

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS
- `gh` is not authenticated (`gh auth logout`)

**Steps:**
1. Run `/devcard:publish`

**Expected:**
- [ ] Error message:
  ```
  GitHub CLI not authenticated. Run:
    gh auth login
  ```
- [ ] Process stops cleanly
- [ ] No fork or PR created

**Cleanup:** Re-authenticate with `gh auth login`.

---

### PUBLISH-03: Invalid card (schema validation failure)

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS but is intentionally invalid:
  - Remove the `name` field, or
  - Set `links.github` to a non-https URL, or
  - Add a `<script>` tag in `bio`
- `gh auth status` succeeds

**Steps:**
1. Run `/devcard:publish`
2. Observe validation output

**Expected:**
- [ ] Step 2: specific validation errors listed (e.g., "name is required", "links.github must start with https://", "dangerous content detected in bio")
- [ ] Process stops before any GitHub operations (no fork, no PR)
- [ ] Message instructs user to fix the issues

**Cleanup:** Restore valid devcard.yaml.

---

### PUBLISH-04: No devcard.yaml exists

**Preconditions:**
- `~/.devcard/devcard.yaml` does NOT exist

**Steps:**
1. Run `/devcard:publish`

**Expected:**
- [ ] Error message:
  ```
  No devcard.yaml found at ~/.devcard/devcard.yaml
  Run /devcard:init to create one.
  ```
- [ ] Process stops immediately

---

### PUBLISH-05: Registry repo does not exist

**Preconditions:**
- `~/.devcard/devcard.yaml` EXISTS and valid
- `gh auth status` succeeds
- Set `DEVCARD_REGISTRY` to a nonexistent repo: `export DEVCARD_REGISTRY="nonexistent-org/nonexistent-repo"`

**Steps:**
1. Run `/devcard:publish`

**Expected:**
- [ ] Error message about registry not existing, with setup instructions:
  ```
  The community registry (nonexistent-org/nonexistent-repo) doesn't exist yet.

  To set up a registry:
    1. Create a GitHub org and repo matching the registry path
    2. Add a cards/ directory
    3. Run /devcard:publish again

  Or set DEVCARD_REGISTRY to a different repo (e.g., "myorg/devcard-registry").
  ```
- [ ] Process stops cleanly

**Cleanup:** `unset DEVCARD_REGISTRY`

---

### PUBLISH-06: Re-publish (update existing card)

**Preconditions:**
- A previous PR was merged for your username
- `~/.devcard/devcard.yaml` has been updated since the last publish

**Steps:**
1. Run `/devcard:publish`
2. Complete the flow

**Expected:**
- [ ] Fork already exists (no new fork created)
- [ ] New branch created (or existing branch updated)
- [ ] Card content in PR reflects the updated YAML
- [ ] PR title/body indicate this is an update
- [ ] PR URL displayed

---

## 7. REGISTRY CI/CD

> These tests require access to the registry GitHub repo and the ability to create test PRs.
> They verify the automated pipeline, not the plugin itself.

### CICD-01: PR validation -- valid card auto-merges

**Preconditions:**
- Write access to a test registry (or fork of `devcard-community/registry`)
- A valid YAML card file conforming to the schema
- GitHub Actions enabled on the repo

**Steps:**
1. Create a PR that adds a single file: `cards/@testuser.yaml` with valid content
2. Wait for the `validate-pr.yml` workflow to run
3. Observe the PR status

**Expected:**
- [ ] Step 2: workflow triggers on the PR (targets `cards/**`)
- [ ] Step 2: `node site/validate.mjs` runs against the card
- [ ] Step 3: validation passes (no schema errors)
- [ ] Step 3: PR is auto-approved (since only `cards/` was modified)
- [ ] Step 3: PR is auto-merged
- [ ] No manual review required

---

### CICD-02: PR validation -- invalid card gets review comment

**Preconditions:**
- Same as CICD-01

**Steps:**
1. Create a PR with `cards/@baduser.yaml` containing:
   - Missing `name` field
   - `bio` exceeding 500 characters
   - `links.github` set to `http://` (not `https://`)
2. Wait for the `validate-pr.yml` workflow

**Expected:**
- [ ] Workflow runs and detects validation errors
- [ ] PR receives a comment listing specific validation failures
- [ ] PR is NOT auto-merged
- [ ] PR is flagged for manual review

---

### CICD-03: PR validation -- non-card files require manual review

**Preconditions:**
- Same as CICD-01

**Steps:**
1. Create a PR that modifies a file outside `cards/` (e.g., `README.md`) in addition to a card

**Expected:**
- [ ] Workflow detects non-card file modifications
- [ ] PR is NOT auto-merged even if the card is valid
- [ ] PR is flagged for manual review

---

### CICD-04: Build pipeline after merge

**Preconditions:**
- A valid card PR has been merged to main
- `build-pages.yml` workflow is enabled

**Steps:**
1. Merge a valid card PR (or observe after CICD-01 auto-merge)
2. Wait for the `build-pages.yml` workflow to complete
3. Check the `docs/` output directory (or GitHub Pages deployment)

**Expected:**
- [ ] Step 2: build workflow triggers on push to main affecting `cards/**`
- [ ] Step 2: `node site/build.mjs --full` executes
- [ ] Step 3: `docs/cards/@testuser/index.html` generated with OG meta tags
- [ ] Step 3: `docs/cards/@testuser/card.svg` generated
- [ ] Step 3: `docs/cards/@testuser/og.png` generated (1200x630 social preview)
- [ ] Step 3: `docs/cards-index.json` updated to include the new card
- [ ] Step 3: gallery SPA built via `vite build`
- [ ] GitHub Pages deployment succeeds (if configured)

---

## 8. CROSS-CUTTING CONCERNS

### CROSS-01: Heatmap rotation for night workers

**Preconditions:**
- A card with peak activity between hours 20-4 (night-worker pattern)
- Use the `night-worker-card.yaml` test fixture or create one with activity concentrated at night

**Steps:**
1. Run `/devcard:view` with the night-worker card
2. Run `/devcard:export` with the same card
3. Examine both the terminal and SVG heatmap outputs

**Expected:**
- [ ] Step 1 (terminal): heatmap shows contiguous activity block (not split at midnight)
- [ ] Step 2 (SVG): heatmap shows contiguous activity block
- [ ] Rotation algorithm shifts the 24-hour array so peak activity appears in the center
- [ ] Time axis labels reflect the rotation (e.g., start at 14:00 instead of 00:00)
- [ ] Both renderers produce consistent rotation

---

### CROSS-02: Archetype placement across all renderers

**Preconditions:**
- A card with `archetype` field set (e.g., "The Visualizer")

**Steps:**
1. Run `/devcard:view` (terminal fallback)
2. Run `/devcard:view` (web viewer)
3. Run `/devcard:export` (SVG)
4. If possible, view the card on the registry gallery (HTML)

**Expected:**
- [ ] Terminal: archetype appears in card header area (below title, above first divider or in Claude's Take header)
- [ ] Web viewer: archetype appears in card header (NOT inside the Claude's Take collapsible section)
- [ ] SVG: archetype appears in card header
- [ ] Registry HTML: archetype appears in card header (before divider, not in Claude's Take)
- [ ] In NO renderer does archetype appear as a sub-item inside the Claude's Take/Insights section body

---

### CROSS-03: Field name fallbacks (legacy field names)

**Preconditions:**
- Use the `legacy-card.yaml` test fixture (uses `messages` instead of `total_messages`, `since` instead of `active_since`, `model` instead of `primary_model`)

**Steps:**
1. Copy `legacy-card.yaml` to `~/.devcard/devcard.yaml`
2. Run `/devcard:view`
3. Run `/devcard:export`
4. Check both outputs for correct data

**Expected:**
- [ ] Step 2 (terminal): legacy field values display correctly (messages count, since date, model name)
- [ ] Step 3 (SVG): legacy field values display correctly
- [ ] No errors about missing fields
- [ ] Renderers fall back: `total_messages` -> `messages`, `active_since` -> `since`, `primary_model` -> `model`

---

### CROSS-04: XSS prevention in all outputs

**Preconditions:**
- A card with malicious content in string fields:
  ```yaml
  name: "Test <script>alert('xss')</script>"
  bio: "Hello <img onerror=alert(1) src=x>"
  about: "Visit javascript:alert(1)"
  ```

**Steps:**
1. Attempt to save this card (via init or manual edit)
2. If saved, run `/devcard:view` (terminal)
3. If saved, run `/devcard:export` (SVG)
4. If saved, attempt `/devcard:publish`

**Expected:**
- [ ] Step 1: if going through publish, schema validation catches `<script>`, `<img onerror=`, `javascript:` patterns
- [ ] Step 2 (terminal): raw `<script>` tags appear as literal text (not executed)
- [ ] Step 3 (SVG): `<script>` tags escaped as `&lt;script&gt;` in SVG source
- [ ] Step 3 (SVG): `onerror=` attribute escaped, not rendered as active HTML
- [ ] Step 4 (publish): validation rejects the card with specific XSS-related error messages listing the dangerous patterns found
- [ ] No alert dialogs or script execution in any context

---

### CROSS-05: Plugin path caching lifecycle

**Preconditions:**
- `~/.devcard/plugin_path` does NOT exist

**Steps:**
1. Run `/devcard:init <username>` (creates plugin_path as side effect)
2. Verify `~/.devcard/plugin_path` now exists
3. Read the file contents
4. Run `/devcard:view` (should use cached path)
5. Delete `~/.devcard/plugin_path`
6. Run `/devcard:view` again

**Expected:**
- [ ] Step 2: file exists after init
- [ ] Step 3: contains absolute path to the devcard plugin directory (e.g., `/Users/you/projects/devcard`)
- [ ] Step 4: view command resolves plugin instantly from cache (no filesystem search)
- [ ] Step 6: view command performs filesystem search (checks `~/projects/devcard` first)
- [ ] Step 6: `~/.devcard/plugin_path` recreated with the found path
- [ ] Both view invocations produce the same card output

---

### CROSS-06: Minimal card renders without errors

**Preconditions:**
- Use the `minimal-card.yaml` test fixture (only required fields: name, title, bio, stack, links.github)

**Steps:**
1. Copy `minimal-card.yaml` to `~/.devcard/devcard.yaml`
2. Run `/devcard:view`
3. Run `/devcard:export`

**Expected:**
- [ ] Step 2 (terminal): card renders with only populated sections (Bio, Stack, Links)
- [ ] Step 2 (terminal): no "Claude's Take" section (no archetype/dna data)
- [ ] Step 2 (terminal): no empty section headers or placeholders for missing data
- [ ] Step 3 (SVG): SVG generates without errors
- [ ] Step 3 (SVG): SVG shows only populated sections
- [ ] No crashes, no undefined/null values visible in output

---

## Summary

| Section              | Test Count | Test IDs              |
|----------------------|------------|-----------------------|
| INIT                 | 11         | INIT-01 through 11    |
| STATS                | 6          | STATS-01 through 06   |
| VIEW                 | 7          | VIEW-01 through 07    |
| EXPORT               | 4          | EXPORT-01 through 04  |
| UPDATE               | 7          | UPDATE-01 through 07  |
| PUBLISH              | 6          | PUBLISH-01 through 06 |
| Registry CI/CD       | 4          | CICD-01 through 04    |
| Cross-Cutting        | 6          | CROSS-01 through 06   |
| **Total**            | **51**     |                       |

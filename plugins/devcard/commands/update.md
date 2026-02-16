---
description: "Update your devcard — refresh GitHub data, edit fields, or re-generate Claude analysis"
argument-hint: "[refresh | edit | insights]"
---

# Devcard Update

Update specific parts of an existing `devcard.yaml` without regenerating from scratch.

**Output rules**: Do not narrate your analysis process. Do not dump raw API responses. Keep all terminal output clean and scannable — use the exact formats specified in each section.

## Step 1: Preflight

If `~/.devcard/devcard.yaml` does not exist:
```
No devcard.yaml found at ~/.devcard/devcard.yaml
Run /devcard:init to create one.
```
And stop.

Read and parse `~/.devcard/devcard.yaml`. Extract the GitHub username from the `links.github` field (e.g., `https://github.com/shayse` → `shayse`).

If `links.github` is missing or not a valid GitHub URL, note that GitHub refresh mode will be unavailable.

## Step 2: Determine update mode

Look at the argument provided:

- If the argument is `refresh` → execute **Refresh GitHub** only
- If the argument is `edit` → execute **Edit Fields** only
- If the argument is `insights` → execute **Refresh Claude Insights** only
- If no argument is provided → ask the user:

Use AskUserQuestion:
- Question: "What would you like to update?"
- Header: "Update mode"
- Options:
  - "Refresh GitHub data" (description: "Re-fetch repos, languages, stars. Updates stack, projects, repo_count, private_note")
  - "Edit fields" (description: "Change specific fields like bio, title, location, about, interests")
  - "Refresh Claude insights" (description: "Re-generate archetype, dna, next_project from current data")
- multiSelect: true

Execute selected modes sequentially in the order listed above.

---

## Refresh GitHub

If no valid GitHub username was extracted in Step 1:
```
Cannot refresh GitHub data — no valid links.github found in your devcard.yaml.
Use /devcard:update edit to set your GitHub link first.
```
And skip this mode.

### Fetch fresh data

Run:

```bash
gh api users/{username}
```

```bash
gh api "users/{username}/repos?sort=stars&per_page=30&type=owner"
```

If `gh` is not authenticated or not installed:
```
GitHub CLI (gh) is required for refresh mode.
Install: https://cli.github.com
Auth:    gh auth login
```
And skip this mode.

Check if the authenticated user matches the target username for private repo access:

```bash
gh api user --jq '.login'
```

If the authenticated login matches:

```bash
gh api "user/repos?type=private&per_page=100" --jq '.[] | .language // "Unknown"'
```

Fetch starred repos for interests:

```bash
gh api "users/{username}/starred?per_page=100" --jq '.[] | "\(.language // "") \(.topics // [] | join(","))"'
```

**Silent operation**: Do not show API responses to the user. Do not narrate which APIs you're calling or what data you received. If starred, private, or profile API calls fail for optional data, skip those updates without showing errors.

### Compute updates

Compare fresh GitHub data against the existing YAML silently. Do not output the raw API data or narrate each comparison — just compute the changes internally and present the summary in the next step.

Only update fields where new data is non-empty:

1. **stack** — Re-categorize languages from repos using the same category rules as init (frontend, backend, mobile, systems, data, devops). **Merge** with existing stack: keep manually-added techs that don't appear in GitHub data, add new techs found in repos. Never remove a tech that exists in the current card.

2. **projects** — Identify top 5 repos by stars from fresh data. For each:
   - If a project with the same `name` already exists in the card, update its `description`, `status`, and `tags` from fresh data but preserve any manually-set `link`
   - If it's a new repo not in the card, add it
   - **Preserve** any existing projects that don't match a GitHub repo (they were added manually)
   - Sort: GitHub projects by stars, then manual projects in their existing order

3. **repo_count** — Set to total public + private count (from `public_repos` on profile + private repo count if available)

4. **private_note** — Regenerate aggregate summary: "Also maintains N private projects in {top languages}". Only update if private repo data is available. Never include repo names or descriptions.

5. **location** — Update from profile only if the current value in the card is empty/missing

6. **title** — Update from profile `bio` only if the current value in the card is empty/missing

7. **interests** — If starred repo data is available, merge fresh themes with existing interests. Keep manually-added interests, add new detected themes. Cap at 8 items total.

### Show diff and confirm

Present a **concise** summary. Do not explain your reasoning or analysis process. Use this exact format — one block per changed field, blank line between fields:

```
GitHub refresh — {N} field(s) changed:

  stack
    + added: Metal, gsplat
    (no removals)

  projects
    - updated: spz-viewer (new description)
    + added: new-repo-name

  repo_count
    before: 21
    after:  23

  private_note
    before: "Also maintains 8 private projects in Python and Swift"
    after:  "Also maintains 10 private projects in Python, Swift, and Go"
```

Rules:
- For **stack**: show only additions and removals, not the full list
- For **projects**: show only what was added, updated, or reordered — not the full project list
- For **scalar fields** (repo_count, location, title, private_note): show before/after, max 80 chars each
- For **interests**: show additions and removals only
- Omit unchanged fields entirely

If nothing changed:
```
GitHub data is already up to date — no changes needed.
```
And skip to the next mode (or finish).

Use AskUserQuestion:
- Question: "Apply these GitHub data updates?"
- Header: "Confirm"
- Options:
  - "Apply all" (description: "Update all changed fields")
  - "Let me pick" (description: "Choose which changes to keep")
  - "Discard" (description: "Keep everything as-is")

If "Let me pick": for each changed field, use AskUserQuestion to accept or reject individually.

---

## Edit Fields

Use AskUserQuestion:
- Question: "Which fields do you want to edit?"
- Header: "Fields"
- Options:
  - "Identity" (description: "name, title, location, bio")
  - "Content" (description: "about, interests, stack, projects")
  - "Career" (description: "experience, links")
- multiSelect: true

### Identity fields (if selected)

Show current values for name, title, location, bio. For each field, use AskUserQuestion:
- Question: "{field} is currently: \"{current_value}\". What should it be?"
- Header: "{Field}"
- Options:
  - "Keep as-is" (description: "No change")

The user selects "Keep as-is" or types a new value via the Other option.

If a field is empty/missing, phrase it as: "{field} is not set. What should it be?"

### Content fields (if selected)

**Stack**: Show current categories and techs formatted as:
```
Current stack:
  frontend: [TypeScript, React, Next.js]
  backend: [Python, FastAPI]
```

Use AskUserQuestion:
- Question: "How would you like to update your stack?"
- Header: "Stack"
- Options:
  - "Add technologies" (description: "Add new techs to existing or new categories")
  - "Remove technologies" (description: "Remove specific techs from categories")
  - "Keep as-is" (description: "No changes to stack")

For add: ask which techs to add and which category they belong to. Create new categories as needed.
For remove: ask which techs to remove.

**About**: Show current value. Ask for new value (same pattern as identity fields).

**Interests**: Show current list. Use AskUserQuestion:
- Question: "How would you like to update your interests?"
- Header: "Interests"
- Options:
  - "Add interests" (description: "Add new topics to the list")
  - "Remove interests" (description: "Remove specific topics")
  - "Replace all" (description: "Start fresh with a new list")
  - "Keep as-is" (description: "No changes")

**Projects**: Show current projects formatted as:
```
Current projects:
  1. project-name [shipped] — description
  2. other-project [wip] — description
```

Use AskUserQuestion:
- Question: "How would you like to update your projects?"
- Header: "Projects"
- Options:
  - "Add a project" (description: "Add a new project to the list")
  - "Remove a project" (description: "Remove an existing project")
  - "Edit a project" (description: "Modify an existing project's details")
  - "Keep as-is" (description: "No changes")

For add: ask for name, description, status (shipped/wip/concept/archived), tags, and optional link.
For remove/edit: ask which project by name or number.

### Career fields (if selected)

**Experience**: Show current entries formatted as:
```
Current experience:
  1. Role @ Company (period)
     highlight
```

Use AskUserQuestion:
- Question: "How would you like to update your experience?"
- Header: "Experience"
- Options:
  - "Add a role" (description: "Add a new experience entry")
  - "Remove a role" (description: "Remove an existing entry")
  - "Edit a role" (description: "Modify an existing entry's details")
  - "Keep as-is" (description: "No changes")

For add: ask for role, company, period (YYYY-present or YYYY-YYYY), and highlight.
For remove/edit: ask which entry by number.

**Links**: Show current links formatted as:
```
Current links:
  github:   https://github.com/username
  website:  https://example.com
```

Use AskUserQuestion:
- Question: "How would you like to update your links?"
- Header: "Links"
- Options:
  - "Add a link" (description: "Add twitter, linkedin, website, or email")
  - "Change a link" (description: "Update an existing link URL")
  - "Keep as-is" (description: "No changes")

Note: `links.github` cannot be removed (it is required by the schema). Warn if the user tries to remove it.

---

## Refresh Claude Insights

Re-generate AI-driven fields using ALL current card data (including any changes applied by earlier modes in this session).

Generate fresh values for these fields using the same rules as init.md Step 3b (read `${PLUGIN_DIR}/ref/devcard-format.md` for schema reference):

- **archetype**: A developer classification. Choose from or coin new ones: "The Visualizer", "The Toolsmith", "The Explorer", "The Architect", "The Polyglot", "The Minimalist", "The Scientist", "The Builder", "The Optimizer", "The Connector". Base the choice on actual patterns in their stack, projects, interests, and bio. The archetype should feel earned, not generic.

- **dna**: A 2-3 sentence review of this developer based on ALL card data. Write it like a **critic reviewing a body of work** — observe patterns, interpret what they reveal, and make a judgment call. Rules:
  - **Reviewer voice** — you're writing a review, not a profile. Observe, then reinterpret. Don't list what they do; say what it tells you about them.
  - Make a read that the developer themselves might not have articulated — notice the through-line, the tension between choices, or what their patterns betray.
  - Be specific — reference actual patterns (repos, language switches, starred themes), not generic traits.
  - Present tense, third person perspective. No buzzwords, no "passionate about", no "leverages".
  - Should read like the closing paragraph of a review, not a LinkedIn summary.
  - Max ~300 characters

- **next_project**: 1-2 sentences suggesting a specific project idea based on their unique skill intersection. Should feel achievable and genuinely exciting. **Third person, gender-neutral language.**

### Show old vs new and confirm

For each insight field, show:
```
  archetype:
    old: "The Visualizer"
    new: "The Architect"

  dna:
    old: "Builds spatial computing tools..."
    new: "Full-stack polyglot who gravitates toward..."
```

Use AskUserQuestion:
- Question: "Accept the refreshed insights?"
- Header: "Insights"
- Options:
  - "Accept all new" (description: "Replace all insight fields with the new versions")
  - "Keep all original" (description: "Discard the new insights entirely")
  - "Pick individually" (description: "Choose old or new for each field")

If "Pick individually": for each insight field (archetype, dna, next_project), use AskUserQuestion:
- Question: "Which version of {field}?"
- Header: "{Field}"
- Options:
  - "New" (description: "{first 60 chars of new value}...")
  - "Original" (description: "{first 60 chars of old value}...")

---

## Step 6: Save

After all selected modes have executed:

1. Set `updated_at` to today's date (`YYYY-MM-DD` format)
2. Preserve `created_at` and `schema_version` exactly as they were
3. Validate the final YAML against the schema rules in `${PLUGIN_DIR}/ref/devcard-format.md`. If invalid, list specific issues and ask the user to fix them before saving.
4. Write to `~/.devcard/devcard.yaml`

Confirm:
```
devcard.yaml updated! Changed fields: {comma-separated list of changed field names}
  /devcard:view      → see your updated card
  /devcard:publish   → push changes to the registry
```

If no fields were changed across all modes:
```
No changes made — devcard.yaml is unchanged.
```

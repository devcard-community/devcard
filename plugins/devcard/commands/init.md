---
description: "Create your devcard.yaml — auto-generate from GitHub or build manually"
argument-hint: "[github-username | manual]"
---

# Devcard Init

Create a `devcard.yaml` file at `~/.devcard/devcard.yaml`.

## Determine Mode

Look at the argument provided:
- If the argument is `manual` → use **Manual Mode** below
- If the argument contains spaces, uppercase letters mixed with lowercase in a name-like pattern (e.g. "John Smith", "Shay Segal"), or looks like a real name rather than a GitHub handle → it is NOT a valid GitHub username. Search GitHub for matching users:

  ```bash
  gh api "search/users?q={argument}&per_page=5" --jq '.items[] | "\(.login) \(.name // "")"'
  ```

  Inform the user that looks like a name, then present matching GitHub accounts using AskUserQuestion:
  - Question: "That looks like a name. Did you mean one of these GitHub accounts?"
  - Header: "Username"
  - Options: Build from the search results (up to 3). For each result, use:
    - Label: the user's `login` (GitHub username)
    - Description: their `name` (display name) + " — github.com/{login}"
  - Add a final option: "None of these" (description: "Enter username manually or build card step by step")

  If they pick a match, proceed with Quick Mode using that username.
  If they pick "None of these", use AskUserQuestion to ask for their username manually (with a "Build manually instead" escape option). If they choose manual, proceed with Manual Mode.
- If the argument looks like a valid GitHub username (single word, no spaces) → proceed to **Quick Mode** below
- If no argument is provided → ask the user:

Use AskUserQuestion to ask:
- Question: "How would you like to create your devcard?"
- Header: "Mode"
- Options:
  - "Auto-generate from GitHub" (description: "I'll pull your profile, repos, and languages to create a draft. You'll need your GitHub username (e.g. shayse)")
  - "Build manually" (description: "Answer questions step by step to craft your card from scratch")

If they choose auto-generate, ask for their GitHub username with AskUserQuestion:
- Question: "What's your GitHub username? (the handle in github.com/your-username)"
- Header: "GitHub user"
- Options:
  - "I'm not sure" (description: "Use /devcard:init manual instead")

Then proceed with Quick Mode using the username they provide. If they say they're not sure, proceed with Manual Mode.

---

## Quick Mode (GitHub Auto-Generate)

### Step 1: Validate and confirm the username

Before fetching any data, confirm with the user using AskUserQuestion:
- Question: "I'll fetch your profile from github.com/{username} — is this your GitHub username?"
- Header: "Confirm"
- Options:
  - "Yes, that's me" (description: "Proceed with auto-generating from this GitHub profile")
  - "No, wrong username" (description: "Let me enter the correct one")

If they say no, ask for the correct username, then re-confirm.

### Step 2: Fetch GitHub data

Run these commands to fetch the user's GitHub profile and repositories:

```bash
gh api users/{username}
```

```bash
gh api "users/{username}/repos?sort=stars&per_page=30&type=owner"
```

If `gh` is not authenticated or not installed, inform the user:
```
GitHub CLI (gh) is required for auto-generate mode.
Install: https://cli.github.com
Auth:    gh auth login

Alternatively, use /devcard:init manual to build your card interactively.
```

### Step 2b: Additional data fetch

Fetch starred repos for interests extraction:

```bash
gh api "users/{username}/starred?per_page=100" --jq '.[] | "\(.language // "") \(.topics // [] | join(","))"'
```

Check if the authenticated user matches the target username, and if so, fetch private repos:

```bash
gh api user --jq '.login'
```

If the authenticated login matches the target username:

```bash
gh api "user/repos?type=private&per_page=100" --jq '.[] | .language // "Unknown"'
```

**Silent failures**: If starred API fails, omit `interests`. If private API fails (e.g., no `repo` scope), omit `private_note`. Do not show errors to the user for these optional fetches.

### Step 3: Process GitHub data into devcard draft

From the GitHub API responses, extract and organize:

1. **name**: Use `name` from profile (fall back to `login` if null)
2. **title**: Infer from `bio` field. If bio is empty, use "Developer" as placeholder
3. **location**: Use `location` from profile (omit if null)
4. **bio**: Use `bio` from profile, or craft a one-liner from their top repos' topics
5. **about**: Generate 2-3 sentences from profile + repo analysis
6. **stack**: Analyze the `language` field across all repos. Group languages into categories:
   - `frontend`: JavaScript, TypeScript, HTML, CSS, Vue, Svelte
   - `backend`: Python, Go, Rust, Java, Ruby, PHP, C#
   - `mobile`: Swift, Kotlin, Dart, Objective-C
   - `systems`: C, C++, Rust, Zig
   - `data`: Python, R, Julia, SQL
   - `devops`: Shell, Dockerfile, HCL, Nix
   - Use your judgment for uncategorized languages
   - Only include categories with 1+ languages
7. **projects**: Pick the top 5 repos by stars. For each:
   - `name`: repo name
   - `description`: repo description (truncate to 80 chars)
   - `status`: `shipped` (if not archived and has recent activity), `archived` (if archived)
   - `tags`: repo topics (first 3)
   - `link`: repo html_url
8. **links**:
   - `github`: profile html_url
   - `website`: `blog` field from profile (if present)
9. **interests**: Analyze starred repos topics and languages. Distill into 4-7 high-level themes that capture what this developer is drawn to (e.g., "Creative Coding", "AI Agents", "WebGL", "Systems Programming"). Focus on patterns across stars, not individual repos. Omit if starred data unavailable.
10. **private_note**: Count private repos and identify the top 2-3 languages used. Format as a single sentence like "Also maintains 12 private projects in Python and Go". Never include repo names, descriptions, or any identifying details. Omit if private data unavailable.

### Step 3b: Generate DNA, Archetype & Insights

After processing all data, generate these AI-driven fields:

- **archetype**: A developer classification. Choose from or coin new ones: "The Visualizer", "The Toolsmith", "The Explorer", "The Architect", "The Polyglot", "The Minimalist", "The Scientist", "The Builder", "The Optimizer", "The Connector". Base the choice on actual patterns in their repos, stack, and interests. The archetype should feel earned, not generic.

- **dna**: A 2-3 sentence review of this developer based on ALL gathered data (repos, languages, starred repos, bio, projects). Write it like a **critic reviewing a body of work** — observe patterns, interpret what they reveal, and make a judgment call. Rules:
  - **Reviewer voice** — you're writing a review, not a profile. Observe, then reinterpret. Don't list what they do; say what it tells you about them.
  - Make a read that the developer themselves might not have articulated — notice the through-line in their work, the tension between their choices, or what their patterns betray about where they're heading.
  - Be specific — reference actual patterns (repos, language switches, themes in starred repos), not generic traits.
  - Present tense, third person perspective. No buzzwords, no "passionate about", no "leverages".
  - Should read like the closing paragraph of a review, not a LinkedIn summary.
  - Max ~300 characters

- **next_project**: 1-2 sentences suggesting a specific project idea based on their unique skill intersection. The idea should feel achievable with their current stack and genuinely exciting — something they'd want to build. **Must use third person, gender-neutral language.**

### Step 4: Present draft for review

Show the user the generated YAML content and ask them to review it:

```
Here's your auto-generated devcard draft based on your GitHub profile.
Review it below — I'll ask if you want to make any changes before saving.
```

Display the full YAML, then use AskUserQuestion:
- Question: "Would you like to edit anything before saving?"
- Header: "Review"
- Options:
  - "Looks good, save it" (description: "Write devcard.yaml to ~/.devcard/")
  - "Let me make changes" (description: "Tell me what to modify and I'll update the draft")
  - "Start over" (description: "Wrong username or want to try a different approach")

If they choose "Start over", go back to the top of **Determine Mode** and begin the flow from scratch.
If they want changes, iterate until satisfied.

### Step 4b: Links follow-up

After the user approves the draft content, check if `links` only contains `github` (and optionally `website`). If so, offer to add more:

Use AskUserQuestion:
- Question: "Want to add more ways for people to reach you?"
- Header: "Links"
- Options:
  - "Add Twitter/X" (description: "Your Twitter/X handle")
  - "Add LinkedIn" (description: "Your LinkedIn profile URL")
  - "Add email" (description: "A public contact email")
  - "Skip" (description: "Keep links as-is")
- multiSelect: true

For each selected option, ask for the value. Add them to the `links` section of the YAML.

Then proceed to Step 5.

### Step 5: Save

Create the `~/.devcard/` directory if it doesn't already exist:

```bash
mkdir -p ~/.devcard
```

Write the final YAML to `~/.devcard/devcard.yaml`.

**Cache plugin path**: Also write the absolute path of the devcard plugin directory (the directory containing this command's parent `commands/` folder) to `~/.devcard/plugin_path`. This enables other commands (`/devcard:view`, `/devcard:export`) to locate plugin scripts instantly without searching the filesystem. To determine the plugin directory, find the directory that contains both `.claude-plugin/plugin.json` and `scripts/serve-card.mjs` — check `~/projects/devcard` first, then `~/devcard`, then `~/projects/` (depth 3). Use the Glob tool, not `find`.

Then proceed to **Step 6** (Claude Code Fingerprint).

### Step 6: Optional — Claude Code Fingerprint

Check if `~/.claude/stats-cache.json` exists. If it **doesn't exist**, skip this step entirely — don't mention it, don't ask. Proceed to Step 7.

If the file **does exist**, use AskUserQuestion:
- Question: "Want to add your Claude Code fingerprint? This shows how you collaborate with AI — session depth, peak hours, and an activity heatmap."
- Header: "Stats"
- Options:
  - "Yes, add it" (description: "Extract Claude Code usage data and add it to your card")
  - "Skip for now" (description: "You can always add it later with /devcard:stats")

If they skip, proceed to Step 7.

If they choose yes:

1. Run the extraction script from `/devcard:stats` Step 2 (the `node -e` script that reads `~/.claude/stats-cache.json`)
2. If `sessions` < 5, warn: "Only {sessions} sessions recorded — fingerprint may not be representative. Proceed anyway?" (AskUserQuestion: "Proceed" / "Skip"). If they skip, proceed to Step 7.
3. Generate the AI labels: `style`, `style_description`, and `rhythm` — follow the same rules as `/devcard:stats` Step 6.
4. Show the `claude:` section that will be added, followed by the privacy notice:
   ```
   Note: This reveals behavioral patterns (work hours, session
   intensity, model preference). Visible to anyone who sees your card.
   ```
5. Use AskUserQuestion: "Add this to your card?" — "Looks good" / "Skip"
6. If confirmed, append the `claude:` section to `~/.devcard/devcard.yaml` and update `updated_at`.

### Step 7: Done

Show confirmation. Adjust based on whether stats were added:

If stats were added:
```
~/.devcard/devcard.yaml saved! Next steps:
  /devcard:view      → see your card
  /devcard:update    → edit fields or refresh data
  /devcard:publish   → share with the community
```

If stats were skipped or unavailable:
```
~/.devcard/devcard.yaml saved! Next steps:
  /devcard:stats     → add your Claude Code fingerprint
  /devcard:view      → see your card
  /devcard:publish   → share with the community
```

---

## Manual Mode

### Step 1: Required fields

Use AskUserQuestion for each required field, one at a time:

1. Ask for **name** (full display name)
2. Ask for **title** (role / tagline — give examples: "Frontend Developer", "AI Researcher & Builder", "Full-Stack Engineer")
3. Ask for **bio** (1-2 sentence summary)
4. Ask for **tech stack** — ask them to list their main technologies, and you will categorize them. Prompt: "List your main technologies, languages, and tools (comma-separated)"
5. Ask for **GitHub profile URL**

### Step 2: Optional fields

Use AskUserQuestion:
- Question: "Want to add more detail to your card?"
- Options:
  - "Add location" → ask for city/country
  - "Add about section" → ask for extended bio (2-4 sentences)
  - "Add projects" → ask for each project: name, description, status, tags
  - "Add experience" → ask for each role: title, company, period, highlight
  - "Add more links" → ask for linkedin, twitter, website
  - "Generate DNA, Archetype & Insights" → using the info gathered so far, generate archetype, dna, and next_project fields (see Step 3b rules in Quick Mode)
  - "Add interests" → ask for 4-7 topics/themes they're drawn to (comma-separated)
  - "Skip — save what we have" → proceed to save
- multiSelect: true

Walk through each selected optional section. Note: `private_note` is skipped in manual mode (it requires GitHub API data).

### Step 3: Generate and save

Assemble the YAML according to the devcard schema. Read `${PLUGIN_DIR}/ref/devcard-format.md` for validation rules.

Set `schema_version: "1"` and `created_at` / `updated_at` to today's date.

Create the `~/.devcard/` directory if it doesn't already exist:

```bash
mkdir -p ~/.devcard
```

Write to `~/.devcard/devcard.yaml`.

**Cache plugin path**: Also write the plugin path to `~/.devcard/plugin_path` (same logic as Quick Mode Step 5).

Then run **Quick Mode Step 6** (Claude Code Fingerprint) — same flow applies here.

Then show the appropriate **Step 7** confirmation (same as Quick Mode).

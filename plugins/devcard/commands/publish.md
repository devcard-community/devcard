---
description: "Publish your devcard to the community registry"
---

# Devcard Publish

Publish `devcard.yaml` to the community registry via a GitHub pull request.

## Step 1: Preflight checks

### Check for devcard.yaml

If `~/.devcard/devcard.yaml` does not exist:
```
No devcard.yaml found at ~/.devcard/devcard.yaml
Run /devcard:init to create one.
```
And stop.

### Check GitHub CLI

Run:
```bash
gh auth status
```

If not authenticated:
```
GitHub CLI not authenticated. Run:
  gh auth login
```
And stop.

### Read and validate

Read `~/.devcard/devcard.yaml` and validate it against the schema rules in `${PLUGIN_DIR}/ref/devcard-format.md`.

If invalid, list the specific issues and stop. Do NOT publish invalid cards.

## Step 2: Determine username

Extract the GitHub username from the `links.github` field in the YAML.

For example, if `links.github` is `https://github.com/shayse`, the username is `shayse`.

## Step 3: Determine registry and check access

Use the registry from the `DEVCARD_REGISTRY` environment variable, falling back to `devcard-community/registry`:

```bash
REGISTRY="${DEVCARD_REGISTRY:-devcard-community/registry}"
gh repo view ${REGISTRY} --json name 2>&1
```

If the registry repo does not exist, inform the user:
```
The community registry (${REGISTRY}) doesn't exist yet.

To set up a registry:
  1. Create a GitHub org and repo matching the registry path
  2. Add a cards/ directory
  3. Run /devcard:publish again

Or set DEVCARD_REGISTRY to a different repo (e.g., "myorg/devcard-registry").
```
And stop.

## Step 4: Check if card already exists

```bash
gh api repos/${REGISTRY}/contents/cards/@${USERNAME}.yaml --jq '.sha' 2>/dev/null
```

If the file exists, save the SHA - it will be needed to update the file. Tell the user their card already exists and ask if they want to update it. If they decline, stop.

## Step 5: Publish via PR

### Determine the authenticated user

```bash
GITHUB_LOGIN=$(gh api user --jq '.login')
```

### Fork the registry (if not already forked)

```bash
gh repo fork ${REGISTRY} --clone=false 2>&1
```

This is a no-op if already forked.

### Extract the repo name from REGISTRY

The `REGISTRY` variable is in the format `org/repo` (e.g., `devcard-community/registry`). Extract just the repo name:

```bash
REPO_NAME=$(echo "${REGISTRY}" | cut -d/ -f2)
```

### Get the default branch SHA

```bash
MAIN_SHA=$(gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/git/refs/heads/main --jq '.object.sha' 2>/dev/null)
```

If this fails (fork not synced), sync the fork first:

```bash
gh repo sync ${GITHUB_LOGIN}/${REPO_NAME}
MAIN_SHA=$(gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/git/refs/heads/main --jq '.object.sha')
```

### Create the branch on the fork

```bash
gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/git/refs \
  --method POST \
  --field ref="refs/heads/devcard/${USERNAME}" \
  --field sha="${MAIN_SHA}" 2>&1
```

If the branch already exists (409 conflict), delete and recreate it:

```bash
gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/git/refs/heads/devcard/${USERNAME} --method DELETE 2>&1
gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/git/refs \
  --method POST \
  --field ref="refs/heads/devcard/${USERNAME}" \
  --field sha="${MAIN_SHA}"
```

### Push the card file

Encode the card content and push it to the fork's branch:

```bash
CONTENT=$(base64 < ~/.devcard/devcard.yaml)
```

If updating an existing card (SHA was found in Step 4), include the SHA:

```bash
gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/contents/cards/@${USERNAME}.yaml \
  --method PUT \
  --field message="Add @${USERNAME} devcard" \
  --field content="${CONTENT}" \
  --field branch="devcard/${USERNAME}" \
  --field sha="${EXISTING_SHA}"
```

If creating a new card:

```bash
gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/contents/cards/@${USERNAME}.yaml \
  --method PUT \
  --field message="Add @${USERNAME} devcard" \
  --field content="${CONTENT}" \
  --field branch="devcard/${USERNAME}"
```

### Create the PR

```bash
gh pr create \
  --repo ${REGISTRY} \
  --head ${GITHUB_LOGIN}:devcard/${USERNAME} \
  --title "Add @${USERNAME} devcard" \
  --body "Adding my developer card to the registry."
```

If a PR already exists for this branch, the command will fail. In that case, tell the user the existing PR was updated with their latest card.

## Step 6: Confirm

Display the PR URL and confirmation:

```
Published! Your devcard PR is open:
  ${PR_URL}

The registry will validate your card automatically.
Once merged, anyone can view your card with:
  /devcard:view @${USERNAME}
```

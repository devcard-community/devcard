---
description: "Remove your devcard from the community registry"
---

# Devcard Unpublish

Remove your card from the community registry via a GitHub pull request.

## Step 1: Preflight checks

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

### Determine username

If `~/.devcard/devcard.yaml` exists, extract the GitHub username from `links.github`.

Otherwise, ask the user for their GitHub username.

## Step 2: Determine registry and check card exists

```bash
REGISTRY="${DEVCARD_REGISTRY:-devcard-community/registry}"
```

Check if the card exists:

```bash
EXISTING_SHA=$(gh api repos/${REGISTRY}/contents/cards/@${USERNAME}.yaml --jq '.sha' 2>/dev/null)
```

If the card does not exist:
```
No card found for @${USERNAME} in the registry.
```
And stop.

## Step 3: Confirm with user

Ask the user to confirm:
```
This will remove your card from the community registry.
Your local devcard.yaml will not be affected.
Proceed?
```

If the user declines, stop.

## Step 4: Create deletion PR

### Determine the authenticated user

```bash
GITHUB_LOGIN=$(gh api user --jq '.login')
```

### Fork the registry (if not already forked)

```bash
gh repo fork ${REGISTRY} --clone=false 2>&1
```

### Extract the repo name from REGISTRY

```bash
REPO_NAME=$(echo "${REGISTRY}" | cut -d/ -f2)
```

### Get the default branch SHA

```bash
MAIN_SHA=$(gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/git/refs/heads/main --jq '.object.sha' 2>/dev/null)
```

If this fails, sync the fork first:

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

### Delete the card file

```bash
gh api repos/${GITHUB_LOGIN}/${REPO_NAME}/contents/cards/@${USERNAME}.yaml \
  --method DELETE \
  --field message="Remove @${USERNAME} devcard" \
  --field sha="${EXISTING_SHA}" \
  --field branch="devcard/${USERNAME}"
```

### Create the PR

```bash
gh pr create \
  --repo ${REGISTRY} \
  --head ${GITHUB_LOGIN}:devcard/${USERNAME} \
  --title "Remove @${USERNAME} devcard" \
  --body "Removing my developer card from the registry."
```

If a PR already exists for this branch, tell the user.

## Step 5: Confirm

```
Done! Your removal PR is open:
  ${PR_URL}

The registry will verify ownership and merge automatically.
```

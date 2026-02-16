---
description: "Add your Claude Code collaboration fingerprint to your devcard"
---

# Devcard Stats

Extract Claude Code usage data and add a `claude` section to your `devcard.yaml`.

## Step 1: Preflight

If `~/.devcard/devcard.yaml` does not exist:
```
No devcard.yaml found at ~/.devcard/devcard.yaml
Run /devcard:init to create one.
```
And stop.

Check if `~/.claude/stats-cache.json` exists. If not:
```
No Claude Code usage data found at ~/.claude/stats-cache.json.
This file is generated automatically by Claude Code after a few sessions.
```
And stop.

## Step 2: Extract metrics

Run this inline script to extract and compute all metrics from the stats cache:

```bash
node -e "
const fs = require('fs');
const os = require('os');
const path = require('path');

const stats = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude/stats-cache.json'), 'utf8'));

// Since date
const since = stats.firstSessionDate ? stats.firstSessionDate.slice(0, 10) : null;

// Headline numbers
const sessions = stats.totalSessions || 0;
const messages = stats.totalMessages || 0;

// Hour distribution (24-element array from sparse hourCounts)
const hourDist = Array(24).fill(0);
if (stats.hourCounts) {
  for (const [h, count] of Object.entries(stats.hourCounts)) {
    hourDist[parseInt(h, 10)] = count;
  }
}

// Peak hours (top 3 by count)
const peakHours = Object.entries(stats.hourCounts || {})
  .map(([h, c]) => ({ hour: parseInt(h, 10), count: c }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 3)
  .map(x => x.hour)
  .sort((a, b) => a - b);

// Primary model (group by family, sum outputTokens)
const familyTokens = {};
for (const [modelId, usage] of Object.entries(stats.modelUsage || {})) {
  const family = modelId.split('-')[1] || modelId;
  familyTokens[family] = (familyTokens[family] || 0) + (usage.outputTokens || 0);
}
const model = Object.entries(familyTokens)
  .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

// Avg session depth (for AI generation context, not stored)
const avgDepth = sessions > 0 ? Math.round(messages / sessions) : 0;

// Longest session (for AI generation context, not stored)
const longest = stats.longestSession?.messageCount || 0;

// Active days (for AI generation context, not stored)
const activeDays = (stats.dailyActivity || []).length;

// Staleness check
const lastComputed = stats.lastComputedDate || null;

console.log(JSON.stringify({
  since, sessions, messages, model, peakHours, hourDist,
  avgDepth, longest, activeDays, lastComputed
}, null, 2));
"
```

If the script fails, inform the user:
```
Failed to read Claude Code stats. The file may be corrupted.
```
And stop.

## Step 3: Staleness check

Parse the `lastComputed` date from the extraction output. If it is more than 7 days before today:

```
Note: Your Claude Code stats were last updated on {lastComputed}.
The fingerprint will reflect data up to that date.
```

Continue regardless — this is informational, not blocking.

## Step 4: Timezone check

The hour data in `stats-cache.json` reflects the system clock at the time of each session. Detect the current system timezone and present it for confirmation:

```
Your activity hours are based on timezone: {system_timezone} (e.g., Asia/Jerusalem).
```

Use AskUserQuestion:
- Question: "Is this the timezone you typically use Claude Code in?"
- Header: "Timezone"
- Options:
  - "Yes, that's correct" (description: "Use {system_timezone} for rhythm and peak hours")
  - "No, different timezone" (description: "I'll specify the correct one")

If the user picks a different timezone, ask which timezone they use. Apply the offset to `hourDist` and `peakHours` by shifting the 24-element array accordingly before generating labels.

## Step 5: Minimum data check

If `sessions` is less than 5:

Use AskUserQuestion:
- Question: "You have only {sessions} sessions recorded. The fingerprint may not be representative yet. Proceed anyway?"
- Header: "Low data"
- Options:
  - "Proceed anyway" (description: "Generate fingerprint with available data")
  - "Cancel" (description: "Wait until more sessions accumulate")

If they cancel, stop.

## Step 6: Generate AI labels

Using the extracted metrics, generate these fields:

- **style**: A 1-3 word label classifying how this developer collaborates with Claude. Based on:
  - Session depth (`avgDepth`): deep sustained sessions vs short bursts
  - Model choice (`model`): opus = thoroughness, haiku = speed, sonnet = balance
  - Temporal pattern (`peakHours`): concentrated bursts vs spread throughout day
  - Examples: "Marathon Architect", "Sprint Debugger", "Night Owl Polymath", "Methodical Builder"
  - Must be specific and earned from the data, not generic

- **style_description**: 1-2 sentences. Rules:
  - Reference actual numbers from the extraction (session count, avg depth, message count)
  - No buzzwords, no "passionate", no "leverages"
  - Reads like a perceptive observation, not a LinkedIn summary
  - Max ~200 characters

- **rhythm**: A label derived from peak hour distribution:
  - Hours 5-11 dominant → "Morning Builder"
  - Hours 12-17 dominant → "Afternoon Sprinter"
  - Hours 18-23 dominant → "Night Owl"
  - Hours 0-4 dominant → "Late Night Hacker"
  - Spread across 12+ hours → "All-Day Coder"
  - Use the `peakHours` array and `hourDist` shape to determine

## Step 7: Present and confirm

Show the complete `claude:` section that will be added:

```yaml
claude:
  since: "{since}"
  sessions: {sessions}
  messages: {messages}
  model: "{model}"
  style: "{style}"
  style_description: >
    {style_description}
  rhythm: "{rhythm}"
  peak_hours: {peak_hours}
  hour_distribution:
    {hour_distribution}
```

Then show a privacy notice:

```
Note: This section reveals behavioral patterns (work hours, session
intensity, model preference). It will be visible to anyone who sees
your card.
```

Use AskUserQuestion:
- Question: "Add this Claude Code fingerprint to your devcard?"
- Header: "Confirm"
- Options:
  - "Looks good, add it" (description: "Merge the claude section into devcard.yaml")
  - "Let me adjust" (description: "Tell me what to change and I'll update")
  - "Cancel" (description: "Don't add Claude Code data")

If "Let me adjust": iterate on changes until satisfied, then confirm.
If "Cancel": stop.

## Step 8: Save

1. Read the current `~/.devcard/devcard.yaml`
2. Add or replace the `claude:` section
3. Update `updated_at` to today's date
4. Preserve all other fields unchanged
5. Validate against the schema rules in `${PLUGIN_DIR}/ref/devcard-format.md`
6. Write to `~/.devcard/devcard.yaml`

Confirm:
```
devcard.yaml updated! Added Claude Code fingerprint.
  /devcard:view      → see your updated card
  /devcard:update    → refresh or edit other fields
```

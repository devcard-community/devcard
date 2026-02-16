#!/usr/bin/env node

// render-card.mjs — Zero-dependency ASCII devcard renderer
// Reads devcard YAML, outputs styled terminal card.
// Usage: node render-card.mjs <file> [--plain]

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './lib/parse-yaml.mjs';
import { buildHourDist, rotateHeatmap, heatmapAxisLabels } from './lib/heatmap.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const plain = process.argv.includes('--plain');

// --- ANSI Colors (disabled in --plain mode) ---
const c = plain ? Object.fromEntries(
  ['reset','bold','dim','italic','cyan','yellow','green','magenta','blue',
   'white','gray','brightCyan','brightYellow','brightGreen','brightMagenta',
   'brightBlue','brightWhite','pink','claudeOrange'].map(k => [k, ''])
) : {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  italic:   '\x1b[3m',
  cyan:     '\x1b[36m',
  yellow:   '\x1b[33m',
  green:    '\x1b[32m',
  magenta:  '\x1b[35m',
  blue:     '\x1b[34m',
  white:    '\x1b[37m',
  gray:     '\x1b[90m',
  brightCyan:    '\x1b[96m',
  brightYellow:  '\x1b[93m',
  brightGreen:   '\x1b[92m',
  brightMagenta: '\x1b[95m',
  brightBlue:    '\x1b[94m',
  brightWhite:   '\x1b[97m',
  pink:          '\x1b[95m',
  claudeOrange:  '\x1b[38;2;218;119;86m',
};


// YAML parser imported from ./lib/parse-yaml.mjs

// Strip C0/C1 control characters from user data (prevents terminal escape injection).
// Preserves \n (0x0a) and \t (0x09) which are safe for terminal output.
function stripCtrl(s) {
  return String(s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\x80-\x9f]/g, '');
}

function sanitizeData(obj) {
  if (typeof obj === 'string') return stripCtrl(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeData);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeData(v);
    return out;
  }
  return obj;
}

// --- Card Renderer ---
function renderCard(data) {
  data = sanitizeData(data);
  const W = 62;
  const divider = `${c.gray}${'─'.repeat(W)}${c.reset}`;
  const out = [];

  // Name
  out.push('');
  out.push(`${c.bold}${c.claudeOrange}${(data.name || 'DEV').toUpperCase()}${c.reset}`);

  // Title · Location
  const parts = [data.title, data.location].filter(Boolean);
  if (parts.length) {
    out.push(`${c.gray}${parts.join(' · ')}${c.reset}`);
  }

  // Archetype
  if (data.archetype) {
    out.push(`${c.gray}Claude's read: ${c.reset}${c.brightMagenta}${c.italic}${data.archetype}${c.reset}`);
  }

  out.push(divider);

  // Bio
  if (data.bio) {
    out.push('');
    out.push(`${c.yellow}Bio${c.reset}`);
    const bioLines = wordWrap(data.bio, W - 2);
    for (const line of bioLines) {
      out.push(`${c.white}${line}${c.reset}`);
    }
  }

  // About (only if different from bio)
  if (data.about && data.about !== data.bio) {
    out.push('');
    out.push(`${c.yellow}About${c.reset}`);
    const aboutLines = wordWrap(data.about, W - 2);
    for (const line of aboutLines) {
      out.push(`${c.white}${line}${c.reset}`);
    }
  }

  // Stack
  if (data.stack && typeof data.stack === 'object') {
    out.push('');
    out.push(`${c.yellow}Stack${c.reset}`);
    const entries = Object.entries(data.stack);
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length), 8);
    for (const [category, techs] of entries) {
      const techStr = Array.isArray(techs) ? techs.join(' · ') : String(techs);
      const label = capitalize(category).padEnd(maxKeyLen + 2);
      out.push(`${c.gray}${label}${c.reset}${c.white}${techStr}${c.reset}`);
    }
  }

  // Interests (dot-separated)
  if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) {
    out.push('');
    out.push(`${c.yellow}Interests${c.reset}`);
    out.push(`${c.white}${data.interests.join(' · ')}${c.reset}`);
  }

  // Projects
  if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
    out.push('');
    out.push(`${c.yellow}Projects${c.reset}`);
    for (const proj of data.projects) {
      const tag = proj.status || proj.tags?.[0] || '';
      const tagColor = {
        shipped: c.green, wip: c.yellow, concept: c.brightMagenta, archived: c.gray,
      }[tag] || c.claudeOrange;
      const tagStr = tag ? `  ${tagColor}[${tag}]${c.reset}` : '';
      out.push(`${c.green}▸ ${c.reset}${c.brightWhite}${proj.name}${c.reset}${tagStr}`);
      if (proj.description) {
        out.push(`  ${c.gray}${proj.description}${c.reset}`);
      }
    }
  }

  // Experience
  if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) {
    out.push('');
    out.push(`${c.yellow}Experience${c.reset}`);
    for (const exp of data.experience) {
      const period = exp.period ? ` ${c.gray}(${exp.period})${c.reset}` : '';
      out.push(`${c.white}${exp.role}${c.reset} ${c.gray}@ ${exp.company}${c.reset}${period}`);
      if (exp.highlight) {
        out.push(`  ${c.gray}${exp.highlight}${c.reset}`);
      }
    }
  }

  // Private note (subtle accent)
  if (data.private_note) {
    out.push('');
    for (const line of wordWrap(data.private_note, W - 4)) {
      out.push(`  ${c.dim}${c.italic}${line}${c.reset}`);
    }
  }

  // Links
  if (data.links && typeof data.links === 'object') {
    out.push('');
    out.push(`${c.yellow}Links${c.reset}`);
    const entries = Object.entries(data.links);
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length), 8);
    for (const [label, url] of entries) {
      const padded = capitalize(label).padEnd(maxKeyLen + 2);
      out.push(`${c.gray}${padded}${c.reset}${c.claudeOrange}${url}${c.reset}`);
    }
  }

  // Claude's Take (DNA)
  if (data.dna) {
    out.push('');
    out.push(`${c.yellow}Claude's Take${c.reset}`);
    for (const line of wordWrap(data.dna, W - 4)) {
      out.push(`  ${c.claudeOrange}${c.italic}${line}${c.reset}`);
    }
  }

  // What to Build Next — standalone section, Claude's suggestion
  if (data.next_project) {
    out.push('');
    out.push(`${c.yellow}What to Build Next${c.reset}  ${c.dim}${c.italic}(Claude's suggestion)${c.reset}`);
    for (const line of wordWrap(data.next_project, W - 4)) {
      out.push(`  ${c.brightCyan}▍${c.reset} ${c.brightWhite}${line}${c.reset}`);
    }
  }

  // Claude Code fingerprint
  if (data.claude && typeof data.claude === 'object') {
    const cl = data.claude;
    const fmtNum = n => n >= 10000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);

    // Support both old and new field names
    const sinceStr = cl.since || cl.active_since || '';
    const messages = cl.messages || cl.total_messages || 0;
    const model = cl.model || cl.primary_model || '';
    const fmtSince = sinceStr ? sinceStr.slice(0, 7).replace('-', '/') : '';

    out.push('');
    out.push(`${c.yellow}Claude Code${c.reset}`);
    if (cl.style) {
      out.push(`  ${c.brightMagenta}${cl.style}${c.reset}`);
    }
    if (cl.style_description) {
      for (const line of wordWrap(cl.style_description, W - 6)) {
        out.push(`  ${c.dim}${c.italic}"${line}"${c.reset}`);
      }
    }
    out.push('');

    const statsLine = [
      cl.sessions ? `${fmtNum(cl.sessions)} sessions` : '',
      messages ? `${fmtNum(messages)} messages` : '',
      fmtSince ? `since ${fmtSince}` : '',
    ].filter(Boolean).join('  ·  ');
    if (statsLine) out.push(`  ${c.white}${statsLine}${c.reset}`);

    out.push('');
    if (model) out.push(`  ${c.gray}${'Model'.padEnd(12)}${c.reset}${c.white}${model}${c.reset}`);
    if (cl.rhythm) {
      const peakStr = cl.peak_hours ? ` (peak: ${cl.peak_hours.map(h => h > 12 ? (h - 12) + 'pm' : h + 'am').join('-')})` : '';
      out.push(`  ${c.gray}${'Rhythm'.padEnd(12)}${c.reset}${c.white}${cl.rhythm}${c.gray}${peakStr}${c.reset}`);
    }

    // Build 24-element distribution from flat array or 7-day heatmap matrix
    const hourDist = buildHourDist(cl);

    // 24-cell heatmap with rotation for night workers
    if (hourDist && hourDist.length === 24) {
      const { data: rotated, startHour } = rotateHeatmap(hourDist);
      const labels = heatmapAxisLabels(startHour);
      const max = Math.max(...rotated, 1);
      const blocks = rotated.map(v => {
        if (v === 0) return ' ';
        const ratio = v / max;
        if (ratio < 0.25) return '░';
        if (ratio < 0.5) return '▒';
        if (ratio < 0.75) return '▓';
        return '█';
      }).join('');
      out.push('');
      out.push(`  ${c.claudeOrange}${blocks}${c.reset}`);
      // Build axis line with labels at positions 0, 6, 12, 18, 23
      const axisLine = labels[0].padEnd(8) + labels[1].padEnd(7) + labels[2].padEnd(7) + labels[3].padEnd(4) + labels[4];
      out.push(`  ${c.gray}${axisLine}${c.reset}`);
    }
  }

  out.push('');
  out.push(divider);

  return out.join('\n');
}

// --- Utilities ---
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, '/');
}

function wordWrap(text, maxWidth) {
  const result = [];
  for (const para of text.split('\n')) {
    if (para.trim() === '') { result.push(''); continue; }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      if (line.length + word.length + 1 > maxWidth) {
        result.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

// --- Main ---
function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const filePath = args[0];

  if (filePath) {
    try {
      const input = readFileSync(filePath, 'utf-8');
      const data = parseYaml(input);
      console.log(renderCard(data));
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`File not found: ${filePath}`);
      } else {
        console.error(`Error rendering card: ${err.message}`);
      }
      process.exit(1);
    }
    return;
  }

  // Stdin mode
  const stdin = process.stdin;
  stdin.setEncoding('utf-8');
  if (stdin.isTTY) {
    console.error('Usage: node render-card.mjs <file> [--plain]');
    process.exit(1);
  }
  let input = '';
  stdin.on('data', (chunk) => { input += chunk; });
  stdin.on('end', () => {
    try {
      const data = parseYaml(input);
      console.log(renderCard(data));
    } catch (err) {
      console.error(`Error rendering card: ${err.message}`);
      process.exit(1);
    }
  });
}

// Run CLI when executed directly
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''));
if (isMain) main();

export { renderCard };

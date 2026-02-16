#!/usr/bin/env node

// export-card.mjs — Zero-dependency SVG devcard generator
// Reads devcard YAML from stdin, outputs an SVG file.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './lib/parse-yaml.mjs';
import { buildHourDist, rotateHeatmap, heatmapAxisLabels } from './lib/heatmap.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- SVG Generator ---
function esc(str) {
  return ('' + (str ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateSVG(data) {
  const W = 600;
  const PAD = 32;
  const contentW = W - PAD * 2;
  let y = 0;
  const elements = [];

  const colors = {
    bg:        '#0d1117',
    border:    '#30363d',
    text:      '#c9d1d9',
    brightText:'#f0f6fc',
    dimText:   '#8b949e',
    muted:     '#484f58',
    name:      '#DA7756',
    title:     '#e3b341',
    section:   '#e3b341',
    link:      '#DA7756',
    interest:  '#d2a8ff',
    bullet:    '#7ee787',
    shipped:   '#7ee787',
    wip:       '#e3b341',
    concept:   '#bc8cff',
    archived:  '#484f58',
  };

  // Helper: add text element
  const text = (x, yPos, content, opts = {}) => {
    const {
      size = 14,
      fill = colors.text,
      weight = 'normal',
      family = "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
      anchor = 'start',
      style = '',
    } = opts;
    const styleAttr = style ? ` font-style="${style}"` : '';
    return `<text x="${x}" y="${yPos}" font-family="${family}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${styleAttr}>${esc(content)}</text>`;
  };

  // Helper: section divider
  const divider = (yPos) => {
    return `<line x1="${PAD}" y1="${yPos}" x2="${W - PAD}" y2="${yPos}" stroke="${colors.border}" stroke-width="1"/>`;
  };

  // -- Titlebar --
  y += 28;
  const username = data.username || (data.name || 'dev').toLowerCase().replace(/\s+/g, '-');
  elements.push(`<rect x="0" y="0" width="${W}" height="40" rx="12" fill="#161b22"/>`);
  elements.push(`<rect x="0" y="20" width="${W}" height="20" fill="#161b22"/>`);
  elements.push(`<line x1="0" y1="40" x2="${W}" y2="40" stroke="${colors.border}" stroke-width="1"/>`);
  elements.push(text(PAD, y, '~', { size: 13, fill: '#6e7681' }));
  elements.push(text(PAD + 16, y, 'devcard', { size: 13, fill: colors.muted }));
  elements.push(text(PAD + 80, y, `@${username}`, { size: 13, fill: colors.dimText }));

  // -- Header: Name --
  y += 50;
  elements.push(text(PAD, y, (data.name || 'Dev').toUpperCase(), {
    size: 28,
    fill: colors.name,
    weight: 'bold',
  }));

  // Title + Location (combined on one line with middot, matching HTML .title-line)
  const titleLine = [data.title, data.location].filter(Boolean).join(' \u00B7 ');
  if (titleLine) {
    y += 20;
    const tlLines = wordWrap(titleLine, 66);
    for (const tl of tlLines) {
      elements.push(text(PAD, y, tl, { size: 14, fill: colors.muted }));
      y += 18;
    }
    y -= 18; // undo last increment
  }

  // Archetype
  if (data.archetype) {
    y += 20;
    elements.push(`<text x="${PAD}" y="${y}" font-family="'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace" font-size="13"><tspan fill="#6e7681">Claude's read:</tspan><tspan fill="#bc8cff" font-weight="500" font-style="italic"> ${esc(data.archetype)}</tspan></text>`);
  }

  // Divider after header
  y += 12;
  elements.push(divider(y));

  // Bio (section with header, matching HTML)
  if (data.bio) {
    y += 20;
    elements.push(text(PAD, y, 'BIO', { size: 12, fill: colors.section, weight: 'bold' }));
    const bioLines = wordWrap(data.bio, 66);
    for (const line of bioLines) {
      y += 18;
      elements.push(text(PAD, y, line, { size: 13, fill: colors.text }));
    }
  }

  // -- About --
  if (data.about) {
    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, 'ABOUT', { size: 12, fill: colors.section, weight: 'bold' }));
    const aboutLines = wordWrap(data.about, 64);
    for (const line of aboutLines) {
      y += 18;
      elements.push(text(PAD, y, line, { size: 13, fill: colors.text }));
    }
  }

  // -- Stack --
  if (data.stack && typeof data.stack === 'object') {
    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, 'STACK', { size: 12, fill: colors.section, weight: 'bold' }));
    for (const [category, techs] of Object.entries(data.stack)) {
      y += 18;
      const techStr = Array.isArray(techs) ? techs.join(', ') : String(techs);
      elements.push(text(PAD, y, category, { size: 12, fill: colors.muted, weight: '600' }));
      const techLines = wordWrap(techStr, 55);
      elements.push(text(PAD + 120, y, techLines[0], { size: 12, fill: colors.text }));
      for (let t = 1; t < techLines.length; t++) {
        y += 16;
        elements.push(text(PAD + 120, y, techLines[t], { size: 12, fill: colors.text }));
      }
    }
  }

  // -- Interests --
  if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) {
    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, 'INTERESTS', { size: 12, fill: colors.section, weight: 'bold' }));
    const interestStr = data.interests.join(' \u00B7 ');
    const interestLines = wordWrap(interestStr, 68);
    for (const line of interestLines) {
      y += 18;
      elements.push(text(PAD, y, line, { size: 12, fill: colors.interest }));
    }
  }

  // -- Projects --
  if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, 'PROJECTS', { size: 12, fill: colors.section, weight: 'bold' }));
    for (const proj of data.projects) {
      y += 18;
      const status = proj.status || 'wip';
      const statusFill = colors[status] || colors.text;
      // ▸ name [status] layout matching HTML card
      elements.push(`<text x="${PAD}" y="${y}" font-family="'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace" font-size="13"><tspan fill="${colors.bullet}" font-size="14">&#9656;</tspan><tspan fill="${colors.brightText}" font-weight="600"> ${esc(proj.name || '')}</tspan><tspan fill="${statusFill}" font-size="11"> [${esc(status)}]</tspan></text>`);
      if (proj.description) {
        const descLines = wordWrap(proj.description, 66);
        for (const line of descLines) {
          y += 16;
          elements.push(text(PAD + 18, y, line, { size: 12, fill: colors.muted }));
        }
      }
    }
  }

  // -- Experience --
  if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) {
    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, 'EXPERIENCE', { size: 12, fill: colors.section, weight: 'bold' }));
    for (const exp of data.experience) {
      y += 18;
      const period = exp.period ? ` (${exp.period})` : '';
      const expText = `${exp.role} @ ${exp.company}${period}`;
      const expLines = wordWrap(expText, 66);
      elements.push(text(PAD, y, expLines[0], { size: 13, fill: colors.text }));
      for (let e = 1; e < expLines.length; e++) {
        y += 16;
        elements.push(text(PAD, y, expLines[e], { size: 13, fill: colors.text }));
      }
      if (exp.highlight) {
        const hlLines = wordWrap(`"${exp.highlight}"`, 66);
        for (const line of hlLines) {
          y += 16;
          elements.push(text(PAD + 12, y, line, { size: 12, fill: colors.muted, style: 'italic' }));
        }
      }
    }
  }

  // -- Private Note --
  if (data.private_note) {
    y += 18;
    const noteLines = wordWrap(data.private_note, 64);
    const noteHeight = noteLines.length * 16 + 4;
    elements.push(`<rect x="${PAD}" y="${y - 4}" width="2" height="${noteHeight}" rx="1" fill="#DA7756" opacity="0.25"/>`);
    for (const line of noteLines) {
      elements.push(text(PAD + 14, y, line, {
        size: 12,
        fill: '#6e7681',
        style: 'italic',
      }));
      y += 16;
    }
    y -= 16; // undo last increment
  }

  // -- Links --
  if (data.links && typeof data.links === 'object') {
    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, 'LINKS', { size: 12, fill: colors.section, weight: 'bold' }));
    for (const [label, val] of Object.entries(data.links)) {
      const url = String(val ?? '');
      y += 18;
      elements.push(text(PAD, y, label, { size: 12, fill: colors.muted, weight: '600' }));
      const maxUrlLen = 54;
      const displayUrl = url.length > maxUrlLen ? url.slice(0, maxUrlLen - 1) + '\u2026' : url;
      elements.push(text(PAD + 90, y, displayUrl, { size: 12, fill: colors.link }));
    }
  }

  // -- Claude's Take --
  if (data.dna || data.next_project) {
    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, "CLAUDE'S TAKE", { size: 12, fill: colors.section, weight: 'bold' }));

    if (data.dna) {
      y += 6;
      const dnaLines = wordWrap(data.dna, 60);
      const dnaHeight = dnaLines.length * 18 + 6;
      elements.push(`<rect x="${PAD}" y="${y - 4}" width="3" height="${dnaHeight}" rx="1.5" fill="#DA7756" opacity="0.7"/>`);
      for (const line of dnaLines) {
        y += 18;
        elements.push(text(PAD + 14, y, line, { size: 13, fill: colors.text, style: 'italic' }));
      }
    }
    if (data.next_project) {
      y += 16;
      const npLines = wordWrap(data.next_project, 62);
      const npHeight = npLines.length * 16 + 26;
      elements.push(`<rect x="${PAD}" y="${y}" width="${contentW}" height="${npHeight}" rx="6" fill="none" stroke="#58a6ff" stroke-width="1" stroke-dasharray="4,3" opacity="0.3"/>`);
      elements.push(`<rect x="${PAD}" y="${y}" width="${contentW}" height="${npHeight}" rx="6" fill="#58a6ff" opacity="0.03"/>`);
      y += 16;
      elements.push(text(PAD + 12, y, 'WHAT TO BUILD NEXT', { size: 10, fill: '#58a6ff', weight: '600' }));
      for (const line of npLines) {
        y += 16;
        elements.push(text(PAD + 12, y, line, { size: 12, fill: colors.text }));
      }
      y += 8;
    }
  }

  // -- Claude Code fingerprint --
  if (data.claude && typeof data.claude === 'object') {
    const cl = data.claude;
    const fmtNum = n => n >= 10000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);

    // Support both old and new field names
    const sinceStr = cl.since || cl.active_since || '';
    const messages = cl.messages || cl.total_messages || 0;
    const model = cl.model || cl.primary_model || '';
    const fmtSince = sinceStr ? sinceStr.slice(0, 7).replace('-', '/') : '';

    y += 16;
    elements.push(divider(y));
    y += 20;
    elements.push(text(PAD, y, 'CLAUDE CODE', { size: 12, fill: colors.section, weight: 'bold' }));

    if (cl.style) {
      y += 18;
      elements.push(text(PAD, y, cl.style, { size: 14, fill: '#bc8cff', weight: '600' }));
    }
    if (cl.style_description) {
      const descLines = wordWrap(cl.style_description, 66);
      for (const line of descLines) {
        y += 16;
        elements.push(text(PAD, y, line, { size: 12, fill: colors.dimText, style: 'italic' }));
      }
    }

    const statsLine = [
      cl.sessions ? `${fmtNum(cl.sessions)} sessions` : '',
      messages ? `${fmtNum(messages)} messages` : '',
      fmtSince ? `since ${fmtSince}` : '',
    ].filter(Boolean).join(' \u00B7 ');
    if (statsLine) {
      y += 18;
      elements.push(text(PAD, y, statsLine, { size: 12, fill: colors.text }));
    }

    if (model) {
      y += 16;
      elements.push(text(PAD, y, 'Model', { size: 11, fill: colors.dimText }));
      elements.push(text(PAD + 70, y, model, { size: 12, fill: colors.text }));
    }
    if (cl.rhythm) {
      y += 16;
      const peakStr = cl.peak_hours ? ` (peak: ${cl.peak_hours.join(', ')})` : '';
      const rhythmText = cl.rhythm + peakStr;
      elements.push(text(PAD, y, 'Rhythm', { size: 11, fill: colors.dimText }));
      const rhythmLines = wordWrap(rhythmText, 58);
      elements.push(text(PAD + 70, y, rhythmLines[0], { size: 12, fill: colors.text }));
      for (let r = 1; r < rhythmLines.length; r++) {
        y += 16;
        elements.push(text(PAD + 70, y, rhythmLines[r], { size: 12, fill: colors.text }));
      }
    }

    // Heatmap: 24 rects (supports both hour_distribution and 7-day heatmap matrix)
    const hourDist = buildHourDist(cl);
    if (hourDist && hourDist.length === 24) {
      const { data: rotated, startHour } = rotateHeatmap(hourDist);
      const labels = heatmapAxisLabels(startHour);
      const max = Math.max(...rotated, 1);
      const cellW = 20;
      const cellH = 8;
      const gap = 2;
      y += 16;
      rotated.forEach((v, i) => {
        const opacity = v === 0 ? 0.06 : 0.15 + (v / max) * 0.85;
        const x = PAD + i * (cellW + gap);
        elements.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="1" fill="#DA7756" opacity="${opacity.toFixed(2)}"/>`);
      });
      y += cellH + 6;
      const labelPositions = [0, 6, 12, 18, 23];
      for (let li = 0; li < labels.length; li++) {
        elements.push(text(PAD + labelPositions[li] * (cellW + gap), y, labels[li], { size: 9, fill: colors.muted }));
      }
    }
  }

  // Footer
  y += 24;
  elements.push(text(W / 2, y, 'devcard', {
    size: 10,
    fill: colors.muted,
    anchor: 'middle',
    style: 'italic',
  }));

  y += 18;
  const H = y;

  // Assemble SVG
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&amp;display=swap');
    </style>
    <clipPath id="card-clip"><rect width="${W}" height="${H}" rx="12"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="12" fill="${colors.bg}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${colors.border}" stroke-width="1"/>
  <g clip-path="url(#card-clip)">
  ${elements.join('\n  ')}
  </g>
</svg>`;
}

function wordWrap(text, maxChars) {
  const result = [];
  for (const para of text.split('\n')) {
    if (para.trim() === '') { result.push(''); continue; }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      if (line.length + word.length + 1 > maxChars) {
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
  let input = '';
  const stdin = process.stdin;
  stdin.setEncoding('utf-8');

  const outputPath = process.argv[2] || 'devcard.svg';

  if (stdin.isTTY) {
    console.error('Usage: cat ~/.devcard/devcard.yaml | node export-card.mjs [output.svg]');
    process.exit(1);
  }

  stdin.on('data', (chunk) => { input += chunk; });
  stdin.on('end', () => {
    try {
      const data = parseYaml(input);
      const svg = generateSVG(data);
      writeFileSync(outputPath, svg, 'utf-8');
      console.log(`Exported devcard to ${outputPath}`);
    } catch (err) {
      console.error(`Error exporting card: ${err.message}`);
      process.exit(1);
    }
  });
}

// Run CLI when executed directly
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''));
if (isMain) main();

export { generateSVG };

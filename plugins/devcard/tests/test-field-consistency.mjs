import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../scripts/lib/parse-yaml.mjs';
import { renderCard } from '../scripts/render-card.mjs';
import { generateSVG } from '../scripts/export-card.mjs';
import { generateHTML } from '../scripts/serve-card.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name) {
  return parseYaml(readFileSync(join(__dirname, 'fixtures', name), 'utf-8'));
}

describe('field name consistency — new names', () => {
  const data = loadFixture('full-card.yaml');

  it('render-card.mjs uses total_messages from new field name', () => {
    const output = renderCard(data);
    assert.ok(output.includes('12'), 'Should show message count derived from total_messages (12450 -> 12.5K or 12K)');
  });

  it('render-card.mjs uses active_since from new field name', () => {
    const output = renderCard(data);
    assert.ok(output.includes('2024'), 'Should show year from active_since');
  });

  it('render-card.mjs uses primary_model from new field name', () => {
    const output = renderCard(data);
    assert.ok(output.includes('sonnet'), 'Should show model name from primary_model');
  });

  it('export-card.mjs uses new field names', () => {
    const svg = generateSVG(data);
    assert.ok(svg.includes('12'), 'SVG should contain message count');
    assert.ok(svg.includes('2024'), 'SVG should contain year from active_since');
    assert.ok(svg.includes('sonnet'), 'SVG should contain model from primary_model');
  });

  it('serve-card.mjs uses new field names', () => {
    const html = generateHTML(data);
    assert.ok(html.includes('12'), 'HTML should contain message count');
    assert.ok(html.includes('sonnet'), 'HTML should contain model from primary_model');
  });

  it('all renderers produce heatmap from 7-day matrix', () => {
    const termOutput = renderCard(data);
    const svgOutput = generateSVG(data);
    const htmlOutput = generateHTML(data);
    // Terminal heatmap uses block characters
    assert.ok(termOutput.includes('░') || termOutput.includes('▒') || termOutput.includes('▓') || termOutput.includes('█'),
      'Terminal should contain heatmap block chars');
    // SVG heatmap uses rect elements with DA7756 fill
    assert.ok(svgOutput.includes('DA7756'), 'SVG should contain heatmap rects');
    // HTML heatmap uses heatmap-cell divs
    assert.ok(htmlOutput.includes('heatmap-cell'), 'HTML should contain heatmap cells');
  });
});

describe('field name consistency — legacy names', () => {
  const data = loadFixture('legacy-card.yaml');

  it('render-card.mjs reads legacy messages field', () => {
    const output = renderCard(data);
    assert.ok(output.includes('5K') || output.includes('5000') || output.includes('5,000'),
      'Should show message count from legacy messages field');
  });

  it('render-card.mjs reads legacy since field', () => {
    const output = renderCard(data);
    assert.ok(output.includes('2024'), 'Should show year from legacy since field');
  });

  it('render-card.mjs reads legacy model field', () => {
    const output = renderCard(data);
    assert.ok(output.includes('sonnet'), 'Should show model from legacy model field');
  });

  it('export-card.mjs reads legacy field names', () => {
    const svg = generateSVG(data);
    assert.ok(svg.includes('5K') || svg.includes('5000'), 'SVG should contain legacy message count');
    assert.ok(svg.includes('2024'), 'SVG should contain year from legacy since');
    assert.ok(svg.includes('sonnet'), 'SVG should contain legacy model');
  });

  it('serve-card.mjs reads legacy field names', () => {
    const html = generateHTML(data);
    assert.ok(html.includes('sonnet'), 'HTML should contain legacy model');
  });

  it('all renderers produce heatmap from legacy hour_distribution', () => {
    const termOutput = renderCard(data);
    const svgOutput = generateSVG(data);
    const htmlOutput = generateHTML(data);
    assert.ok(termOutput.includes('░') || termOutput.includes('▒') || termOutput.includes('▓') || termOutput.includes('█'),
      'Terminal should contain heatmap block chars from legacy hour_distribution');
    assert.ok(svgOutput.includes('DA7756'), 'SVG should contain heatmap rects from legacy hour_distribution');
    assert.ok(htmlOutput.includes('heatmap-cell'), 'HTML should contain heatmap cells from legacy hour_distribution');
  });
});

describe('archetype header consistency', () => {
  it('render-card.mjs shows archetype with prefix in header', () => {
    const data = loadFixture('full-card.yaml');
    const output = renderCard(data);
    assert.ok(output.includes('The Architect'), 'Should contain archetype name');
    assert.ok(output.includes("Claude's read:"), 'Should contain archetype prefix');
  });

  it('export-card.mjs shows archetype with prefix in header', () => {
    const data = loadFixture('full-card.yaml');
    const svg = generateSVG(data);
    assert.ok(svg.includes('The Architect'), 'SVG should contain archetype name');
    assert.ok(svg.includes("Claude&#x27;s read:") || svg.includes("Claude's read:"), 'SVG should contain archetype prefix');
  });

  it('serve-card.mjs shows archetype with prefix in header', () => {
    const data = loadFixture('full-card.yaml');
    const html = generateHTML(data);
    assert.ok(html.includes('The Architect'), 'HTML should contain archetype name');
    assert.ok(html.includes("Claude&#x27;s read:") || html.includes("Claude's read:"), 'HTML should contain archetype prefix');
  });

  it('export-card.mjs does NOT show archetype inside Claude\'s Take', () => {
    const data = { name: 'Test', archetype: 'The Builder' };
    const svg = generateSVG(data);
    // If archetype is the only Claude-related field, CLAUDE'S TAKE section should not appear
    assert.ok(!svg.includes("CLAUDE'S TAKE"), 'SVG should not have Claude\'s Take section for archetype-only card');
  });

  it('card without archetype renders without errors', () => {
    const data = loadFixture('empty-claude.yaml');
    assert.doesNotThrow(() => renderCard(data));
    assert.doesNotThrow(() => generateSVG(data));
    assert.doesNotThrow(() => generateHTML(data));
  });
});

describe('section rendering — missing sections', () => {
  it('card with no claude section renders without error', () => {
    const data = loadFixture('empty-claude.yaml');
    const termOutput = renderCard(data);
    const svgOutput = generateSVG(data);
    const htmlOutput = generateHTML(data);
    // Terminal renders name as ASCII art, so check for presence of Analog Developer (the title)
    assert.ok(termOutput.includes('Analog Developer'), 'Terminal output should show title');
    assert.ok(svgOutput.includes('NO CLAUDE'), 'SVG should show name');
    assert.ok(htmlOutput.includes('No Claude'), 'HTML should show name');
    // Should not contain Claude Code section
    assert.ok(!termOutput.includes('Claude Code'), 'Terminal should not have Claude Code section');
    assert.ok(!svgOutput.includes('CLAUDE CODE'), 'SVG should not have Claude Code section');
  });

  it('card with no projects omits projects section', () => {
    const data = { name: 'Test' };
    const termOutput = renderCard(data);
    const svgOutput = generateSVG(data);
    assert.ok(!termOutput.includes('Projects'), 'Terminal should not have Projects section');
    assert.ok(!svgOutput.includes('PROJECTS'), 'SVG should not have Projects section');
  });

  it('minimal card renders without error', () => {
    const data = loadFixture('minimal-card.yaml');
    assert.doesNotThrow(() => renderCard(data));
    assert.doesNotThrow(() => generateSVG(data));
    assert.doesNotThrow(() => generateHTML(data));
  });

  it('card with all sections renders all of them', () => {
    const data = loadFixture('full-card.yaml');
    const termOutput = renderCard(data);
    assert.ok(termOutput.includes('Bio'), 'Should have Bio');
    assert.ok(termOutput.includes('Stack'), 'Should have Stack');
    assert.ok(termOutput.includes('Interests'), 'Should have Interests');
    assert.ok(termOutput.includes('Projects'), 'Should have Projects');
    assert.ok(termOutput.includes('Experience'), 'Should have Experience');
    assert.ok(termOutput.includes('Links'), 'Should have Links');
    assert.ok(termOutput.includes('Claude Code'), 'Should have Claude Code');
  });
});

describe('HTML/SVG safety — escaping', () => {
  it('escapes HTML special characters in name', () => {
    const data = { name: '<script>alert("xss")</script>' };
    const svg = generateSVG(data);
    assert.ok(!svg.includes('<script>'), 'SVG should escape <script> tags');
    assert.ok(svg.includes('&lt;script&gt;'), 'SVG should contain escaped version');
  });

  it('escapes HTML special characters in bio', () => {
    const data = { name: 'Test', bio: 'I love <b>bold</b> & "quotes"' };
    const html = generateHTML(data);
    assert.ok(!html.includes('<b>bold</b>'), 'HTML should escape user-provided HTML tags');
    assert.ok(html.includes('&lt;b&gt;'), 'Should contain escaped tags');
    assert.ok(html.includes('&amp;'), 'Should escape ampersands');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml } from '../scripts/lib/parse-yaml.mjs';

describe('parseYaml', () => {
  it('parses simple key-value pairs', () => {
    const result = parseYaml('name: Jane\ntitle: Engineer');
    assert.equal(result.name, 'Jane');
    assert.equal(result.title, 'Engineer');
  });

  it('parses nested objects', () => {
    const result = parseYaml('stack:\n  languages:\n    - Python\n    - Go\n  tools:\n    - Docker');
    assert.deepEqual(result.stack.languages, ['Python', 'Go']);
    assert.deepEqual(result.stack.tools, ['Docker']);
  });

  it('parses lists of scalars', () => {
    const result = parseYaml('interests:\n  - coding\n  - music\n  - hiking');
    assert.deepEqual(result.interests, ['coding', 'music', 'hiking']);
  });

  it('parses lists of objects', () => {
    const result = parseYaml(
      'projects:\n  - name: foo\n    status: shipped\n  - name: bar\n    status: wip'
    );
    assert.equal(result.projects.length, 2);
    assert.equal(result.projects[0].name, 'foo');
    assert.equal(result.projects[0].status, 'shipped');
    assert.equal(result.projects[1].name, 'bar');
  });

  it('parses inline arrays [a, b, c]', () => {
    const result = parseYaml('peak_hours: [10, 14, 16]');
    assert.deepEqual(result.peak_hours, [10, 14, 16]);
  });

  it('parses inline arrays on next line after key', () => {
    const result = parseYaml('data:\n  [1, 2, 3, 4]');
    assert.deepEqual(result.data, [1, 2, 3, 4]);
  });

  it('parses folded multiline blocks (>)', () => {
    const result = parseYaml('about: >\n  This is a\n  folded block');
    assert.ok(result.about.includes('This is a'));
    assert.ok(result.about.includes('folded block'));
    // Folded blocks join lines with spaces, not newlines
    assert.ok(!result.about.includes('\n'));
  });

  it('parses literal multiline blocks (|)', () => {
    const result = parseYaml('about: |\n  Line one\n  Line two');
    assert.ok(result.about.includes('Line one'));
    assert.ok(result.about.includes('Line two'));
  });

  it('handles comments and empty lines', () => {
    const result = parseYaml('# This is a comment\nname: Test\n\n# Another comment\ntitle: Dev');
    assert.equal(result.name, 'Test');
    assert.equal(result.title, 'Dev');
  });

  it('coerces booleans', () => {
    const result = parseYaml('active: true\ndisabled: false');
    assert.equal(result.active, true);
    assert.equal(result.disabled, false);
  });

  it('coerces numbers', () => {
    const result = parseYaml('sessions: 342\nversion: 1.5');
    assert.equal(result.sessions, 342);
    assert.equal(result.version, 1.5);
  });

  it('coerces null', () => {
    const result = parseYaml('value: null');
    assert.equal(result.value, null);
  });

  it('preserves quoted strings', () => {
    const result = parseYaml('name: "true"\ncount: "42"');
    assert.equal(result.name, 'true');
    assert.equal(result.count, '42');
  });

  it('parses a full devcard YAML without error', () => {
    const yaml = `name: Jane Doe
title: Engineer
location: SF
bio: Hello world
stack:
  languages:
    - Python
    - Go
interests:
  - coding
projects:
  - name: foo
    status: shipped
    description: A cool project
claude:
  sessions: 100
  total_messages: 5000
  active_since: 2024-01-01
  primary_model: claude-sonnet-4-5-20250929
  heatmap:
    - [0, 0, 0, 0, 0, 1, 3, 8, 15, 22, 25, 20, 18, 16, 22, 19, 14, 8, 3, 1, 0, 0, 0, 0]`;
    const result = parseYaml(yaml);
    assert.equal(result.name, 'Jane Doe');
    assert.equal(result.claude.sessions, 100);
    assert.equal(result.claude.total_messages, 5000);
  });
});

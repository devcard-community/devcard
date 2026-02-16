// Shared zero-dependency YAML parser for devcard scripts.
// Handles: scalars, nested objects, lists of scalars, lists of objects,
// inline arrays [a, b, c], multi-line | and > blocks.

export function parseYaml(text) {
  const lines = text.split('\n');
  return parseBlock(lines, 0, 0).value;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function parseBlock(lines, start, baseIndent) {
  const result = Object.create(null);
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.replace(/\s+$/, '');

    if (stripped === '' || stripped.trimStart().startsWith('#')) { i++; continue; }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;
    if (indent > baseIndent && i > start) break;
    if (stripped.trimStart().startsWith('- ')) break;

    const keyMatch = stripped.match(/^(\s*)([\w.\-]+)\s*:\s*(.*)/);
    if (!keyMatch) { i++; continue; }

    const key = keyMatch[2];
    if (DANGEROUS_KEYS.has(key)) { i++; continue; }
    let val = keyMatch[3].replace(/\s+$/, '');

    if (val === '|' || val === '>') {
      const isFolded = val === '>';
      let multiline = '';
      i++;
      let blockIndent = -1;
      for (let j = i; j < lines.length; j++) {
        const s = lines[j].search(/\S/);
        if (s >= 0) { blockIndent = s; break; }
        i++;
      }
      if (blockIndent < 0) { result[key] = ''; continue; }
      while (i < lines.length) {
        const bl = lines[i];
        if (bl.trim() === '') {
          multiline += isFolded ? ' ' : '\n';
          i++;
          continue;
        }
        if (bl.search(/\S/) < blockIndent) break;
        const content = bl.slice(blockIndent);
        multiline += (isFolded && multiline && !multiline.endsWith(' ') && !multiline.endsWith('\n'))
          ? ' ' + content : content;
        if (!isFolded) multiline += '\n';
        i++;
      }
      result[key] = multiline.replace(/[\s\n]+$/, '');
      continue;
    }

    if (val === '') {
      i++;
      if (i >= lines.length) { result[key] = ''; continue; }
      const nextLine = lines[i];
      const nextIndent = nextLine.search(/\S/);
      if (nextIndent < 0) { result[key] = ''; continue; }

      // Inline array on next line: key:\n  [a, b, c]
      const trimmedNext = nextLine.trim();
      if (nextIndent > indent && trimmedNext.startsWith('[') && trimmedNext.endsWith(']')) {
        result[key] = trimmedNext.slice(1, -1).split(',').map(s => cleanValue(s.trim())).filter(v => v !== '');
        i++;
        continue;
      }

      if (nextIndent > indent && nextLine.trimStart().startsWith('- ')) {
        const list = [];
        while (i < lines.length) {
          const ll = lines[i];
          if (ll.trim() === '' || ll.trim().startsWith('#')) { i++; continue; }
          if (ll.search(/\S/) < nextIndent) break;
          if (ll.trimStart().startsWith('- ')) {
            const itemContent = ll.trimStart().slice(2).trim();
            if (itemContent.includes(': ')) {
              const obj = Object.create(null);
              const firstKv = itemContent.match(/([\w.\-]+)\s*:\s*(.*)/);
              if (firstKv && !DANGEROUS_KEYS.has(firstKv[1])) obj[firstKv[1]] = cleanValue(firstKv[2]);
              i++;
              const itemIndent = ll.search(/\S/) + 2;
              while (i < lines.length) {
                const il = lines[i];
                if (il.trim() === '' || il.trim().startsWith('#')) { i++; continue; }
                if (il.search(/\S/) < itemIndent) break;
                const kv = il.trim().match(/([\w.\-]+)\s*:\s*(.*)/);
                if (kv && !DANGEROUS_KEYS.has(kv[1])) obj[kv[1]] = cleanValue(kv[2]);
                i++;
              }
              list.push(obj);
            } else {
              list.push(cleanValue(itemContent));
              i++;
            }
          } else break;
        }
        result[key] = list;
        continue;
      } else if (nextIndent > indent) {
        const nested = parseBlock(lines, i, nextIndent);
        result[key] = nested.value;
        i = nested.nextIndex;
        continue;
      } else {
        result[key] = '';
        continue;
      }
    }

    if (val.startsWith('[') && val.endsWith(']')) {
      result[key] = val.slice(1, -1).split(',').map(s => cleanValue(s.trim())).filter(v => v !== '');
      i++;
      continue;
    }

    result[key] = cleanValue(val);
    i++;
  }

  return { value: result, nextIndex: i };
}

function cleanValue(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (v !== '' && !isNaN(v)) return Number(v);
  return v;
}

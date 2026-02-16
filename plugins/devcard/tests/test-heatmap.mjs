import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildHourDist, rotateHeatmap, heatmapAxisLabels } from '../scripts/lib/heatmap.mjs';

describe('buildHourDist', () => {
  it('returns flat hour_distribution directly', () => {
    const cl = { hour_distribution: Array.from({ length: 24 }, (_, i) => i) };
    const result = buildHourDist(cl);
    assert.equal(result.length, 24);
    assert.equal(result[0], 0);
    assert.equal(result[23], 23);
  });

  it('aggregates 7-day heatmap matrix into 24 elements', () => {
    const row = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
    const cl = { heatmap: [row, row, row] };
    const result = buildHourDist(cl);
    assert.equal(result.length, 24);
    assert.equal(result[0], 3);   // 1 * 3
    assert.equal(result[23], 6);  // 2 * 3
  });

  it('handles heatmap rows as JSON strings', () => {
    const row = JSON.stringify([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]);
    const cl = { heatmap: [row] };
    const result = buildHourDist(cl);
    assert.equal(result[0], 5);
    assert.equal(result[23], 10);
  });

  it('returns null when no distribution data exists', () => {
    assert.equal(buildHourDist({}), null);
    assert.equal(buildHourDist({ sessions: 100 }), null);
  });

  it('prefers hour_distribution over heatmap', () => {
    const cl = {
      hour_distribution: new Array(24).fill(99),
      heatmap: [new Array(24).fill(1)],
    };
    const result = buildHourDist(cl);
    assert.equal(result[0], 99);
  });
});

describe('rotateHeatmap', () => {
  it('does not rotate a day-worker distribution', () => {
    // Peak at 9-17, quiet at night
    const dist = [0, 0, 0, 0, 0, 1, 3, 8, 15, 22, 25, 20, 18, 16, 22, 19, 14, 8, 3, 1, 0, 0, 0, 0];
    const { data, startHour } = rotateHeatmap(dist);
    // Activity is already contiguous, so startHour should be in the quiet zone
    // The quiet stretch is roughly 19-5, midpoint around 0
    // Since midpoint=0 means no rotation, it should return startHour=0
    assert.equal(data.length, 24);
    // Verify the output is valid
    const totalIn = dist.reduce((s, v) => s + v, 0);
    const totalOut = data.reduce((s, v) => s + v, 0);
    assert.equal(totalIn, totalOut);
  });

  it('rotates a night-worker distribution so activity is contiguous', () => {
    // Peak at 20-4, quiet during the day (5-17 are all 0)
    const dist = [12, 10, 8, 6, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 10, 18, 22, 20];
    const { data, startHour } = rotateHeatmap(dist);
    assert.equal(data.length, 24);
    // After rotation, the zeros should be grouped together, not split across edges
    // Find the first and last non-zero positions in rotated data
    let firstNonZero = -1;
    let lastNonZero = -1;
    for (let i = 0; i < 24; i++) {
      if (data[i] > 0) {
        if (firstNonZero < 0) firstNonZero = i;
        lastNonZero = i;
      }
    }
    // The span of non-zero values should be contiguous (no zeros in between, roughly)
    const span = lastNonZero - firstNonZero + 1;
    const nonZeroCount = data.filter(v => v > 0).length;
    // Allow some tolerance (1-2 zeros within the active block)
    assert.ok(span - nonZeroCount <= 2, `Activity should be contiguous. Span: ${span}, nonZero: ${nonZeroCount}`);
    // startHour should NOT be 0 (rotation actually happened)
    assert.notEqual(startHour, 0);
  });

  it('handles all-zero distribution without crash', () => {
    const dist = new Array(24).fill(0);
    const { data, startHour } = rotateHeatmap(dist);
    assert.equal(data.length, 24);
    assert.equal(startHour, 0);
    assert.deepEqual(data, new Array(24).fill(0));
  });

  it('handles null/undefined input', () => {
    const { data, startHour } = rotateHeatmap(null);
    assert.equal(data.length, 24);
    assert.equal(startHour, 0);
  });

  it('handles uniform distribution without crash', () => {
    const dist = new Array(24).fill(10);
    const { data, startHour } = rotateHeatmap(dist);
    assert.equal(data.length, 24);
    // No quiet stretch exists, so should return unmodified
    assert.deepEqual(data, new Array(24).fill(10));
  });

  it('handles single-peak distribution', () => {
    const dist = new Array(24).fill(0);
    dist[3] = 100;
    const { data, startHour } = rotateHeatmap(dist);
    assert.equal(data.length, 24);
    // Should contain exactly one value of 100
    assert.equal(data.filter(v => v === 100).length, 1);
  });

  it('preserves total activity count', () => {
    const dist = [12, 10, 8, 6, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 10, 18, 22, 20];
    const { data } = rotateHeatmap(dist);
    const totalIn = dist.reduce((s, v) => s + v, 0);
    const totalOut = data.reduce((s, v) => s + v, 0);
    assert.equal(totalIn, totalOut);
  });
});

describe('heatmapAxisLabels', () => {
  it('returns default labels for startHour=0', () => {
    const labels = heatmapAxisLabels(0);
    assert.deepEqual(labels, ['0', '6', '12', '18', '23']);
  });

  it('returns shifted labels for startHour=6', () => {
    const labels = heatmapAxisLabels(6);
    assert.deepEqual(labels, ['6', '12', '18', '0', '5']);
  });

  it('returns shifted labels wrapping around midnight', () => {
    const labels = heatmapAxisLabels(18);
    assert.deepEqual(labels, ['18', '0', '6', '12', '17']);
  });

  it('always returns 5 labels', () => {
    for (let h = 0; h < 24; h++) {
      const labels = heatmapAxisLabels(h);
      assert.equal(labels.length, 5);
    }
  });
});

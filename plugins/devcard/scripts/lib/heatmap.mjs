// Shared heatmap utilities for devcard renderers.

/**
 * Build a 24-element hour distribution from either a flat array or a 7-day heatmap matrix.
 * Returns null if no valid distribution data is found.
 *
 * @param {object} cl - The claude section of parsed YAML
 * @returns {number[] | null} 24-element array or null
 */
export function buildHourDist(cl) {
  if (cl.hour_distribution && Array.isArray(cl.hour_distribution) && cl.hour_distribution.length === 24) {
    return cl.hour_distribution.map(Number);
  }
  if (cl.heatmap && Array.isArray(cl.heatmap)) {
    const dist = new Array(24).fill(0);
    for (const row of cl.heatmap) {
      let nums = [];
      if (typeof row === 'string') {
        try { nums = JSON.parse(row); } catch { /* skip malformed row */ }
        if (!Array.isArray(nums)) nums = [];
      } else if (Array.isArray(row)) {
        nums = row;
      }
      for (let i = 0; i < 24 && i < nums.length; i++) {
        dist[i] += Number(nums[i]) || 0;
      }
    }
    return dist;
  }
  return null;
}

/**
 * Find the optimal starting hour for a heatmap so that the activity block
 * appears as a continuous band rather than split across edges.
 *
 * Algorithm: find the midpoint of the longest contiguous low-activity stretch
 * (hours at or below 10% of max). That midpoint becomes the start of the axis,
 * placing the "quiet" block in the center-left and activity as a single mass.
 *
 * @param {number[]} dist - 24-element hour distribution
 * @returns {{ data: number[], startHour: number }}
 */
export function rotateHeatmap(dist) {
  if (!dist || !Array.isArray(dist) || dist.length !== 24) {
    return { data: dist || new Array(24).fill(0), startHour: 0 };
  }

  const total = dist.reduce((s, v) => s + v, 0);
  if (total === 0) {
    return { data: [...dist], startHour: 0 };
  }

  const max = Math.max(...dist);
  const threshold = max * 0.1;

  // Find the longest contiguous stretch of low-activity hours (wrapping around)
  // We scan 48 hours (doubled to handle wrap-around)
  let bestStart = 0;
  let bestLen = 0;
  let runStart = -1;
  let runLen = 0;

  for (let i = 0; i < 48; i++) {
    const hour = i % 24;
    if (dist[hour] <= threshold) {
      if (runStart < 0) runStart = i;
      runLen++;
      // Cap at 24 to avoid full-wrap counting the same hours twice
      if (runLen > 24) runLen = 24;
      if (runLen > bestLen) {
        bestLen = runLen;
        bestStart = runStart;
      }
    } else {
      runStart = -1;
      runLen = 0;
    }
  }

  if (bestLen === 0) {
    // Uniform non-zero distribution, no clear quiet period
    return { data: [...dist], startHour: 0 };
  }

  // Use the midpoint of the quiet stretch as the start hour
  const midpoint = (bestStart + Math.floor(bestLen / 2)) % 24;

  // Only rotate if it actually helps — if midpoint is 0, no rotation needed
  // Also skip rotation if the quiet block is too short to matter (< 3 hours)
  if (midpoint === 0 || bestLen < 3) {
    return { data: [...dist], startHour: 0 };
  }

  const rotated = new Array(24);
  for (let i = 0; i < 24; i++) {
    rotated[i] = dist[(i + midpoint) % 24];
  }

  return { data: rotated, startHour: midpoint };
}

/**
 * Generate axis labels for a rotated heatmap.
 * Returns 5 labels evenly spaced across the 24-hour range.
 *
 * @param {number} startHour - The starting hour after rotation
 * @returns {string[]} 5 label strings
 */
export function heatmapAxisLabels(startHour) {
  // Show labels at positions 0, 6, 12, 18, 23 of the rotated array
  const positions = [0, 6, 12, 18, 23];
  return positions.map(pos => String((pos + startHour) % 24));
}

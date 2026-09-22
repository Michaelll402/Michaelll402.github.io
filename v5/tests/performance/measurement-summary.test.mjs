import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeNumbers, frameSummary, blockingAfterPaint } from '../helpers/measurement-summary.mjs';

test('missing samples remain unavailable rather than becoming a zero performance claim', () => {
  assert.deepEqual(summarizeNumbers([null, undefined, NaN]), { count: 0, median: null, min: null, max: null });
});
test('even repeat counts use the two central measurements and preserve outliers', () => {
  assert.deepEqual(summarizeNumbers([10, 50, 20, 900]), { count: 4, median: 35, min: 10, max: 900 });
});
test('frame summary identifies slow frames without assuming that every display is 60Hz', () => {
  const actual = frameSummary([8, 9, 16, 34, 70]);
  assert.equal(actual.frames, 5);
  assert.equal(actual.over33ms, 2);
  assert.equal(actual.over50ms, 1);
  assert.equal(actual.p95, 70);
});
test('blocking proxy excludes pre-paint work and counts only long task excess', () => {
  assert.equal(blockingAfterPaint([{ startTime: 10, duration: 100 }, { startTime: 200, duration: 80 }, { startTime: 300, duration: 40 }], 150), 30);
});

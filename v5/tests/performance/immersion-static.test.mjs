import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountImmersion } from '../../src/scripts/immersion.ts';

// Removing the static-device early exit makes these cases touch the DOM and
// schedule the continuous decoration engine. The server scene needs neither.
for (const scenario of [
  { name: 'touch device', fine: false, reduced: false, width: 1280, height: 1024 },
  { name: 'narrow viewport', fine: true, reduced: false, width: 390, height: 844 },
  { name: 'reduced motion', fine: true, reduced: true, width: 1440, height: 900 },
]) {
  test(`immersion keeps a complete static scene on ${scenario.name}`, () => {
    const keys = ['matchMedia', 'innerWidth', 'innerHeight', 'document'];
    const previous = keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
    const fail = () => assert.fail('static scenes must not measure, build decoration, or install animation work');
    Object.defineProperties(globalThis, {
      matchMedia: { configurable: true, value: query => ({ matches: query.includes('reduced-motion') ? scenario.reduced : scenario.fine }) },
      innerWidth: { configurable: true, value: scenario.width },
      innerHeight: { configurable: true, value: scenario.height },
      document: { configurable: true, value: { querySelectorAll: fail, body: { dataset: {} } } },
    });
    const stage = { dataset: {}, querySelector: fail, querySelectorAll: fail };
    try {
      const dispose = mountImmersion(stage);
      assert.equal(stage.dataset.mounted, '1');
      dispose();
      assert.equal(stage.dataset.mounted, undefined);
      dispose();
    } finally {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
}

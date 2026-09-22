import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderingPolicy } from '../../src/webgl/render-policy.ts';

// The boundary protects low-power devices from downloading desktop dependencies.
// These capability fixtures are independent of a user-agent string.
const scenarios = [
  ['capable desktop', { width: 1440, cores: 16, memory: 16 }, { renderer: 'webgl', tier: 'high' }],
  ['ordinary laptop', { width: 1366, cores: 8, memory: 8 }, { renderer: 'webgl', tier: 'medium' }],
  ['touch tablet', { width: 1024, cores: 16, memory: 8, touch: true }, { renderer: 'static', tier: 'low' }],
  ['narrow phone', { width: 390, cores: 8, memory: 8 }, { renderer: 'static', tier: 'low' }],
  ['low-memory desktop', { width: 1440, cores: 16, memory: 4 }, { renderer: 'static', tier: 'low' }],
  ['reduced motion', { width: 1440, cores: 16, memory: 16, reduced: true }, { renderer: 'static', tier: 'low' }],
  ['save data', { width: 1440, cores: 16, memory: 16, saveData: true }, { renderer: 'static', tier: 'low' }],
];
for (const [name, capabilities, expected] of scenarios) {
  test(name, () => {
    const previous = Object.fromEntries(['navigator', 'innerWidth', 'matchMedia'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    Object.defineProperties(globalThis, {
      navigator: { configurable: true, value: { hardwareConcurrency: capabilities.cores, deviceMemory: capabilities.memory, connection: { saveData: capabilities.saveData } } },
      innerWidth: { configurable: true, value: capabilities.width },
      matchMedia: { configurable: true, value: query => ({ matches: query.includes('reduced-motion') ? !!capabilities.reduced : !!capabilities.touch }) },
    });
    try { assert.deepEqual(renderingPolicy(), expected); }
    finally { for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
  });
}

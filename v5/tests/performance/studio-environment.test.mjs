import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { DataUtils } from 'three';
import { decodeEnvironmentBody } from '../../src/webgl/decode-environment.ts';

const metadata = JSON.parse(readFileSync(new URL('../../src/assets/world/studio-env-64.json', import.meta.url), 'utf8'));
const compressed = readFileSync(new URL('../../src/assets/world/studio-env-64.rgba16f.gz', import.meta.url));
const pixels = gunzipSync(compressed);

test('baked studio texture is complete and matches its recorded capture', () => {
  assert.equal(pixels.length, metadata.width * metadata.height * 4 * 2);
  assert.equal(pixels.length, metadata.byteLength);
  assert.equal(createHash('sha256').update(pixels).digest('hex'), metadata.sha256);
  assert.equal(createHash('sha256').update(compressed).digest('hex'), metadata.compressedSha256);
});

test('studio lighting retains finite HDR values instead of an 8-bit approximation', () => {
  let peak = 0;
  let lit = 0;
  for (let i = 0; i < pixels.length; i += 8) {
    for (let channel = 0; channel < 3; channel++) {
      const value = DataUtils.fromHalfFloat(pixels.readUInt16LE(i + channel * 2));
      assert.ok(Number.isFinite(value) && value >= 0);
      if (value > 0) lit++;
      peak = Math.max(peak, value);
    }
  }
  assert.ok(peak > 1, 'bright studio lights must survive above display white');
  assert.ok(lit > 10000, 'the asset must contain the studio environment, not an empty atlas');
});
for (const [name, bytes] of [['opaque gzip', compressed], ['HTTP-decoded body', pixels]]) {
  test(`studio texture loads from ${name}`, async () => {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const result = await decodeEnvironmentBody(buffer, metadata.byteLength);
    assert.equal(createHash('sha256').update(new Uint8Array(result.buffer)).digest('hex'), metadata.sha256);
  });
}
test('invalid studio body fails without manufacturing a texture', async () => {
  await assert.rejects(decodeEnvironmentBody(new Uint8Array([0, 1, 2]).buffer, metadata.byteLength), /encoding/);
});

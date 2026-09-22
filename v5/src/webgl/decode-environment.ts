/** Hosts may serve .gz with Content-Encoding:gzip (fetch already decodes it),
 * or as an opaque asset. Accept both without double-decompressing the body. */
export async function decodeEnvironmentBody(body: ArrayBuffer, expectedBytes: number) {
  let decoded = body;
  if (body.byteLength !== expectedBytes) {
    const bytes = new Uint8Array(body);
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error('Invalid studio environment encoding');
    decoded = await new Response(
      new Blob([body]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).arrayBuffer();
  }
  if (decoded.byteLength !== expectedBytes) throw new Error('Incomplete studio environment');
  return new Uint16Array(decoded);
}

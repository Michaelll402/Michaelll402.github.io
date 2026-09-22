import { CubeUVReflectionMapping, DataTexture, HalfFloatType, LinearFilter, LinearSRGBColorSpace, RGBAFormat } from "three";
import environmentUrl from "../assets/world/studio-env-64.rgba16f.gz?url";
import metadata from "../assets/world/studio-env-64.json";
import { decodeEnvironmentBody } from './decode-environment';

let pixels: Promise<Uint16Array> | undefined;

/** Same authored three-plane lighting, baked offline at 64px per cube face.
 * Half-float HDR values and the CubeUV roughness levels are preserved. Only the
 * small high-tier lens downloads this asset, after the base world is visible. */
export async function loadStudioEnvironment(): Promise<DataTexture> {
  pixels ??= (async () => {
    performance.mark("world:environment-requested");
    const response = await fetch(environmentUrl);
    if (!response.ok || !response.body) throw new Error("Studio environment could not be loaded");
    const values = await decodeEnvironmentBody(await response.arrayBuffer(), metadata.byteLength);
    performance.mark("world:environment-decoded");
    return values;
  })().catch((error) => {
    pixels = undefined;
    throw error;
  });
  const texture = new DataTexture(await pixels, metadata.width, metadata.height, RGBAFormat, HalfFloatType);
  texture.name = "Portfolio studio / prefiltered CubeUV";
  texture.mapping = CubeUVReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

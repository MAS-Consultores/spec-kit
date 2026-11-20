import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

/** JPEG and WebP output quality. Input stays PNG or JPG only. */
export const RASTER_OUTPUT_QUALITY = 80;

export const IMAGE_VARIANTS = {
  avatar: [
    { width: 128, height: 128 },
    { width: 512, height: 512 },
  ],
  banner: [{ width: 1600, height: 500 }],
  cover: [{ width: 1280, height: 720 }],
} as const;

export type ImageKind = keyof typeof IMAGE_VARIANTS;
export type RasterOutput = "jpeg" | "webp";

function isAcceptedMime(mime: string): mime is "image/jpeg" | "image/png" {
  return mime === "image/jpeg" || mime === "image/png";
}

/**
 * Accepts PNG and JPG by magic bytes. HEIC and WebP are rejected.
 * Client originalname and mimetype are not consulted.
 */
export async function readAcceptedImage(bytes: Uint8Array): Promise<"image/jpeg" | "image/png"> {
  const found = await fileTypeFromBuffer(bytes);
  if (found === undefined || !isAcceptedMime(found.mime)) {
    throw new Error("Only PNG and JPG are accepted. HEIC and WebP are not.");
  }
  return found.mime;
}

/**
 * Applies EXIF orientation, drops metadata, and center-crops to a fixed size.
 * The browser receives this buffer, never the upload bytes.
 */
async function renderImageVariant(
  bytes: Uint8Array,
  size: { width: number; height: number },
  output: RasterOutput,
): Promise<Buffer> {
  const pipeline = sharp(bytes)
    .rotate()
    .resize({ width: size.width, height: size.height, fit: "cover", position: "centre" });
  if (output === "jpeg") {
    return pipeline.jpeg({ quality: RASTER_OUTPUT_QUALITY }).toBuffer();
  }
  return pipeline.webp({ quality: RASTER_OUTPUT_QUALITY }).toBuffer();
}

export async function renderImageSet(
  bytes: Uint8Array,
  kind: ImageKind,
  output: RasterOutput,
): Promise<Buffer[]> {
  await readAcceptedImage(bytes);
  const rendered: Buffer[] = [];
  for (const size of IMAGE_VARIANTS[kind]) {
    rendered.push(await renderImageVariant(bytes, size, output));
  }
  return rendered;
}

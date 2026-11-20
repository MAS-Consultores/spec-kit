import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  IMAGE_VARIANTS,
  RASTER_OUTPUT_QUALITY,
  readAcceptedImage,
  renderImageSet,
  type ImageKind,
} from "./normalize-image.js";

function firstVariant(buffers: readonly Buffer[]): Buffer {
  const output = buffers[0];
  if (output === undefined) {
    throw new Error("image variant missing");
  }
  return output;
}

async function orientedJpeg(): Promise<Buffer> {
  const pixels = Buffer.from([255, 0, 0, 0, 0, 255]);
  return sharp(pixels, { raw: { width: 2, height: 1, channels: 3 } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("normalize image", () => {
  it("accepts png and jpg and rejects webp", async () => {
    const jpeg = await orientedJpeg();
    expect(await readAcceptedImage(jpeg)).toBe("image/jpeg");
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    expect(await readAcceptedImage(png)).toBe("image/png");
    const webp = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .webp()
      .toBuffer();
    await expect(readAcceptedImage(webp)).rejects.toThrow(/PNG and JPG/);
  });

  it("rotates from exif, strips metadata, and keeps the variant size", async () => {
    const source = await orientedJpeg();
    const before = await sharp(source).metadata();
    expect(before.orientation).toBe(6);
    const kind: ImageKind = "avatar";
    const size = IMAGE_VARIANTS[kind][0];
    const rendered = await renderImageSet(source, kind, "jpeg");
    expect(rendered).toHaveLength(IMAGE_VARIANTS[kind].length);
    const output = firstVariant(rendered);
    expect(output.equals(source)).toBe(false);
    const after = await sharp(output).metadata();
    expect(after.width).toBe(size.width);
    expect(after.height).toBe(size.height);
    expect(after.orientation).toBeUndefined();
    expect(after.exif).toBeUndefined();
    const oracle = await sharp(source)
      .rotate()
      .resize({ width: size.width, height: size.height, fit: "cover", position: "centre" })
      .jpeg({ quality: RASTER_OUTPUT_QUALITY })
      .toBuffer();
    const skipped = await sharp(source)
      .resize({ width: size.width, height: size.height, fit: "cover", position: "centre" })
      .jpeg({ quality: RASTER_OUTPUT_QUALITY })
      .toBuffer();
    expect(output.equals(oracle)).toBe(true);
    expect(output.equals(skipped)).toBe(false);
  });
});

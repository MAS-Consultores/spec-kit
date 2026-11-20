import { inflateRaw } from "node:zlib";

export function openZip(payload: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    inflateRaw(payload, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

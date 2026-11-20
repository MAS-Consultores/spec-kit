export const embedded = "data:image/png;base64,aaaa";

export class FilesService {
  store(fileContent: string, dataUrl: string): Buffer {
    const fromField = Buffer.from(fileContent, "base64");
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64").subarray(0, fromField.length);
  }
}

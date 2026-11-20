export function accept(file: { originalname: string; mimetype: string }): boolean {
  return file.mimetype === "image/png" || file.originalname.endsWith(".png");
}

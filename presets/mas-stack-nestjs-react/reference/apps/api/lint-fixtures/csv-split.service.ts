export function rows(fileText: string): string[][] {
  return fileText.split("\n").map((line) => line.split(","));
}

export function semicolon(csvText: string): string[] {
  return csvText.split(";");
}

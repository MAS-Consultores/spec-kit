export function hasRows(sheetXml: string): boolean {
  return /<sheetData[\s\S]*<row[\s\S]*<c /.test(sheetXml) || new RegExp("sheet1.xml").test(sheetXml);
}

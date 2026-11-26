/**
 * Fail when a staged path is junk or user data. Used from lint-staged.
 */
const junk = /(\.DS_Store$|Thumbs\.db$|Zone\.Identifier$|\.log$|\.code-workspace$|(^|\/)tmp-|_tmp\.|\.orig$|\.swp$|\.(pfx|p12|pem|key|xlsx|xls|csv|mbz)$|\.sql\.gz$)/;

const bad = process.argv.slice(2).filter((name) => junk.test(name.replaceAll("\\", "/")));
if (bad.length) {
  console.error(`archivo prohibido: ${bad.join(", ")}`);
  process.exit(1);
}

import fs from "node:fs";
import { docxBufferToMarkdown } from "../src/lib/docx-to-markdown";
import { parseMcqTextToDraftQuestions } from "../src/lib/test-import-parser";

async function main() {
const buf = fs.readFileSync("C:/Users/javoh/Downloads/AyuGram Desktop/5-sinf uchun.docx");
const md = await docxBufferToMarkdown(buf);
fs.writeFileSync("data/ayugram-raw/5-sinf uchun.docx.md", md, "utf8");
const qs = parseMcqTextToDraftQuestions(md);
console.log("count", qs.length);
for (const i of [0, 1, 3, 19]) {
  const q = qs[i];
  if (!q) continue;
  console.log("\n--- Q", i + 1, "---");
  console.log(q.text.slice(0, 200));
  console.log("opts", q.options);
}
}
void main();

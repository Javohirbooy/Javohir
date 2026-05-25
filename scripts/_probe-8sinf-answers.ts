import fs from "node:fs";

async function main() {
  const JSZip = (await import("jszip")).default;
  const path = "C:/Users/javoh/Downloads/AyuGram Desktop/17-may 8-sinf (2).docx";
  const xml = await (
    await JSZip.loadAsync(fs.readFileSync(path))
  )
    .file("word/document.xml")!
    .async("string");

  const idx = xml.indexOf("2-variant");
  const v1 = xml.slice(0, idx);
  const v2 = xml.slice(idx);

  function redLetters(section: string): string[] {
    const letters: string[] = [];
    for (const p of section.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
      if (!/w:val="FF0000"/i.test(p[0]!)) continue;
      const t = [...p[0]!.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
        .map((m) => m[1]!.trim())
        .join("");
      if (/^[A-D]$/i.test(t)) letters.push(t.toUpperCase());
    }
    return letters;
  }

  console.log("v1 red", redLetters(v1).length, redLetters(v1).join(""));
  console.log("v2 red", redLetters(v2).length, redLetters(v2).join(""));

  // Javoblar bo'limi
  const javob = xml.toLowerCase().indexOf("javob");
  console.log("javob idx", javob);
}

void main();

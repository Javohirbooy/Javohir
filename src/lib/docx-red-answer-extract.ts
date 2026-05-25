/**
 * DOCX ichida qizil (FF0000) belgilangan variant javoblarini ajratadi.
 * Ba’zi testlarda to‘g‘ri javob qizil rangda belgilanadi.
 */
export function extractRedAnswerLettersFromDocumentXml(docXml: string): string[] {
  const letters: string[] = [];

  for (const pm of docXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
    const p = pm[0]!;
    if (!/w:val="FF0000"/i.test(p)) continue;

    const chunks: { red: boolean; text: string }[] = [];
    let pos = 0;
    while (pos < p.length) {
      const runOpen = p.indexOf("<w:r", pos);
      if (runOpen === -1) break;
      const runClose = p.indexOf("</w:r>", runOpen);
      if (runClose === -1) break;
      const run = p.slice(runOpen, runClose + "</w:r>".length);
      const red = /w:val="FF0000"/i.test(run);
      const texts = [...run.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1] ?? "");
      if (texts.length) chunks.push({ red, text: texts.join("") });
      pos = runClose + "</w:r>".length;
    }

    const line = chunks.map((c) => c.text).join("");
    if (!/\b[A-D]\)/i.test(line)) continue;

    let found: string | null = null;
    for (const c of chunks) {
      if (!c.red) continue;
      const m = c.text.match(/\b([A-D])\b/i);
      if (m) {
        found = m[1]!.toUpperCase();
        break;
      }
    }
    if (found) letters.push(found);
  }

  return letters;
}

/**
 * contents/ 配下の原稿から、言語ごとの目次（TOC）を Markdown で標準出力する。
 *
 * 使い方:  bun run scripts/generate-toc.ts            # 全言語を出力
 *          bun run scripts/generate-toc.ts ja > TOC.md # 必要なら保存
 */

interface Chapter {
  order: number;
  title: string;
  slug: string;
  file: string;
}

function parseFrontMatter(raw: string): Record<string, string> | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return data;
}

const onlyLang = process.argv[2]; // 省略時は全言語
const byLang = new Map<string, Chapter[]>();

const glob = new Bun.Glob("contents/**/*.md");
for await (const file of glob.scan(".")) {
  const lang = file.split("/")[1] ?? "?";
  if (onlyLang && lang !== onlyLang) continue;

  const fm = parseFrontMatter(await Bun.file(file).text());
  if (!fm) continue;

  const list = byLang.get(lang) ?? [];
  list.push({
    order: Number(fm.order ?? 999),
    title: fm.title ?? "(無題)",
    slug: fm.slug ?? "",
    file,
  });
  byLang.set(lang, list);
}

for (const [lang, chapters] of [...byLang.entries()].sort()) {
  chapters.sort((a, b) => a.order - b.order);
  console.log(`## ${lang}\n`);
  for (const c of chapters) {
    console.log(`- ${String(c.order).padStart(2, "0")}. [${c.title}](/${lang}/chapters/${c.slug}/)`);
  }
  console.log("");
}

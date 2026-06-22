/**
 * contents/ 配下の Markdown 原稿の front matter を検証する。
 *
 * 使い方:  bun run scripts/validate-frontmatter.ts
 *          （= bun run check）
 *
 * Bun の標準 API（Bun.Glob / Bun.file）のみを使い、外部依存を持たない。
 */

const REQUIRED_KEYS = ["title", "order", "slug"] as const;

interface Issue {
  file: string;
  message: string;
}

/** front matter ブロック（先頭の --- ... --- ）を雑にパースする。 */
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

const issues: Issue[] = [];
const seenSlugs = new Map<string, string>(); // `${lang}/${slug}` -> file

const glob = new Bun.Glob("contents/**/*.md");

for await (const file of glob.scan(".")) {
  const raw = await Bun.file(file).text();
  const fm = parseFrontMatter(raw);

  if (!fm) {
    issues.push({ file, message: "front matter (--- ... ---) が見つかりません" });
    continue;
  }

  for (const key of REQUIRED_KEYS) {
    if (!(key in fm) || fm[key] === "") {
      issues.push({ file, message: `必須キー "${key}" がありません` });
    }
  }

  if (fm.order !== undefined && Number.isNaN(Number(fm.order))) {
    issues.push({ file, message: `"order" は数値である必要があります（現在: ${fm.order}）` });
  }

  // 言語ディレクトリ内での slug 重複チェック
  const lang = file.split("/")[1] ?? "?";
  if (fm.slug) {
    const key = `${lang}/${fm.slug}`;
    const prev = seenSlugs.get(key);
    if (prev) {
      issues.push({ file, message: `slug "${fm.slug}" が ${prev} と重複しています` });
    } else {
      seenSlugs.set(key, file);
    }
  }
}

if (issues.length === 0) {
  console.log("✅ front matter の検証に成功しました。");
  process.exit(0);
}

console.error(`❌ ${issues.length} 件の問題が見つかりました:\n`);
for (const { file, message } of issues) {
  console.error(`  - ${file}: ${message}`);
}
process.exit(1);

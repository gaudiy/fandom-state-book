/**
 * contents/ja/*.md を英訳して contents/en/*.md を生成・更新する。
 *
 * 使い方:  ANTHROPIC_API_KEY=sk-... bun run scripts/translate.ts
 *          （= bun run translate / CI から自動実行）
 *
 * 仕様:
 * - JP 本文のハッシュを en 側の front matter `source_hash` に記録する。
 * - JP が新規 / 変更された章だけを翻訳する（ハッシュ一致ならスキップ）。
 * - JP が削除された章に対応する en ファイルは削除する。
 * - ANTHROPIC_API_KEY が未設定なら、何もせず正常終了する（ビルドは継続）。
 */

import { createHash } from "node:crypto";

const API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODEL = process.env.TRANSLATE_MODEL ?? "claude-sonnet-4-6";
const JA_DIR = "contents/ja";
const EN_DIR = "contents/en";

interface Doc {
  data: Record<string, string>;
  body: string;
}

function parse(raw: string): Doc {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: m[2] ?? "" };
}

function yamlString(v: string): string {
  return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Claude API で 1 章を翻訳し {title, description, part, body} を返す。 */
async function translate(doc: Doc): Promise<{
  title: string;
  description: string;
  part: string;
  body: string;
}> {
  const input = {
    title: doc.data.title ?? "",
    description: doc.data.description ?? "",
    part: doc.data.part ?? "",
    body: doc.body.trim(),
  };

  const system =
    "You are a professional literary translator translating a Japanese book about " +
    '"fan states" (ファン国家) into natural, fluent, publication-quality English. ' +
    "Preserve the Markdown structure exactly: headings (#, ##, ###), lists, blockquotes (>), " +
    "bold (**), horizontal rules (---), and line breaks. Do not translate text inside code spans. " +
    "Keep the author's tone and rhetorical rhythm. Translate Japanese terms consistently " +
    "(e.g. ファン国家 = Fan State, ファンダム = fandom, ブロードリスニング = broad listening). " +
    "Return ONLY a valid JSON object, no prose, no code fences.";

  const user =
    "Translate the following Japanese book chapter into English. " +
    'Return ONLY a JSON object with exactly these keys: "title", "description", "part", "body". ' +
    '"part" may be an empty string. "body" must be the chapter body translated to English, ' +
    "preserving all Markdown.\n\nINPUT:\n" +
    JSON.stringify(input, null, 2);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { content: { type: string; text: string }[] };
  let text = json.content.map((c) => c.text ?? "").join("").trim();
  // 念のため ```json ... ``` フェンスを除去
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(text) as {
    title: string;
    description?: string;
    part?: string;
    body: string;
  };
  return {
    title: parsed.title ?? input.title,
    description: parsed.description ?? "",
    part: parsed.part ?? "",
    body: (parsed.body ?? "").trim(),
  };
}

function renderEn(
  src: Doc,
  t: { title: string; description: string; part: string; body: string },
  sourceHash: string
): string {
  const fm = [
    "---",
    `title: ${yamlString(t.title)}`,
    `order: ${src.data.order ?? 0}`,
    `slug: ${yamlString(src.data.slug ?? "")}`,
    `part: ${yamlString(t.part ?? "")}`,
    `description: ${yamlString(t.description ?? "")}`,
    `source_hash: ${yamlString(sourceHash)}`,
    "---",
    "",
  ].join("\n");
  return `${fm}${t.body}\n`;
}

// --- main ---------------------------------------------------------------
const jaGlob = new Bun.Glob("*.md");
const jaFiles: string[] = [];
for await (const f of jaGlob.scan(JA_DIR)) jaFiles.push(f);

if (jaFiles.length === 0) {
  console.log("No JP chapters found. Nothing to translate.");
  process.exit(0);
}

// 削除された JP に対応する en を削除（同期）
const jaBasenames = new Set(jaFiles);
const enGlob = new Bun.Glob("*.md");
for await (const f of enGlob.scan(EN_DIR)) {
  if (!jaBasenames.has(f)) {
    await Bun.file(`${EN_DIR}/${f}`).delete();
    console.log(`🗑  removed ${EN_DIR}/${f} (JP source deleted)`);
  }
}

if (!API_KEY) {
  console.log(
    "⚠️  ANTHROPIC_API_KEY が未設定のため翻訳をスキップします（ビルドは継続）。"
  );
  process.exit(0);
}

let translated = 0;
for (const name of jaFiles.sort()) {
  const jaRaw = await Bun.file(`${JA_DIR}/${name}`).text();
  const src = parse(jaRaw);
  const sourceHash = hash(jaRaw);

  const enPath = `${EN_DIR}/${name}`;
  const enFile = Bun.file(enPath);
  if (await enFile.exists()) {
    const existing = parse(await enFile.text());
    if (existing.data.source_hash === sourceHash) {
      console.log(`✓ up-to-date: ${name}`);
      continue;
    }
  }

  console.log(`→ translating: ${name} …`);
  const t = await translate(src);
  await Bun.write(enPath, renderEn(src, t, sourceHash));
  translated++;
  console.log(`✅ wrote ${enPath}`);
}

console.log(
  translated === 0
    ? "All English chapters are up to date."
    : `Done. Translated ${translated} chapter(s).`
);

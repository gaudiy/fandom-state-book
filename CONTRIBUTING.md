# 編集ガイド

Fandom State Book の原稿を編集する Gaudiy メンバー向けの手引きです。
プロジェクトそのものの説明は [README.md](README.md) を参照してください。

## ディレクトリ構造

```text
.
├─ contents/            # 原稿（章立て本文）。ここを編集する
│  ├─ ja/               #   日本語の章: 01-introduction.md, ...
│  │  └─ ja.json        #   ja/ 全体の既定値（layout / lang / permalink）
│  └─ en/               #   英語の章（日本語版から自動生成される）
│     └─ en.json
│
├─ src/                 # サイトのページ（トップ・目次）と静的アセット
│  ├─ index.md          #   トップページ（/）
│  ├─ ja/index.md       #   日本語の目次（/ja/）
│  ├─ en/index.md       #   英語の目次（/en/）
│  └─ assets/           #   → dist/assets/ にコピーされる
│
├─ _includes/           # サイトの UI テンプレート
│  ├─ layouts/          #   base.njk / page.njk / chapter.njk
│  └─ components/       #   header / footer / nav / language-switcher
│
├─ _data/site.json      # サイト全体の data（タイトル・言語一覧・リポジトリURL）
├─ figs/                # 図版（章中で参照する画像）。ja/ en/ で分ける
├─ public/              # そのまま配信する配布ファイル（pdf/ images/）
└─ scripts/             # Bun で動かす TypeScript ユーティリティ
```

## 原稿の書き方

各章 Markdown の先頭に YAML front matter を置きます。`layout` / `lang` / `permalink`
は `contents/<lang>/<lang>.json` で既定値が入るため、原稿側では本文のメタデータだけ書けば十分です。

```markdown
---
title: "序文"
order: 1
slug: "introduction"
description: "Gaudiy創業者・石川裕也による願い。"
---

ここに本文を書く。
```

| キー | 必須 | 意味 |
|---|---|---|
| `title` | ✅ | 章タイトル（目次・ページ見出し・ブラウザタブに表示） |
| `order` | ✅ | 並び順（数値・昇順） |
| `slug` | ✅ | URL の末尾。`/ja/chapters/<slug>/` になる |
| `description` | 任意 | 目次の補足文・meta description |
| `hideTitle` | 任意 | `true` にすると章見出しを出さない（序文などの扉ページ用） |

本文中の見出しは `##` から始めます（`#` はページ見出しとして自動で出力されるため、
本文に書くと重複します）。

詩的な改行は単一改行のまま書けば `<br>` として保持されます。

## セットアップ

[Bun](https://bun.sh/) が必要です:

```bash
curl -fsSL https://bun.sh/install | bash
```

```bash
git clone https://github.com/gaudiy/fandom-state-book.git
cd fandom-state-book
bun install
```

## ローカルで確認する

```bash
bun run dev
```

起動後、<http://localhost:8080/fandom-state-book/> を開きます
（サブパスで配信しているため、ルートではなくこの URL になります）。

その他のコマンド:

```bash
bun run build    # dist/ に本番ビルドを出力
bun run check    # 原稿の front matter を検証
bun run clean    # dist/ を削除
bun run toc      # 目次 Markdown を標準出力
```

## 編集の流れ

1. `contents/ja/` に章 Markdown を追加・編集する。
2. 画像は `figs/<lang>/`、配布 PDF は `public/pdf/` に置く。
3. ブランチを切って Pull Request を作成し、レビューを受ける。
4. `main` に merge されると自動でビルド・公開される。

サイトの見た目を変えるときは `_includes/`（テンプレート）と
`src/assets/css/style.css` を編集します。

## 英語版について

日本語版が原本です。英語版は `main` への push を契機に日本語版の原稿から自動生成され、
`contents/en/` にコミットされます。`contents/en/` を手で編集しても次回の生成で
上書きされる可能性があるため、原則として日本語版を直してください。

> 自動翻訳にはリポジトリの Actions secret `ANTHROPIC_API_KEY` が必要です。
> 未設定の場合、翻訳はスキップされ英語版は生成されません（ビルド自体は続行します）。

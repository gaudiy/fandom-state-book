# Fandom State Book

Markdown で原稿を管理し、**Bun + Eleventy** で静的 HTML に変換し、**GitHub Actions** で自動ビルドして **GitHub Pages** で公開する、共同編集型の書籍プロジェクトです。

参考: [pluralitybook/plurality](https://github.com/pluralitybook/plurality) / <https://plurality.net/ja/>

- 公開URL（project site）: `https://gaudiy.github.io/fandom-state-book/`
- ホスティング: **GitHub Pages**（Cloudflare Pages / R2 は使いません）
- CI/CD: **GitHub Actions**

---

## 役割分担図（このリポジトリのアーキテクチャ）

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 1. 原稿（人間が書く）                                                 │
│    Markdown + YAML front matter / 画像(figs) / 配布物(public/pdf)     │
│    └─ contents/ja/*.md, contents/en/*.md                              │
└───────────────┬─────────────────────────────────────────────────────┘
                │ git commit / Pull Request / review
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. GitHub Repository（履歴・レビュー・課題管理）                      │
│    Git history / Pull Request / Issues / Discussions                  │
└───────────────┬─────────────────────────────────────────────────────┘
                │ push to main / PR merge が CI を起動
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. GitHub Actions（Ubuntu runner）= ビルド環境                        │
│    Bun をセットアップ → bun install → bun run check → bun run build    │
└───────────────┬─────────────────────────────────────────────────────┘
                │ Eleventy が Markdown + Nunjucks → HTML を生成
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Eleventy（SSG / 静的サイト生成）                                   │
│    Markdown + _includes/*.njk + src/assets(css,js) → dist/            │
│    ※ SSR ではなく、ビルド時に全ページを生成する SSG                   │
└───────────────┬─────────────────────────────────────────────────────┘
                │ dist/ を Pages artifact としてアップロード
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. GitHub Pages（配信）                                               │
│    完成済み HTML/CSS/JS を HTTPS で配信                                │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
        6. ユーザーのブラウザ（事前生成済みの静的ページを表示）
```

### 各技術の役割

| 技術 | 役割 |
|---|---|
| **Markdown + front matter** | 原稿そのもの。本文と章のメタdata（title / order / slug 等）を保持する |
| **Git / GitHub** | 履歴管理・Pull Request レビュー・Issues での翻訳/修正タスク管理 |
| **Bun** | JS/TS の実行環境・パッケージマネージャ・タスクランナー（`bun install` / `bun run`） |
| **Eleventy (11ty)** | Markdown と Nunjucks テンプレートを HTML へ変換する静的サイトジェネレーター（SSG） |
| **GitHub Actions** | `main` への push / PR merge を契機にビルドとデプロイを自動化する CI/CD |
| **GitHub Pages** | ビルド済みの `dist/` を HTTPS で配信するホスティング |

---

## ディレクトリ構造

```text
.
├─ contents/            # 原稿（章立て本文）。ここを編集する
│  ├─ ja/               #   日本語の章: 00-preface.md, 01-introduction.md, ...
│  │  └─ ja.json        #   ja/ 全体の既定値（layout / lang / permalink）
│  └─ en/               #   英語の章
│     └─ en.json
│
├─ src/                 # サイトのページ（トップ・目次・about）と静的アセット
│  ├─ index.md          #   トップページ（/）
│  ├─ ja/index.md       #   日本語の目次（/ja/）
│  ├─ en/index.md       #   英語の目次（/en/）
│  ├─ about.md          #   このプロジェクトについて（/about/）
│  └─ assets/           #   → dist/assets/ にコピーされる
│     ├─ css/style.css
│     ├─ js/main.js
│     └─ images/
│
├─ _includes/           # サイトの UI テンプレート
│  ├─ layouts/          #   base.njk / page.njk / chapter.njk
│  └─ components/       #   header / footer / nav / language-switcher
│
├─ _data/site.json      # サイト全体の data（タイトル・言語一覧・リポジトリURL）
│
├─ figs/                # 図版（章中で参照する画像）。ja/ en/ で分ける
├─ public/              # そのまま配信する配布ファイル（pdf/ images/）
│
├─ scripts/             # Bun で動かす TypeScript ユーティリティ
│  ├─ generate-toc.ts       # 目次 Markdown を生成
│  └─ validate-frontmatter.ts  # front matter を検証（bun run check）
│
├─ .github/workflows/deploy.yml  # GitHub Pages への自動デプロイ
├─ .eleventy.js         # Eleventy 設定（入力=., 出力=dist, pathPrefix 等）
├─ .eleventyignore      # README/LICENSE/scripts をビルド対象から除外
├─ package.json
├─ bun.lock
├─ README.md
└─ LICENSE
```

---

## front matter の書き方

各章 Markdown の先頭に YAML front matter を置きます。`layout` / `lang` / `permalink`
は `contents/<lang>/<lang>.json`（ディレクトリ data ファイル）で既定値が入るため、
原稿側では本文のメタdata（`title` / `order` / `slug` / `description`）だけ書けば十分です。

```markdown
---
title: "序文"
order: 0
slug: "preface"
description: "本書の序文"
---

# 序文

ここに本文を書く。
```

| キー | 必須 | 意味 |
|---|---|---|
| `title` | ✅ | 章タイトル（目次・ヘッダに表示） |
| `order` | ✅ | 並び順（数値・昇順） |
| `slug` | ✅ | URL の末尾。`/ja/chapters/<slug>/` になる |
| `description` | 任意 | 目次の説明文・meta description |

> `bun run check` で必須キーの有無・`order` が数値か・`slug` 重複を検証できます。

---

## セットアップ

[Bun](https://bun.sh/) が必要です（未導入の場合）:

```bash
curl -fsSL https://bun.sh/install | bash
```

リポジトリを取得して依存をインストール:

```bash
git clone https://github.com/gaudiy/fandom-state-book.git
cd fandom-state-book
bun install
```

## ローカル開発

```bash
bun run dev      # Eleventy 開発サーバを起動（ホットリロード）
```

起動後、ブラウザで <http://localhost:8080/fandom-state-book/> を開きます
（`pathPrefix` を設定しているため、ルートではなくサブパスで配信されます）。

その他のコマンド:

```bash
bun run build    # dist/ に本番ビルドを出力
bun run clean    # dist/ を削除
bun run check    # 原稿の front matter を検証
bun run toc      # 目次 Markdown を標準出力
```

## 編集方法

1. `contents/ja/` または `contents/en/` に章 Markdown を追加・編集する。
2. 画像は `figs/<lang>/`、配布 PDF は `public/pdf/` に置く。
3. ブランチを切って Pull Request を作成し、レビューを受ける。
4. `main` に merge されると GitHub Actions が自動でビルド・デプロイする。

サイトの見た目を変えるときは `_includes/`（テンプレート）と `src/assets/css/style.css` を編集します。

## GitHub Pages 公開手順（初回のみ）

1. GitHub のリポジトリ **Settings → Pages** を開く。
2. **Build and deployment → Source** を **GitHub Actions** に設定する。
3. `main` に push（または PR を merge）すると `.github/workflows/deploy.yml` が走り、
   `dist/` が Pages にデプロイされる。
4. 公開URL: `https://gaudiy.github.io/fandom-state-book/`

> このリポジトリは `gaudiy` org の **public** リポジトリで、GitHub Pages を利用しています。
> `pathPrefix`（`.eleventy.js`）はリポジトリ名 `/fandom-state-book/` に合わせています。
> 別名のリポジトリやユーザー/組織サイトに置く場合はここを変更してください。

---

## この構成で使わないもの

- ❌ Cloudflare Pages / Cloudflare R2
- ❌ SSR・動的サーバー（本構成は**ビルド時に全ページを生成する SSG** です）

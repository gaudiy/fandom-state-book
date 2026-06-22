import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // --- 静的アセットのコピー ---------------------------------------------
  // src/assets → dist/assets, public/* → dist/*, figs → dist/figs
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy("figs");

  // --- GitHub Pages のサブパスを自動補完 --------------------------------
  // 出力HTML内の "/assets/..." などのルート相対URLに pathPrefix を付与する。
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // --- コレクション（章立て） -------------------------------------------
  eleventyConfig.addCollection("chaptersJa", (api) =>
    api
      .getFilteredByGlob("contents/ja/**/*.md")
      .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999))
  );

  eleventyConfig.addCollection("chaptersEn", (api) =>
    api
      .getFilteredByGlob("contents/en/**/*.md")
      .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999))
  );

  // --- フィルタ ----------------------------------------------------------
  eleventyConfig.addFilter("readableDate", (value) =>
    value ? new Date(value).toISOString().slice(0, 10) : ""
  );

  // 章番号を 2 桁ゼロ埋めする（例: 1 → "01"）
  eleventyConfig.addFilter("pad2", (value) =>
    String(value ?? 0).padStart(2, "0")
  );

  // --- ディレクトリ設定 / テンプレートエンジン --------------------------
  return {
    // GitHub Pages の project site（https://gaudiy.github.io/fandom-state-book/）
    // で配信するためのサブパス。ユーザー/組織のルートに置く場合は "/" にする。
    pathPrefix: "/fandom-state-book/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "dist",
    },
  };
}

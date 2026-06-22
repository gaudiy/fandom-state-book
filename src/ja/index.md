---
layout: layouts/page.njk
title: "日本語版"
permalink: /ja/index.html
lang: "ja"
description: "Fandom State 日本語版の目次。"
---

# Fandom State（日本語版）

<ul class="toc">
{%- for chapter in collections.chaptersJa %}
  <li class="toc__item">
    <a href="{{ chapter.url }}">
      <span class="toc__order">{{ chapter.data.order | pad2 }}</span>
      <span class="toc__title">{{ chapter.data.title }}</span>
    </a>
    {%- if chapter.data.description %}
    <p class="toc__desc">{{ chapter.data.description }}</p>
    {%- endif %}
  </li>
{%- endfor %}
</ul>

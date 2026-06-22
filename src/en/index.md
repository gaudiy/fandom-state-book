---
layout: layouts/page.njk
title: "English Edition"
permalink: /en/index.html
lang: "en"
description: "Table of contents for the English edition of Fandom State."
---

# Fandom State (English Edition)

<ul class="toc">
{%- for chapter in collections.chaptersEn %}
  <li class="toc__item">
    <a href="{{ chapter.url }}">
      <span class="toc__order">{{ chapter.data.order | pad2 }}_</span>
      <span class="toc__title">{{ chapter.data.title }}</span>
    </a>
    {%- if chapter.data.description %}
    <p class="toc__desc">{{ chapter.data.description }}</p>
    {%- endif %}
  </li>
{%- endfor %}
</ul>

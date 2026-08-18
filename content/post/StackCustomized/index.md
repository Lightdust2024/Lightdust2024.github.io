---
title:  Hugo Stack主题个性化设置
description: 对stack主题的个人客制化，主要优化了透明效果，仅作方法展示，实际代码可能会有所不同
slug: StackCustomized
date: 2026-08-18 15:03:02+08:00
image: cover.png

---

# Hugo Stack 主题个性化设置

> 基于实际搭建经验，涵盖样式、功能与性能优化。所有定制均通过站点根目录下的 `assets/scss/custom.scss` 进行，不修改主题源码。

---

## 准备工作

- **文件位置**：`myblog/assets/scss/custom.scss`
- **生效验证**：写入测试代码，运行 `hugo server`，若背景变灰则加载成功。

```scss
:root { --body-background: #f0f0f0; }
```

---

## CSS 变量速查（常用）

| 变量                                                  | 作用                               |
| ----------------------------------------------------- | ---------------------------------- |
| `--accent-color`                                      | 强调色（链接、标题色条、目录高亮） |
| `--body-background`                                   | 页面背景（颜色或图片）             |
| `--card-background`                                   | 卡片背景                           |
| `--card-text-color-main` / `--secondary`              | 主/次文字颜色                      |
| `--code-background-color` / `--code-text-color`       | 行内代码背景/文字                  |
| `--pre-background-color` / `--pre-text-color`         | 代码块背景/文字                    |
| `--blockquote-background-color`                       | 引用块背景                         |
| `--table-border-color` / `--tr-even-background-color` | 表格边框/斑马纹                    |
| `--card-border-radius` / `--card-padding`             | 卡片圆角/内边距                    |
| `--article-font-size` / `--article-line-height`       | 正文字号/行高                      |

---

## 背景自定义

### 纯色背景
```scss
:root { --body-background: #f8f7f2; --card-background: #fdfdfb; }
[data-scheme="dark"] { --body-background: #101214; --card-background: rgba(0,0,0,0.6); }
```

### 静态壁纸（明暗双图）
```scss
:root { --body-background: url("/images/light-bg.jpg"); }
[data-scheme="dark"] { --body-background: url("/images/dark-bg.jpg"); }
body {
    background: var(--body-background) no-repeat fixed center center !important;
    background-size: cover !important;
}
```
> 如需切换无闪屏，可叠加双层背景层并通过JS控制透明度（可选高级功能）。

### 半透明毛玻璃卡片
```scss
.article-page, .widget, .sidebar-inner, .pagination, .section {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}
```

### 滚动条透明化
```scss
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent !important; }
::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.5); border-radius: 10px; }
* { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,0.5) transparent; }
```

---

## 代码块定制

### 移除 macOS 标题栏
```scss
.highlight:before { display: none !important; }
```

### 显示编程语言标签（左上）
新建 `layouts/_markup/render-codeblock.html`：
```html
{{ $result := transform.HighlightCodeBlock . }}
{{ $lang := .Type | default "text" }}
<div class="highlight-wrapper" data-lang="{{ $lang }}">
    <div class="code-language-label">{{ $lang }}</div>
    {{ $result.Wrapped }}
</div>
```
样式：
```scss
.highlight-wrapper {
    position: relative; margin: 1.5rem 0;
    border-radius: var(--card-border-radius); overflow: hidden;
    box-shadow: var(--shadow-l1);
}
.code-language-label {
    position: absolute; top:0; left:0;
    padding: 4px 14px; font-size:12px; font-weight:500;
    text-transform: uppercase; color: rgba(255,255,255,0.7);
    background: rgba(0,0,0,0.4); border-radius: 0 0 8px 0;
    backdrop-filter: blur(4px); z-index:2;
    pointer-events: none; user-select: none;
}
```

### 代码块背景色（覆盖Chroma表格）
```scss
[data-scheme="light"] .chroma { background-color: #fafafa !important; }
[data-scheme="dark"] .chroma { background-color: #1e1e1e !important; }
.highlight > table,
.highlight > table > tbody > tr > td {
    background-color: var(--pre-background-color) !important;
}
```

### 复制按钮样式
```scss
.copyCodeButton {
    background: #3498db !important; color: #fff !important;
    border-radius: 4px !important; padding: 2px 12px !important;
    &:hover { background: #2980b9 !important; }
}
```

---

## 表格与引用块
```scss
:root {
    --table-border-color: #b0c4de;
    --tr-even-background-color: #f0f4f8;
    --blockquote-background-color: #f4f4f4;
}
[data-scheme="dark"] {
    --table-border-color: #4a5a6a;
    --tr-even-background-color: #2a3a4a;
    --blockquote-background-color: #2a2a2a;
}
```

---

## 目录（TOC）问题
- **现象**：文章内 `# 一级标题` 不出现在TOC中。
- **原因**：Hugo默认从 `h2` 开始生成，且过滤掉与 `title` 相同的 `h1`。
- **解决**：文章内容标题统一用 `##` 二级标题，页面大标题由 Front Matter 的 `title` 提供。

---

## KBD 标签样式
```scss
kbd {
    background-color: #f4f4f4 !important; color: #333 !important;
    border-color: #b0b0b0 !important; border-radius: 4px !important;
    padding: 0.2rem 0.4rem !important;
}
[data-scheme="dark"] kbd {
    background-color: #2a2a2a !important; color: #e0e0e0 !important;
    border-color: #5a5a5a !important;
}
```

---

## 明暗切换动画与性能优化

### 基础过渡
```scss
body, .main-container, .article-content, .widget, .sidebar {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
@media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; }
}
```

### 长页面渲染优化
```scss
.article-content .highlight,
.article-content table {
    content-visibility: auto;
    contain-intrinsic-size: auto 200px;
}
```

---

## Cloudflare CDN 加速（GitHub Pages 场景）
1. 注册Cloudflare，添加域名，修改DNS服务器。
2. DNS记录：CNAME 指向 `用户名.github.io`，开启代理（橙色云朵）。
3. SSL/TLS：加密模式选 **完全（严格）**，开启 **始终使用 HTTPS**。
> 新接入时证书签发可能需15分钟～24小时，期间先用 **完全** 模式，待证书有效后再改回 **完全（严格）**。

---

## 完整 custom.scss 示例
```scss
:root {
    --body-background: #f8f7f2;
    --card-background: rgba(255,255,255,0.7);
    --accent-color: #2b6cb0;
    --table-border-color: #b0c4de;
    --tr-even-background-color: #f0f4f8;
    --blockquote-background-color: #f4f4f4;
}
[data-scheme="dark"] {
    --body-background: #101214;
    --card-background: rgba(0,0,0,0.6);
    --table-border-color: #4a5a6a;
    --tr-even-background-color: #2a3a4a;
    --blockquote-background-color: #2a2a2a;
}
body {
    background: var(--body-background) no-repeat fixed center center !important;
    background-size: cover !important;
}
.article-page, .widget, .sidebar-inner, .pagination, .section {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}
.highlight:before { display: none !important; }
[data-scheme="light"] .chroma { background-color: #fafafa !important; }
[data-scheme="dark"] .chroma { background-color: #1e1e1e !important; }
.highlight > table, .highlight > table > tbody > tr > td {
    background-color: var(--pre-background-color) !important;
}
.highlight-wrapper {
    position: relative; margin: 1.5rem 0;
    border-radius: var(--card-border-radius); overflow: hidden;
    box-shadow: var(--shadow-l1);
}
.code-language-label {
    position: absolute; top:0; left:0;
    padding: 4px 14px; font-size:12px; font-weight:500;
    text-transform: uppercase; color: rgba(255,255,255,0.7);
    background: rgba(0,0,0,0.4); border-radius: 0 0 8px 0;
    backdrop-filter: blur(4px); z-index:2;
    pointer-events: none; user-select: none;
}
.copyCodeButton {
    background: #3498db !important; color: #fff !important;
    border-radius: 4px !important; padding: 2px 12px !important;
}
.copyCodeButton:hover { background: #2980b9 !important; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent !important; }
::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.5); border-radius: 10px; }
* { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,0.5) transparent; }
kbd {
    background-color: #f4f4f4 !important; color: #333 !important;
    border-color: #b0b0b0 !important; border-radius: 4px !important;
    padding: 0.2rem 0.4rem !important;
}
[data-scheme="dark"] kbd {
    background-color: #2a2a2a !important; color: #e0e0e0 !important;
    border-color: #5a5a5a !important;
}
body, .main-container, .article-content, .widget, .sidebar {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
@media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; }
}
.article-content .highlight,
.article-content table {
    content-visibility: auto;
    contain-intrinsic-size: auto 200px;
}
```


## 参考资源
- [Stack 4.0 CSS 变量完整参考](https://smallstep.one/hugo-stack-css-variables/)
- [custom.scss 定制教程](https://smallstep.one/hugo-stack-custom-style/)
- [Stack 主题官方仓库](https://github.com/CaiJimmy/hugo-theme-stack)
- [主题美化案例](https://liu-houliang.github.io/hugo-stack-starter/en/post/theme-customization/)

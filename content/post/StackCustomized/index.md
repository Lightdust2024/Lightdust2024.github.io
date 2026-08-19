---
title: Hugo Stack 主题个性化实践记录
description: 本文是本博客个性化定制的记录，使用deepseek复盘并构建文档，涵盖样式、交互与性能优化
slug: StackCustomized
date: 2026-08-18 15:03:02+08:00
image: cover.png
---

# Hugo Stack 主题个性化实践记录

## 写在前面

本文客制化的记录，记录了我遇到的问题以及踩过的坑，使用deepseek复盘构建文档，作方法展示，实际代码可能会有所不同

本文全部定制遵循一个核心原则：**不修改 `themes/stack` 主题源码**，只通过 Hugo 的同名覆写机制，在站点根目录的 `layouts/`、`assets/`、`i18n/`、`config/` 中覆盖主题行为。避免了升级主题时的冲突问题，也能清楚的了解自己对哪些内容进行了客制化。

### 客制化总览

| 客制化内容 | 主要涉及文件 |
|---|---|
| 明暗双背景图层，切换无闪屏 | `layouts/partials/head/custom.html` |
| 主题切换动画与毛玻璃防卡顿 | `assets/js/custom.js`、`assets/scss/custom.scss` |
| 半透明毛玻璃卡片 | `assets/scss/custom.scss` |
| 灰色引用块 + GitHub 风格 Alert 提示块 | `layouts/_default/_markup/render-blockquote-alert.html`、`assets/scss/custom.scss` |
| 长代码块展开/收起按钮 | `layouts/partials/footer/custom.html` |
| 目录（TOC）滚动联动折叠 | `layouts/partials/footer/custom.html` |
| 主题切换按钮文案与字重统一 | `i18n/zh.toml`、`layouts/partials/footer/custom.html`、`assets/scss/custom.scss` |
| NProgress 页面加载进度条 | `layouts/partials/footer/custom.html` |
| 封面/缩略图构建期自动转 WebP | `layouts/_partials/helper/responsive-image.html`、`layouts/_partials/helper/thumbnail-image.html` |
| 链接结构、TOC 层级、数学公式、Git lastmod | `config/_default/`、`hugo.toml` |
| GitHub Actions 自动部署 Pages | `.github/workflows/hugo.yaml` |
| Cloudflare CDN 加速 | 无代码（DNS 配置） |

### 环境

- Hugo **extended**（latest，由 GitHub Actions 安装，本地开发建议一致）——图片的 WebP 处理依赖 extended 版
- hugo-theme-stack **v4.0.3**（以普通文件形式放在 `themes/stack/`）
- 开发环境 Windows 11，部署环境 GitHub Pages

---

## 准备工作与验证方法

### 覆写机制原理

Hugo 查找 `layouts/`、`assets/`、`i18n/` 中的文件时，**站点根目录优先于主题目录**。在项目根目录放置与主题内同路径的同名文件，即可覆盖主题的模板、资源和翻译。例如本站 `layouts/partials/head/custom.html` 会替换主题 `themes/stack/layouts/partials/head/custom.html`（这是 Stack 主题预留的注入点，本身会被 `head.html` 引用）。

本项目定制的文件树：

```
layouts/
├─ _default/
│   └─ _markup/
│       └─ render-blockquote-alert.html   # 覆写 Hugo 渲染钩子：Alert 提示块
├─ _partials/
│   └─ helper/
│       ├─ responsive-image.html          # 覆写主题 partial：响应式图片（WebP）
│       └─ thumbnail-image.html           # 覆写主题 partial：缩略图（WebP）
└─ partials/
    ├─ head/custom.html                   # 双背景图层 + 无闪屏切换
    └─ footer/custom.html                 # 进度条 / 代码折叠 / TOC 联动 / 文案修复
assets/
├─ js/custom.js                           # 切换主题时禁用毛玻璃过渡
├─ scss/custom.scss                       # 全部自定义样式（CSS 变量 + 毛玻璃 + 配色）
├─ img/                                   # background1/2.png（明暗壁纸）、avatar.png
└─ icons/codeMore.png                     # 代码块展开按钮图标
i18n/
└─ zh.toml                                # 覆盖主题翻译（修复按钮文案）
config/_default/                          # 7 个分拆配置文件
```

### 验证方法

写入测试代码：

```scss
:root { --body-background: #f0f0f0; }
```

然后在博客根目录打开终端，运行本地服务器，若背景变灰则说明 SCSS 加载成功：

```bash
hugo server -D   # 本站文章是草稿，必须加 -D（--buildDrafts）才会渲染
```

> [!note]
> 草稿状态下 `hugo server` / `hugo build` 默认不渲染文章，验证命令要带 `-D` / `--buildDrafts`。线上构建（`hugo --minify`）会自动排除草稿。

---

## 明暗双背景图层：无闪屏切换

### 为什么不用 CSS 背景图

Stack 主题支持通过 `--body-background` 变量直接设置背景图片，但 `background-image` 不支持渐变过渡——切换主题时背景会"啪"地跳变。最简单可靠的做法是用两个壁纸图层（`background1.png`、`background2.png`）叠在一起，切换主题时两张图层做 0.3s 的 opacity 交叉渐变。

### 实现

文件：`layouts/partials/head/custom.html`

```html
<!-- layouts/partials/head/custom.html -->
{{- $customJS := resources.Get "js/custom.js" | minify | fingerprint -}}
{{- $lightBg := (resources.Get "img/background1.png").Process "webp q100" -}}
{{- $darkBg := (resources.Get "img/background2.png").Process "webp q100" -}}
<script>
    // 内联创建背景图层（早于 defer 的 custom.js）并 preload，避免闪屏
    (function() {
        const lightBg = '{{ $lightBg.RelPermalink }}';
        const darkBg = '{{ $darkBg.RelPermalink }}';

        // 已发起下载的背景图（去重）
        const preloaded = new Set();

        function preloadImage(src) {
            if (preloaded.has(src)) return;
            preloaded.add(src);
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        }

        // head 解析阶段立即下载当前主题的背景图
        const currentScheme = document.documentElement.getAttribute('data-scheme') || 'light';
        preloadImage(currentScheme === 'dark' ? darkBg : lightBg);

        function initBackground() {
            // 等待 body 存在（背景层必须挂在 body 内）
            if (!document.body) {
                requestAnimationFrame(initBackground);
                return;
            }

            const bgContainer = document.createElement('div');
            bgContainer.style.position = 'fixed';
            bgContainer.style.top = '0';
            bgContainer.style.left = '0';
            bgContainer.style.width = '100%';
            bgContainer.style.height = '100%';
            bgContainer.style.zIndex = '-999';
            bgContainer.style.pointerEvents = 'none';
            // GPU 加速
            bgContainer.style.willChange = 'opacity';
            bgContainer.style.transform = 'translateZ(0)';

            // 初始状态直接按当前主题设置（无动画），避免加载时闪屏
            const isDark = (document.documentElement.getAttribute('data-scheme') || 'light') === 'dark';

            const lightLayer = document.createElement('div');
            Object.assign(lightLayer.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundImage: `url(${lightBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                opacity: isDark ? '0' : '1',
                willChange: 'opacity',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
            });

            const darkLayer = document.createElement('div');
            Object.assign(darkLayer.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundImage: `url(${darkBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                opacity: isDark ? '1' : '0',
                willChange: 'opacity',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
            });

            bgContainer.appendChild(lightLayer);
            bgContainer.appendChild(darkLayer);
            document.body.prepend(bgContainer);

            function updateBackground(scheme) {
                requestAnimationFrame(() => {
                    if (scheme === 'dark') {
                        lightLayer.style.opacity = '0';
                        darkLayer.style.opacity = '1';
                    } else {
                        lightLayer.style.opacity = '1';
                        darkLayer.style.opacity = '0';
                    }
                });
            }

            // 监听主题切换，并预加载目标背景图
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'data-scheme') {
                        const scheme = document.documentElement.getAttribute('data-scheme');
                        updateBackground(scheme);
                        preloadImage(scheme === 'dark' ? darkBg : lightBg);
                    }
                });
            });
            observer.observe(document.documentElement, { attributes: true });
        }

        initBackground();
    })();
</script>
<script src="{{ $customJS.RelPermalink }}" defer></script>
```

要点拆解：

1. **构建期压缩**：`(resources.Get "img/background1.png").Process "webp q100"` 在构建时把 3.2MB 的 PNG 转成 WebP，产物体积大幅下降，且不用在运行时处理图片。
2. **必须挂在 body 内**：容器用了 `z-index: -999`，如果挂在 `html` 下，会被 body 的背景色盖住。代码里用 `requestAnimationFrame` 轮询等待 body 存在。
3. **初始状态无动画**：创建图层时直接按当前 `data-scheme` 设置 opacity——暗色用户刷新页面时，亮色图层一开始就是透明的，不会先闪一下亮色背景再渐变过去。
4. **切换预加载**：`MutationObserver` 监听 `html` 的 `data-scheme` 变化，切换图层的同时 preload 目标背景图，保证下一次来回切换时有缓存。

### 踩过的坑

- **暗色模式加载闪白**：背景图层的创建逻辑最初放在 `defer` 加载的 `custom.js` 里，页面解析完成才执行，暗色用户打开页面会先看到亮色背景。修复方式就是上面这段——把逻辑搬进 `head` 里的内联脚本，配合 `preload`，在页面解析早期就让背景图就位。
- **背景图太大**：最初直接把 3.2MB 的 PNG 放进 `static/`，后来迁移到 `assets/img/` 启用 Hugo 图片处理管道（见上方要点解析第 1 点）。

---

## 主题切换动画：毛玻璃防卡顿

### 做了什么

所有毛玻璃卡片和正文区域在主题切换时有 0.3s 的颜色过渡动画（见 `assets/scss/custom.scss` 尾部）；同时用一个技巧避免切换瞬间毛玻璃元素过渡导致卡顿。

### 为什么需要特殊处理

页面里大面积使用 `backdrop-filter: blur()` 时，主题切换一瞬间所有元素同时过渡，浏览器要逐帧重新计算滤镜，会出现明显卡顿。

### 实现

文件：`assets/js/custom.js`

```js
// 切换主题时禁用毛玻璃过渡，切换后恢复（背景图层切换由 head/custom.html 处理）
(function() {
    function switchTheme(newScheme) {
        const root = document.documentElement;
        // 只给毛玻璃元素添加 .no-transition，不影响背景层
        const glassElements = document.querySelectorAll(
            '.widget:not(.archives), .sidebar-inner, .pagination, .section, .article-content'
        );
        glassElements.forEach(el => el.classList.add('no-transition'));

        root.setAttribute('data-scheme', newScheme);

        // 等待两帧后移除 .no-transition
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                glassElements.forEach(el => el.classList.remove('no-transition'));
            });
        });
    }
})();
```

配合 `assets/scss/custom.scss` 尾部的过渡定义（`.no-transition` 类用于切换瞬间禁用过渡）：

```scss
//过渡动画
:root,
.widget:not(.archives),
.sidebar-inner,
.pagination,
.section,
.article-content,
.copyCodeButton,
kbd,
.highlight pre,
.highlight table {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;

    .no-transition,
    .no-transition * {
        transition: none !important;
    }

    .bg-layer {
        will-change: opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
    }
}
```

手法拆解：

1. 切换前给毛玻璃元素加 `.no-transition`（过渡被禁用），切换瞬间不触发滤镜重绘。
2. 设置 `data-scheme` 后等待**两帧**（双 `requestAnimationFrame`）再移除，此时新的背景色已生效。
3. `.no-transition` 只作用于毛玻璃元素，背景图层不受影响，仍然正常淡入淡出。

> [!note]
> Stack 主题自带的切换按钮会把 `data-scheme` 写回 `html` 并派发 `onColorSchemeChange` 事件，本文的毛玻璃防卡顿通过给元素加类实现，与主题的切换逻辑解耦。

---

## 毛玻璃卡片与 CSS 变量重定义

### 做了什么

把页面里的卡片（widget、侧边栏、分页、section）和正文区域做成半透明毛玻璃效果，透过卡片能看到背景壁纸；同时重定义了主题的 CSS 变量，让亮暗两套配色与壁纸协调。

### 变量重定义

文件：`assets/scss/custom.scss`（第 1-25 行）

```scss
:root {
    --card-background: rgba(250, 250, 250, 0.65);
    --card-border-color: rgba(250, 250, 250, 0.65);
    --scrollbar-track: rgba(250, 250, 250, 0.65);
    --table-border-color: #676767;
    --tr-even-background-color: rgba(128, 128, 128, 0.3);
    --blockquote-background-color: rgba(0, 0, 0, 0.2);
    --code-text-color: #606060;
    --code-background-color: #75757550;
    --body-text-color: #404040;
    --card-text-color-secondary: #404040;
    --pre-background-color: #f9f9ee;

    &[data-scheme="dark"] {
        --card-background: rgba(0, 0, 0, 0.65);
        --card-border-color: rgba(0, 0, 0, 0.65);
        --scrollbar-track: rgba(0, 0, 0, 0.65);
        --table-border-color: #676767;
        --tr-even-background-color: rgba(128, 128, 128, 0.3);
        --blockquote-background-color: rgba(250, 250, 250, 0.1);
        --code-text-color: #909090;
        --code-background-color: #75757550;
        --pre-background-color: #22221c;
    }
}
```

关键点：卡片背景是**半透明**的（`rgba(250,250,250,0.65)` / `rgba(0,0,0,0.65)`），配合 `backdrop-filter` 模糊之后，壁纸的颜色透过卡片隐约可见。

### 毛玻璃与 GPU 优化

文件：`assets/scss/custom.scss`（第 57-76 行）

```scss
//毛玻璃效果和独立合成层，避免滤镜重绘卡顿
.widget:not(.archives),
.sidebar-inner,
.pagination,
.section {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    will-change: backdrop-filter, background-color, border-color; //提前通知 GPU
    transform: translateZ(0); //强制 GPU 加速
    backface-visibility: hidden; //减少闪烁
}

//文章内容毛玻璃（强度更高）
.article-content {
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    will-change: backdrop-filter, background-color, border-color;
    transform: translateZ(0);
    backface-visibility: hidden;
}
```

三个合成层属性（`will-change`、`translateZ(0)`、`backface-visibility`）的作用是把元素提升到独立的合成层，让 `backdrop-filter` 的重绘尽量在 GPU 上完成，避免滚动和主题切换时掉帧。

### 正文区域独立背景

文件：`assets/scss/custom.scss`（第 78-85 行）

```scss
//文章内容背景（独立于卡片背景）
.article-content {
    --card-background: rgba(255, 255, 255, 1); // 亮色下不透明

    [data-scheme="dark"] & {
        --card-background: rgba(0, 0, 0, 1); // 暗色下不透明
    }
}
```

正文区是长文本阅读区域，半透明背景会严重降低可读性，所以覆写为**完全不透明**——壁纸只在卡片四周露出。

### CSS 变量速查表（本站实际值）

| 变量 | 亮色 | 暗色 | 作用 |
|---|---|---|---|
| `--card-background` | `rgba(250,250,250,0.65)` | `rgba(0,0,0,0.65)` | 卡片背景（半透明） |
| `--card-border-color` | `rgba(250,250,250,0.65)` | `rgba(0,0,0,0.65)` | 卡片边框 |
| `--scrollbar-track` | `rgba(250,250,250,0.65)` | `rgba(0,0,0,0.65)` | 滚动条轨道 |
| `--table-border-color` | `#676767` | `#676767` | 表格边框（亮暗统一） |
| `--tr-even-background-color` | `rgba(128,128,128,0.3)` | `rgba(128,128,128,0.3)` | 表格斑马纹（亮暗统一） |
| `--blockquote-background-color` | `rgba(0,0,0,0.2)` | `rgba(250,250,250,0.1)` | 引用块背景 |
| `--pre-background-color` | `#f9f9ee` | `#22221c` | 代码块背景（与渐变遮罩配套） |
| `--code-text-color` | `#606060` | `#909090` | 行内代码文字 |
| `--code-background-color` | `#75757550` | `#75757550` | 行内代码背景 |
| `--body-text-color` | `#404040` | 继承 | 正文文字 |
| `--card-text-color-secondary` | `#404040` | 继承 | 次要文字 |

### 踩过的坑

- **表格亮暗显示不一致**：最初亮色 `#999999` / 暗色 `#404040`，暗色模式下边框几乎不可见；斑马纹 `rgba(200,200,200,0.2)` 又偏亮刺眼。改为亮暗**统一**的中性灰（`#676767` / `rgba(128,128,128,0.3)`）后，两种模式下观感一致（我就说67是宇宙终极数字）。

其余样式细节：

文件：`assets/scss/custom.scss`（第 27-33 行、第 87-90 行、第 102-124 行、第 144-165 行）

```scss
//页面背景
body {
    background-size: cover;
    background-repeat: no-repeat;
    background-attachment: fixed;
    background-position: center center;
}

//键盘按键
kbd {
    border-color: #555555 !important;
}

//滚动条
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: var(--scrollbar-track) !important;
}

::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.5);
    border-radius: 10px;

    &:hover {
        background: rgba(128, 128, 128, 0.7);
    }
}

* {
    scrollbar-width: thin;
    scrollbar-color: rgba(128, 128, 128, 0.5) transparent;
}

//复制按钮
[data-scheme="light"] {
    .copyCodeButton {
        background: #2c3e50 !important;
        color: #ecf0f1 !important;

        &:hover {
            background: #34495e !important;
        }
    }
}

[data-scheme="dark"] {
    .copyCodeButton {
        background: #7f8c8d !important;
        color: #ffffff !important;

        &:hover {
            background: #95a5a6 !important;
        }
    }
}
```

- `body` 的 `background-size: cover` 等四条属性为背景壁纸方案预留（`--body-background` 变量当前被注释，实际背景由第 3 章的 JS 图层控制，但保留这几条不影响）
- 滚动条细化为 6px 圆角（WebKit）+ Firefox `scrollbar-width: thin`，轨道色跟随 `--scrollbar-track` 变量（亮暗各自半透明）
- 复制代码按钮亮色深蓝 `#2c3e50` / 暗色灰 `#7f8c8d`
- `kbd` 键盘按键只统一了边框色 `#555555`（保持主题默认底色，两种模式下都自然）

---

## 引用块与 GitHub 风格 Alert 提示块

### 做了什么

两种引用样式：普通引用块统一为灰色系；GitHub 风格的提示块（`> [!note]` 等）带图标与彩色标题。

### 现场效果

>本站的灰色引用块是scss自定义的。

> [!note]
> 这是一个提示块，用于提供补充说明。

> [!tip]
> 这是一个技巧块，用于分享最佳实践或小窍门。

> [!important]
> 这是一个重要块，用于强调关键信息。

> [!warning]
> 这是一个警告块，用于提醒潜在风险。

> [!caution]
> 这是一个警示块，用于警告可能导致严重后果的操作。

### 灰色引用块

文件：`assets/scss/custom.scss`（第 35-44 行）

```scss
//引用块（灰色）
.article-content blockquote {
    border-color: #999;
    background-color: rgba(128, 128, 128, 0.12);
    color: #777;

    [data-scheme="dark"] & {
        color: #a0a0a0;
    }
}
```



### Alert 提示块：渲染钩子覆写

Hugo 0.14x+ 原生支持 GitHub 风格 alert 语法（`> [!note]`、`> [!tip]`、`> [!important]`、`> [!warning]`、`> [!caution]`），默认渲染成简单 blockquote。本站在 `layouts/_default/_markup/` 下覆写了它的渲染钩子（`render-blockquote-alert.html`），输出带图标的彩色提示块。

文件：`layouts/_default/_markup/render-blockquote-alert.html`（摘录：5 个图标 SVG 过长，tip/important/warning/caution 见仓库文件）

```html
{{- $titles := dict "note" "Note" "tip" "Tip" "important" "Important" "warning" "Warning" "caution" "Caution" -}}
{{- $icons := dict
    "note" `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>`
    "tip" `……（其余 4 个图标见仓库文件，每个均为 Octicons 风格的内联 SVG）……`
    "important" `……`
    "warning" `……`
    "caution" `……`
-}}
<blockquote class="alert alert-{{ .AlertType }}">
    <div class="alert-header">
        <span class="alert-title">{{ index $icons .AlertType | safeHTML }}{{ index $titles .AlertType }}</span>
    </div>
    <div class="alert-body">
        {{ .Text | safeHTML -}}
    </div>
</blockquote>
```

> [!note]
> 模板里 5 个图标各是 500+ 字符的整行内联 SVG，行号模式下会撑出超长滚动条。上面只完整展示 `note` 一个，其余（`tip` / `important` / `warning` / `caution`）都是同风格的 Octicons 图标，直接复制[仓库文件](https://github.com/Lightdust2024/Lightdust2024.github.io/blob/main/layouts/_default/_markup/render-blockquote-alert.html)即可。

### Alert 配色

文件：`assets/scss/custom.scss`（第 126-142 行）

```scss
//亮色模式使用 GitHub 亮色 alert 色值，暗色模式使用 GitHub 暗色同源色值
$alert-light: (note: #0965da, tip: #1f883d, important: #8250df, warning: #9a6700, caution: #cf222e);
$alert-dark: (note: #58a6ff, tip: #3fb950, important: #a371f7, warning: #d29922, caution: #f85149);

[data-scheme="light"] {
    @each $type, $color in $alert-light {
        --alert-#{$type}-color: #{$color};
        --alert-#{$type}-background: #{rgba($color, 0.08)};
    }
}

[data-scheme="dark"] {
    @each $type, $color in $alert-dark {
        --alert-#{$type}-color: #{$color};
        --alert-#{$type}-background: #{rgba($color, 0.15)};
    }
}
```

用 SCSS map + `@each` 循环生成 10 个 CSS 变量，亮色用 GitHub 亮色值，暗色用 GitHub 暗色同源值——这也再次演示了「定义 CSS 变量、由主题切换变量」的思路。

标题行的图标与文字排布（图标颜色跟随文字）：

文件：`assets/scss/custom.scss`（第 46-55 行）

```scss
//提示块标题
.alert-header .alert-title {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;

    svg {
        fill: currentColor;
    }
}
```

---

## 长代码块展开/收起按钮

### 做了什么

超过一定高度的代码块自动折叠，底部显示渐变遮罩和展开按钮，点击展开/收起。你正在读的这篇文章里的代码块，凡是超长的都已经折叠了——可以直接验证。

### 前置条件

代码块折叠针对的是**带行号**的长代码块，需要先开启行号：

文件：`config/_default/markup.toml`（摘录：highlight 段）

```toml
[highlight]
    lineNos            = true
    lineNumbersInTable = true
```

### 样式

文件：`layouts/partials/footer/custom.html`（第 62-149 行）

```html
<style>
    .highlight {
        /* 折叠高度，可按需调整 */
        max-height: 400px;
        overflow: hidden;
        /* 展开/收起的高度过渡动画（JS 动态设置 height） */
        transition: height 0.3s ease;
    }

    .code-show {
        max-height: none !important;
    }

    .code-more-box {
        width: 100%;
        padding-top: 78px;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
    }

    /* 渐变遮罩：展开时淡出、折叠时淡入 */
    .code-more-box::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        /* 底色跟随代码块背景（--pre-background-color 随明暗模式切换），避免露色差 */
        background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0), var(--pre-background-color));
        opacity: 1;
        transition: opacity 0.3s ease;
        pointer-events: none;
    }

    .code-more-btn {
        display: block;
        margin: auto;
        width: 44px;
        height: 22px;
        background: var(--card-background);
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        padding-top: 6px;
        cursor: pointer;
        transition: background 0.2s ease;
    }

    .code-more-img {
        cursor: pointer !important;
        display: block;
        margin: auto;
        width: 22px;
        height: 16px;
        transition: transform 0.3s ease;
    }

    /* 展开态：按钮改文档流定位，紧贴代码内容底部（absolute 底部定位会悬浮） */
    .highlight.code-show .code-more-box {
        background: none;
        padding-top: 8px;
        padding-bottom: 8px;
        position: static;
    }

    /* 展开时遮罩淡出 */
    .highlight.code-show .code-more-box::before {
        opacity: 0;
    }

    .highlight.code-show .code-more-btn {
        border-radius: 8px;
        height: 26px;
    }

    /* 收起图标 = 展开图标旋转 180° */
    .highlight.code-show .code-more-img {
        transform: rotate(180deg);
    }

    /* hover 反馈 */
    .code-more-btn:hover {
        filter: brightness(0.92);
    }
</style>
```

### 脚本

文件：`layouts/partials/footer/custom.html`（第 175-241 行）

```html
<script>
  function initCodeMoreBox() {
    let codeBlocks = document.querySelectorAll(".highlight");
    if (!codeBlocks) {
      return;
    }
    codeBlocks.forEach(codeBlock => {
      // 只处理超长代码块
      if (codeBlock.scrollHeight <= codeBlock.clientHeight) {
        return;
      }
      // 创建遮罩与按钮
      let codeMoreBox = document.createElement('div');
      codeMoreBox.classList.add('code-more-box');
      let codeMoreBtn = document.createElement('span');
      codeMoreBtn.classList.add('code-more-btn');
      // foldHeight：折叠态高度（展开时记录）；folding：折叠动画进行中
      let foldHeight = '';
      let folding = false;
      codeMoreBtn.addEventListener('click', () => {
        if (codeBlock.classList.contains('code-show') && !folding) {
          // 折叠：保留 code-show（解除 max-height 钳制）只过渡 height，动画结束再移除
          codeBlock.style.height = codeBlock.scrollHeight + 'px';
          void codeBlock.offsetHeight; // 强制 reflow，让起始高度生效
          codeBlock.style.height = foldHeight;
          folding = true;
        } else {
          // 展开：解除 max-height 限制后测量完整高度再过渡伸长
          // （折叠动画中反悔再点也走这里，直接从当前高度过渡回去）
          if (!codeBlock.classList.contains('code-show')) {
            foldHeight = getComputedStyle(codeBlock).maxHeight;
            codeBlock.classList.add('code-show');
            const targetHeight = codeBlock.scrollHeight;
            codeBlock.style.height = foldHeight; // 先落到折叠高度，再过渡到完整高度
            void codeBlock.offsetHeight; // 强制 reflow，让起始高度生效
            codeBlock.style.height = targetHeight + 'px';
          } else {
            codeBlock.style.height = codeBlock.scrollHeight + 'px';
          }
          folding = false;
        }
        // 触发 resize 事件，重新计算目录位置
        window.dispatchEvent(new Event('resize'))
      })

      // 过渡结束清除内联高度，恢复 CSS 控制
      codeBlock.addEventListener('transitionend', (e) => {
        if (e.propertyName === 'height') {
          codeBlock.style.height = '';
          // 折叠结束才移除 code-show，恢复 max-height 钳制
          if (folding) {
            folding = false;
            codeBlock.classList.remove('code-show');
          }
        }
      })
      let img = document.createElement('img');
      img.classList.add('code-more-img');
      img.src = {{ (resources.Get "icons/codeMore.png").RelPermalink }}
      codeMoreBtn.appendChild(img);
      codeMoreBox.appendChild(codeMoreBtn);
      codeBlock.appendChild(codeMoreBox)
    })
  }

  initCodeMoreBox();
</script>
```

要点：

1. **只折叠真正超长的块**：`scrollHeight > clientHeight` 判定，短代码块不注入按钮，不会被误折叠。
2. **图标资源走 Hugo 管道**：`(resources.Get "icons/codeMore.png").RelPermalink` 在构建时解析为带 hash 的产物路径（`codeMore.png` 是 577 字节的极小图标）。
3. **展开图标复用**：收起状态就是展开图标旋转 180°。
4. **动画机制**：CSS 的 `max-height` 从 400px 过渡到 `none` 是不成立的（`none` 不是可过渡值），所以动画由 JS 驱动——点击时先测量 `scrollHeight` 得到真实完整高度，再让 `height` 在折叠高度与完整高度之间做 0.3s 过渡。折叠方向有个关键细节：**折叠动画期间必须保留 `code-show`**——一旦移除，`max-height: 400px` 立即恢复并钳制实际渲染高度，`height` 过渡就不可见了（这也是"展开有动画、折叠没有"的根因）。所以折叠时只把 `height` 收缩到展开前记录的折叠高度（`foldHeight`，在展开时从 `getComputedStyle(codeBlock).maxHeight` 读取，改 CSS 里的 `max-height` 值后 JS 无需同步），等 `transitionend` 之后才移除 `code-show` 恢复钳制，遮罩淡入与按钮复位也顺延到此刻触发。过渡结束统一用 `transitionend` 清掉内联高度，恢复 CSS 控制。

代码块内部所有子元素（Chroma 高亮表格等）的背景统一强制为 `--pre-background-color`，与折叠遮罩共用同一个变量：

文件：`assets/scss/custom.scss`（第 92-100 行）

```scss
//代码高亮块
.highlight {
    pre,
    table,
    td,
    .lntd {
        background-color: var(--pre-background-color) !important;
    }
}
```

### 踩过的坑

- **渐变遮罩露色差**：遮罩渐变终点的颜色必须与代码块背景完全一致。因为代码块背景在亮/暗模式下不同（`--pre-background-color`：亮 `#f9f9ee` / 暗 `#22221c`），遮罩用 `var(--pre-background-color)` 而不是写死的颜色，两种模式都不会露出色差。
- **展开后按钮悬空**：按钮最初用 `absolute` 定位在容器底部（`bottom: 0`），展开后它与代码最后一行之间隔着内边距，看起来悬浮在空中。`.code-show` 下改为 `position: static` 后按钮紧随代码内容，吸附在下边缘。
- **展开后目录高亮错位**：代码块展开改变了页面高度，TOC 的滚动监听没有更新——点击后 `dispatchEvent(new Event('resize'))` 让 TOC 重新计算（见下一节）。
- **遮罩与动画的冲突**：最初的渐变直接写在 `.code-more-box` 的 `background-image` 上，`background-image` 不能过渡，展开瞬间遮罩会"啪"地消失。把渐变移到 `::before` 伪元素上后，用 `opacity` 过渡实现淡出/淡入，与高度动画同步。
- **折叠没有动画**：折叠时如果先移除 `code-show` 再过渡 `height`，`max-height: 400px` 会立即钳制实际渲染高度，`height` 过渡不可见——展开正常是因为 `code-show` 已解除钳制，两者表现不对称。修复：折叠期间保留 `code-show`，只让 `height` 收缩到记录下的折叠高度，`transitionend` 后再移除 `code-show` 恢复钳制。

---

## TOC 目录滚动联动折叠

### 做了什么

文章侧边栏的目录只显示当前章节所在层级：滚动时自动展开当前标题的子目录、收起其他层级，避免长文章目录树全部铺开。

### 前置条件

文章页需要开启 TOC widget：

文件：`config/_default/params.toml`（摘录：widgets 段）

```toml
[widgets]
    homepage = [
        { type = "search" },
        { type = "archives", params = { limit = 5 } },
    ]
    page = [{ type = "toc" }]
```

### 样式

文件：`layouts/partials/footer/custom.html`（第 12-21 行）

```html
<style>
    #TableOfContents > ul, ol {
        ul, ol {
            display: none;
        }
        .open {
            display: block;
        }
    }
</style>
```

默认隐藏嵌套的子目录，`.open` 类展开。

### 脚本

文件：`layouts/partials/footer/custom.html`（第 25-59 行）

```html
<script>
    function initTocHide() {
        // 判断是否存在文章目录
        let toc = document.querySelector(".widget--toc");
        if (!toc) {
            return;
        }
        // 监听滚动
        window.addEventListener('scroll', function() {
            //清除class值
            let openUl = document.querySelectorAll(".open");
            if (openUl.length > 0) {
              openUl.forEach((ul) => {
                ul.classList.remove("open")
              })
            }
            // 获取active-class
            let currentLi = document.querySelector(".active-class");
            if (!currentLi) {
                return
            }
            // 展示子ul
            if (currentLi.children.length > 1) {
                currentLi.children[1].classList.add("open")
            }
            // 展示父ul
            let ul = currentLi.parentElement;
            do {
                ul.classList.add("open");
                ul = ul.parentElement.parentElement
            } while (ul !== undefined && (ul.localName === 'ul' || ul.localName === 'ol'))
        });
    }
    initTocHide()
</script>
```

逻辑：滚动时清空所有 `.open`，找到当前高亮项（主题会给当前章节的 TOC 项加 `.active-class`），展开它的子目录并向上逐级展开父目录。

### 踩过的坑

- **一级标题不出现在 TOC 中**：Hugo 默认从 `h2` 开始生成目录（见 `config/_default/markup.toml` 的 `startLevel = 2`），并且会过滤掉与文章 `title` 相同的 `h1`。所以本站文章的正文标题统一用 `##`（二级标题）起步，页面大标题由 front matter 的 `title` 提供——本文的目录就是从「写在前面」这个 h2 开始的。

---

## 主题切换按钮文案修复

### 问题现象

亮色模式下切换按钮显示「暗色模式」（正确，表示点击可切到暗色），但切到暗色模式后按钮仍显示「暗色模式」（错误，应显示「亮色模式」）——即提交 4049b65 修复的「'亮色模式'显示为'暗色模式'」bug。

### 根因

主题自带的中文翻译文件 `themes/stack/i18n/zh.toml` 中只有 `darkMode` 键，缺少 `lightMode` 键，主题脚本切换主题时找不到文案，就回退到了 `darkMode` 的文案。

### 修复

第一步，新建项目级翻译覆盖文件，补上缺失的键（项目级 `i18n/zh.toml` 会覆盖主题内同名文件）：

文件：`i18n/zh.toml`

```toml
darkMode = "暗色模式"
lightMode = "亮色模式"
```

第二步，在 footer 里监听主题切换事件，用 Hugo 的 `{{ T }}` 在渲染时替换文案：

文件：`layouts/partials/footer/custom.html`（第 151-172 行）

```html
<script>
  // 同步主题切换按钮文字：亮色模式显示「暗色模式」，暗色模式显示「亮色模式」
  (function () {
    var toggle = document.getElementById('dark-mode-toggle');
    var label = toggle && toggle.querySelector('span');
    if (!label) {
      return;
    }
    // 从 i18n 读取文案（T 函数渲染时替换，不要用 jsonify——会被二次转义成带引号字符串）
    var darkLabel = '{{ T "darkMode" }}';
    var lightLabel = '{{ T "lightMode" }}';
    var updateLabel = function (scheme) {
      label.textContent = scheme === 'dark' ? lightLabel : darkLabel;
    };
    // 监听主题切换事件
    window.addEventListener('onColorSchemeChange', function (e) {
      updateLabel(e.detail);
    });
    // 初始化同步一次，避免事件在监听注册前已派发
    updateLabel(document.documentElement.getAttribute('data-scheme'));
  })();
</script>
```

### 踩过的坑

- **文案写死在 JS 里不优雅且不可翻译**——用 `{{ T "darkMode" }}` 走 Hugo 的 i18n 系统，翻译管理统一。
- **`jsonify` 二次转义**：注释里特意警告不要用 `jsonify` 输出文案——它会在 script 上下文中把字符串再包一层引号，渲染出的 JS 变成带引号的字面量，`label.textContent` 会显示成「"暗色模式"」。
- **事件早于监听注册**：`onColorSchemeChange` 在初始化切换时可能已经派发过一次，所以脚本执行时先手动同步一次当前 `data-scheme`，避免按钮文案停留在默认值。
- **暗色模式下按钮文字更粗**：文案修好后按钮会随模式显示「暗色模式」/「亮色模式」，但主题 `sidebar.scss` 在 `[data-scheme="dark"]` 下给 `#dark-mode-toggle` 加了 `font-weight: 700`（配合 accent 色），亮色模式则未设置字重——于是暗色模式下显示的「亮色模式」比亮色模式下显示的「暗色模式」更粗。修复：在 `assets/scss/custom.scss`（第 192-195 行）用相同特异性的 `[data-scheme="dark"] #dark-mode-toggle` 覆写为 `font-weight: 400`。能生效依赖编译顺序：主题 `style.scss` 最后一行 `@import "custom.scss"`，同特异性下后定义者生效。

---

## NProgress 页面加载进度条

### 做了什么

页面顶部一条跟随加载进度的细进度条，单页导航（Stack 用 PJAX 加载内容）时也有反馈。

### 实现

文件：`layouts/partials/footer/custom.html`（第 1-9 行）

```html
<script src="https://npm.elemecdn.com/nprogress@0.2.0/nprogress.js" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://npm.elemecdn.com/nprogress@0.2.0/nprogress.css" crossorigin="anonymous" />
<script>
    NProgress.start();
    document.addEventListener("readystatechange", () => {
        if (document.readyState === "interactive") NProgress.inc(0.8);
        if (document.readyState === "complete") NProgress.done();
    });
</script>
```

用 CDN 引入 nprogress 0.2.0，`readystatechange` 驱动：HTML 解析完成（interactive）进到 80%，资源加载完成（complete）收尾。这个 CDN 依赖是后面「Cloudflare 加速」章节的伏笔——第三方 CDN 是本站权衡后保留的唯一外部资源。

---

## 封面与缩略图：构建期 WebP 压缩

### 问题

封面原图是 4-6MB 的 PNG（如本文章封面 `cover.png` 5.73MB），每次加载封面都要下载几 MB，体验很差。

### 做法

覆写主题的两个图片渲染 partial，在**构建期**把所有封面、正文图片、缩略图统一转成 WebP（质量 q100），而不是在浏览器端压缩。

文件：`layouts/_partials/helper/responsive-image.html`（全文，用于封面与正文图片）

```go-html-template
{{- /*
Params:
    Resource: Hugo image resource object (Optional, for processing)
    Widths: Slice of widths to generate for srcset
    Attributes: Map of HTML attributes for the <img> tag
*/ -}}

{{- $resource := .Resource -}}
{{- $widths := .Widths -}}
{{- $attributes := .Attributes | default dict -}}

{{- if and $widths $resource (reflect.IsImageResourceProcessable $resource) -}}
    {{- $srcset := slice -}}
    {{- range $widths -}}
        {{- if lt . $resource.Width -}}
            {{/* 各宽度候选转 WebP 并压缩（与背景图方案一致） */}}
            {{- $resized := $resource.Resize (printf "%dx webp q100" .) -}}
            {{- $srcset = $srcset | append (printf "%s %dw" $resized.RelPermalink .) -}}
        {{- end -}}
    {{- end -}}

    {{- if gt (len $srcset) 0 -}}
        {{/* 全尺寸原图同样转 WebP，作为 srcset 最大候选和 src 兜底，
            避免浏览器回退到原始 PNG 大文件 */}}
        {{- $full := $resource.Process "webp q100" -}}
        {{- $srcset = $srcset | append (printf "%s %dw" $full.RelPermalink $resource.Width) -}}
        {{- $attributes = merge $attributes (dict "src" $full.RelPermalink "srcset" (delimit $srcset ", ")) -}}
    {{- end -}}
{{- end -}}

<img {{- range $k, $v := $attributes -}}
    {{- if $v -}}
        {{- printf " %s=%q" (lower $k) (printf "%v" $v) | safeHTMLAttr -}}
    {{- end -}}
{{- end -}}>
```

文件：`layouts/_partials/helper/thumbnail-image.html`（全文，用于列表页与相关文章缩略图）

```go-html-template
{{- /*
Params:
    Resource: Hugo image resource object (Optional, for processing)
    Width: Image width (Required)
    Height: Image height (Required)
    Resize: Whether to perform resize (Optional, default: false)
    Attributes: Map of HTML attributes for the <img> tag
*/ -}}

{{- $resource := .Resource -}}
{{- $width := .Width -}}
{{- $height := .Height -}}
{{- $resize := .Resize -}}
{{- $attributes := .Attributes | default dict -}}

{{- if and $resize $resource (reflect.IsImageResourceProcessable $resource) $width $height -}}
    {{- $srcset := slice -}}
    {{- range (slice 1 2) -}}
        {{- $w := mul $width . -}}
        {{- $h := mul $height . -}}
        {{- if and (le $w $resource.Width) (le $h $resource.Height) -}}
            {{/* 缩略图转 WebP 并压缩（与背景图方案一致） */}}
            {{- $resized := $resource.Fill (printf "%dx%d webp q100" $w $h) -}}
            {{- $srcset = $srcset | append (printf "%s %dx" $resized.RelPermalink .) -}}

            {{- if eq . 1 -}}
                {{- $attributes = merge $attributes (dict "src" $resized.RelPermalink) -}}
            {{- end -}}
        {{- end -}}
    {{- end -}}

    {{- if gt (len $srcset) 0 -}}
        {{- $attributes = merge $attributes (dict "width" $width "height" $height "srcset" (delimit $srcset ", ")) -}}
    {{- end -}}
{{- end -}}

<img {{- range $k, $v := $attributes -}}
    {{- if $v -}}
        {{- printf " %s=%q" (lower $k) (printf "%v" $v) | safeHTMLAttr -}}
    {{- end -}}
{{- end -}}>
```

要点拆解：

1. **调用链**：主题的 `themes/stack/layouts/_partials/article/components/header.html` 渲染封面时调用 `helper/responsive-image`，`render-image.html` 渲染正文图片，列表页的 list/compact/tile 布局调用 `helper/thumbnail-image` 渲染缩略图——覆写这两个 partial 就全部覆盖了。
2. **响应式候选**：`responsive-image` 按主题默认宽度候选（`themes/stack/config/_default/params.toml` 的 `imageProcessing.content.widths = [800, 1600, 2400]`）生成 srcset，每个候选都是 `Resize "Wx webp 100"`。
3. **src 兜底防回退**：最容易踩的坑——原主题的 `src` 直接指向原始 PNG。浏览器在 srcset 全部加载失败（或没命中）时会回退到 `src`，如果 `src` 还是 4.4MB 的原始 PNG，前面的压缩就白做了。所以最大候选和 `src` 都用 `Process "webp q100"` 生成的全尺寸 WebP。
4. **缩略图**：`thumbnail-image` 的 1x/2x 候选改为 `Fill "WxH webp q100"`。

### 效果

封面从 4.22MB / 5.73MB 降至约 **150KB / 200KB**，约缩小 96.5%。构建产物验证：`resources/_gen/images/p/` 下每个封面都有多尺寸 WebP 候选文件。

---

## 配置定制汇总

### 链接结构

文件：`config/_default/permalinks.toml`

```toml
# Permalinks format of each content section
post = "/p/:slug/"
page = "/:slug/"
```

文章 URL 为 `/p/<slug>/`（slug 与目录名无关，如本文 slug 是 `StackCustomized`），页面为 `/:slug/`。

### Markdown 渲染与代码高亮

文件：`config/_default/markup.toml`

```toml
# Markdown renderer configuration
[goldmark.renderer]
    unsafe = true

[goldmark.extensions.passthrough]
    enable = true

    # LaTeX math support
    # https://gohugo.io/content-management/mathematics/
    [goldmark.extensions.passthrough.delimiters]
        block  = [['\[', '\]'], ['$$', '$$']]
        inline = [['\(', '\)']]

[tableOfContents]
    endLevel   = 4
    ordered    = true
    startLevel = 2

[highlight]
    noClasses          = false
    codeFences         = true
    guessSyntax        = true
    lineNoStart        = 1
    lineNos            = true
    lineNumbersInTable = true
    tabWidth           = 4
```

- `goldmark.renderer.unsafe = true`：允许 Markdown 里直接写 HTML（部分文章需要）
- passthrough：开启 LaTeX 数学公式（`$$` / `\[ \]` 块级、`\( \)` 行内），配合文章 front matter 的 `math: true` 启用 KaTeX
- TOC：2-4 级、有序列表
- 代码高亮：全局行号

### 文章更新时间取 Git

文件：`hugo.toml`（第 11-15 行）

```toml
[frontmatter]
  lastmod = [":git", ":fileModTime"]

#允许获取Git信息
enableGitInfo = true
```

文章的"最后更新"时间自动取 Git 提交时间，回退到文件修改时间——不用手动维护 `lastmod` 字段，改完文章 push 即自动更新。

### 主题参数

文件：`config/_default/params.toml`（摘录）

```toml
[sidebar]
    subtitle = "Lightdust的个人博客"
    avatar   = "img/avatar.png"

[article]
    readingTime = true

    [article.license]
        enabled = true
        default = "Licensed under CC BY-NC-SA 4.0"

[widgets]
    homepage = [
        { type = "search" },
        { type = "archives", params = { limit = 5 } },
    ]
    page = [{ type = "toc" }]

[colorScheme]
    toggle  = true
    default = "auto"

[comments]
    enabled  = false
```

- `colorScheme.toggle = true` + `default = "auto"`：显示主题切换按钮并默认跟随系统——前面第 3、4、9 章的所有功能都以它为前提
- 文章默认许可证 CC BY-NC-SA 4.0；评论区关闭

---

## 部署：GitHub Actions + GitHub Pages

### 工作流

push 到 `main` 分支后自动构建并部署到 GitHub Pages。文件：`.github/workflows/hugo.yaml`

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Git Configuration
        run: |
          git config --global core.quotePath false
          git config --global core.autocrlf false
          git config --global core.safecrlf true
          git config --global core.ignorecase false

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true

      - name: Build
        run: hugo --minify

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

### 踩过的坑

- **Windows 开发环境的中文路径与换行符**：本地在 Windows 上开发（Git 默认 `core.autocrlf` 可能把换行符转成 CRLF，中文文件名有转义问题），CI 在 Linux 上构建，两边的 Git 行为不一致会导致 checkout 出来的文件与本地不同。工作流里显式配置了 4 行：`quotePath false`（中文路径不转义）、`autocrlf false`（不转换换行符）、`safecrlf true`、`ignorecase false`（大小写敏感），保证 CI 与本地行为一致。
- **`public/` 与 `resources/` 不提交**：构建产物只在 CI 生成，本地仓库已停止跟踪（提交 69fdfed）。

---

## Cloudflare CDN 加速

### 折腾史：jsDelivr 的尝试与放弃

我曾试图用 jsDelivr 免费 CDN 加速 GitHub Pages 上的静态资源：把 `public/` 构建产物提交进仓库，通过 `cdn.jsdelivr.net/gh/用户名/仓库@分支/` 的形式引用资源（提交 47a223e）。最终因为两个原因放弃（提交 c61a452）：

1. **构建产物进版本库**：每次构建都要提交 `public/`，提交历史被产物污染，无法审查 diff；
2. **一致性风险**：CDN 缓存与仓库不同步时，线上会引用到旧资源。

取舍之后删掉了 jsDelivr，保留 Cloudflare 的免费套餐做整站代理，`public/` 恢复不跟踪。

### Cloudflare 接入步骤（GitHub Pages 场景）

1. 注册 Cloudflare，添加域名，把域名的 DNS 服务器改为 Cloudflare 提供的两个。
2. DNS 记录：CNAME 指向 `用户名.github.io`，开启代理（橙色云朵）。
3. SSL/TLS：加密模式选**完全（严格）**，开启**始终使用 HTTPS**。
4. 新接入时证书签发可能需 15 分钟～24 小时，期间先用**完全**模式，待证书有效后再改回**完全（严格）**。

---

## 参考资源

- [Stack 主题个性化配置指南](https://smallstep.one/hugo-stack-config/)
- [Stack 4.0 CSS 变量完整参考](https://smallstep.one/hugo-stack-css-variables/)
- [custom.scss 定制教程](https://smallstep.one/hugo-stack-custom-style/)
- [Stack 主题官方仓库](https://github.com/CaiJimmy/hugo-theme-stack)
- [主题美化案例](https://liu-houliang.github.io/hugo-stack-starter/en/post/theme-customization/)
- [Stack主题自定义修改](https://letere-gzj.github.io/hugo-stack/p/hugo/custom-stack-theme/)
- [本博客源码仓库](https://github.com/Lightdust2024/myblog)
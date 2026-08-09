---
title: stack主题文档
description: 官方文档
slug: HugoThemesLearning
date: 2023-08-26 00:00:00+0000
image: cover.jpg
math: true

---

# 图片画廊

使用 Markdown 创建漂亮的交互式图片画廊

Hugo Stack 主题支持使用 Markdown 创建交互式图片画廊。它由 [PhotoSwipe](https://photoswipe.com/) 驱动，其语法灵感来自 [Typlog](https://typlog.com/)。

要使用此功能，图片必须与 Markdown 文件位于同一目录中，因为它需要借助 Hugo 的页面包（page bundle）功能来读取图片尺寸。**不支持外部图片。**

## 语法

```markdown
![图片 1](1.jpg) ![图片 2](2.jpg)
```

## 效果

![图片 1](1.jpg) ![图片 2](2.jpg)

> 照片来自 [mymind](https://unsplash.com/@mymind) 和 [Luke Chesser](https://unsplash.com/@lukechesser)，发布于 [Unsplash](https://unsplash.com/)



# Markdown 语法指南

展示基本 Markdown 语法及 HTML 元素格式化的示例文章

本文展示了可在 Hugo 内容文件中使用的基本 Markdown 语法示例，同时演示了 Hugo 主题中的基本 HTML 元素是否带有 CSS 样式。

<!--more-->

## 标题

HTML `<h1>`—`<h6>` 元素代表了六个层级的章节标题。`<h1>` 是最高层级的标题，而 `<h6>` 是最低层级的标题。


## 段落

这是一段示例文字，用于展示中文段落在页面上的排版效果。它可以包含多句话，用以模拟真实文章中的段落长度。这段文字仅仅是为了演示排版样式，并不传达任何具体含义。你可以看到，普通段落在默认样式下会呈现为首行缩进、行距适中的正文样式，并与其他元素保持合理的间距。

这是第二段示例文字。在真实文章中，段落之间通常会用一个空行分隔，以便读者更轻松地阅读。Hugo 在渲染 Markdown 时会自动将连续的文本行合并为段落。

## 引用块

引用块元素表示从其他来源引用的内容，可以附带位于 `footer` 或 `cite` 元素内的引用来源，也可以包含诸如注释和缩写之类的行内修改。

### 无署名的引用块

> 这是一段被引用的文字，用于展示引用块的样式。引用块通常用于突出显示他人说过的话或需要特别强调的内容。
> **注意**，在引用块内可以使用 *Markdown 语法*。

### 带署名的引用块

> 不要通过共享内存来通信，而要通过通信来共享内存。<br>
> — <cite>Rob Pike[^1]</cite>

[^1]: 上述引言摘自 Rob Pike 在 2015 年 11 月 18 日 Gopherfest 上的[演讲](https://www.youtube.com/watch?v=PAAkCSZUG1c)。

## 表格

表格并非核心 Markdown 规范的一部分，但 Hugo 开箱即用地支持它们。

| 姓名  | 年龄 |
| ----- | ---- |
| Bob   | 27   |
| Alice | 23   |

### 表格中的行内 Markdown

| 斜体      | 粗体     | 代码   |
| --------- | -------- | ------ |
| *italics* | **bold** | `code` |

| A                                                        | B                                                            | C                                                            | D                                                 | E                                                          | F                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Lorem ipsum dolor sit amet, consectetur adipiscing elit. | Phasellus ultricies, sapien non euismod aliquam, dui ligula tincidunt odio, at accumsan nulla sapien eget ex. | Proin eleifend dictum ipsum, non euismod ipsum pulvinar et. Vivamus sollicitudin, quam in pulvinar aliquam, metus elit pretium purus | Proin sit amet velit nec enim imperdiet vehicula. | Ut bibendum vestibulum quam, eu egestas turpis gravida nec | Sed scelerisque nec turpis vel viverra. Vivamus vitae pretium sapien |

这是一段示例文字，用于展示表格单元格中较长文本的显示效果。

## 代码块

### 使用反引号的代码块

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Example HTML5 Document</title>
</head>
<body>
  <p>Test</p>
</body>
</html>
```

### 缩进四个空格的代码块

    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Example HTML5 Document</title>
    </head>
    <body>
      <p>Test</p>
    </body>
    </html>

### Diff 代码块

```diff
[dependencies.bevy]
git = "https://github.com/bevyengine/bevy"
rev = "11f52b8c72fc3a568e8bb4a4cd1f3eb025ac2e13"
- features = ["dynamic"]
+ features = ["jpeg", "dynamic"]
```

### 单行代码块

```html
<p>A paragraph</p>
```

## 列表类型

### 有序列表

1. 第一项
2. 第二项
3. 第三项

### 无序列表

* 列表项
* 另一个列表项
* 还有一个列表项

### 嵌套列表

* 水果
  * 苹果
  * 橙子
  * 香蕉
* 乳制品
  * 牛奶
  * 奶酪

## 其他元素——abbr、sub、sup、kbd、mark

<abbr title="Graphics Interchange Format">GIF</abbr> 是一种位图图像格式。

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

按 <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd> 结束会话。

大多数<mark>火蜥蜴</mark>是夜行性动物，以昆虫、蠕虫和其他小型生物为食。



# 数学排版

使用 KaTeX 进行数学排版

Stack 内置了对使用 [KaTeX](https://katex.org/) 进行数学排版的支持。

**默认情况下它并未全站启用，** 但你可以通过在 front matter 中添加 `math: true` 来为单篇文章启用它。或者你也可以在 `config.toml` 的 `params.article` 部分添加 `math = true` 来全站启用。

## 行内数学

这是一个行内数学表达式：$\varphi = \dfrac{1+\sqrt5}{2}= 1.6180339887…$

```markdown
$\varphi = \dfrac{1+\sqrt5}{2}= 1.6180339887…$
```

## 块级数学

$$
    \varphi = 1+\frac{1} {1+\frac{1} {1+\frac{1} {1+\cdots} } } 
$$

```markdown
$$
    \varphi = 1+\frac{1} {1+\frac{1} {1+\frac{1} {1+\cdots} } } 
$$
```

$$
    f(x) = \int_{-\infty}^\infty\hat f(\xi)\,e^{2 \pi i \xi x}\,d\xi
$$

```markdown
$$
    f(x) = \int_{-\infty}^\infty\hat f(\xi)\,e^{2 \pi i \xi x}\,d\xi
$$
```



# 短代码

可以在 Markdown 中使用的实用短代码

更多详情，请查看[文档](https://stack.jimmycai.com/writing/shortcodes)。

## Bilibili 视频

{{< bilibili "BV1d4411N7zD" >}}

## 腾讯视频

{{< tencent "g0014r3khdw" >}}

## YouTube 视频

{{< youtube "0qwALOOvUik" >}}

## 通用视频文件

{{< video "https://www.w3schools.com/tags/movie.mp4" >}}

## GitLab

{{< gitlab 2589724 >}}

## 引用

{{< quote author="一位知名人士" source="他们写的书" url="https://en.wikipedia.org/wiki/Book">}}
这里是引用内容。引用可以是一段较长的文字，用于展示该短代码的显示效果。当你希望在一篇文章中突出显示某段名言、评论或重要说明时，可以使用引用短代码。它会以醒目的样式呈现这段文字，并可选地附上作者与来源信息。引用内容支持普通的 Markdown 格式，包括行内代码、链接和强调等。如果引用内容较长，它会自动换行并保持良好的可读性。
{{< /quote >}}

-----

> 照片来自 [Codioful](https://unsplash.com/@codioful)，发布于 [Unsplash](https://unsplash.com/photos/WDSN62Qdxuk)


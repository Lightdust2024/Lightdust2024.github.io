# -*- coding: utf-8 -*-
"""校验文章《Hugo Stack 主题个性化实践记录》中的代码引用与源文件逐字节一致。

解析 content/post/StackCustomized/index.md 中「文件：`path`（第 X-Y 行）」形式的标注，
提取紧随其后的 fenced code block，与源文件对应内容对比。
"""
import re
import sys
from pathlib import Path

# Windows 控制台输出 UTF-8
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = __import__("io").TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
ARTICLE = ROOT / "content" / "post" / "StackCustomized" / "index.md"

RANGE_RE = re.compile(r"第\s*(\d+)\s*-\s*(\d+)\s*行")
FILE_RE = re.compile(r"文件：`([^`]+)`(?:（([^）]+)）)?")


def extract_blocks(text):
    """解析文章，返回 [(file, range_or_None, code_block_str)]"""
    blocks = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        m = FILE_RE.search(lines[i])
        if not m:
            i += 1
            continue
        fname, rng = m.group(1), m.group(2)
        # 找代码块边界：紧跟标注行的 ``` 与下一个 ```
        j = i + 1
        while j < len(lines) and not lines[j].startswith("```"):
            j += 1
        if j >= len(lines):
            i += 1
            continue
        k = j + 1
        while k < len(lines) and not lines[k].startswith("```"):
            k += 1
        code = "\n".join(lines[j + 1 : k])
        ranges = [(int(a), int(b)) for a, b in RANGE_RE.findall(rng or "")] or None
        # 标注含「摘录」的引用不做逐字节校验（文章有意省略）
        excerpt = rng is not None and "摘录" in rng
        blocks.append((fname, ranges, code, excerpt))
        i = k + 1
    return blocks


def main():
    text = ARTICLE.read_text(encoding="utf-8")
    blocks = extract_blocks(text)
    failures = 0
    for fname, ranges, code, excerpt in blocks:
        path = ROOT / fname
        if not path.exists():
            print(f"[缺失文件] {fname}")
            failures += 1
            continue
        if excerpt:
            print(f"[摘录跳过] {fname} {ranges or ''}")
            continue
        src = path.read_text(encoding="utf-8")
        if ranges:
            # 多个区间按顺序拼接（区间间以空行分隔，与文章展示一致；
            # 每段去尾部空行，避免区间边界含空行导致误报）
            parts = []
            for a, b in ranges:
                lines = src.splitlines()
                parts.append("\n".join(lines[a - 1 : b]).rstrip("\n"))
            expect = "\n\n".join(parts)
        else:
            expect = src.rstrip("\n")
        if code == expect:
            print(f"[OK] {fname} {ranges or '全文'}")
        else:
            print(f"[不一致] {fname} {ranges or '全文'}")
            failures += 1
    print(f"\n共 {len(blocks)} 处引用，{failures} 处不一致")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
KindleハイライトPDFからハイライトテキストを抽出してJSON出力する
usage: python3 extract-pdf-highlights.py <pdf_path>
"""
import sys
import json
import re

def clean_text(text: str) -> str:
    """全角スペースや改行を整理する"""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_highlights(pdf_path: str) -> dict:
    try:
        import pypdf
    except ImportError:
        return {"error": "pypdf not installed. Run: /usr/bin/pip3 install pypdf"}

    try:
        reader = pypdf.PdfReader(pdf_path)
    except Exception as e:
        return {"error": f"Failed to read PDF: {str(e)}"}

    full_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"

    # タイトルは1行目
    lines = [l.strip() for l in full_text.strip().split("\n") if l.strip()]
    title = lines[0] if lines else "Unknown"

    # テキスト全体を結合
    combined = " ".join(lines)

    # "— location: NNN" パターンで分割
    segments = re.split(r'[—\-–]\s*location:\s*\d+', combined)

    highlights = []
    for seg in segments:
        text = clean_text(seg)
        if len(text) < 10:
            continue

        # 最初のセグメントからタイトル・Metadata・Highlights ヘッダーを除去
        for header in [title, "Metadata", "Highlights"]:
            if text.startswith(header):
                text = text[len(header):].strip()

        # 末尾の Author / ASIN / Reference 情報を除去
        text = re.sub(r'Author:.*$', '', text, flags=re.DOTALL).strip()

        text = clean_text(text)
        if len(text) < 10:
            continue

        highlights.append(text)

    return {
        "title": title,
        "highlights": highlights
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 extract-pdf-highlights.py <pdf_path>"}))
        sys.exit(1)

    result = extract_highlights(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))

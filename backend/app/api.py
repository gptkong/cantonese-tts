"""
API utility functions for text processing
"""
import jieba
from typing import List, Dict, Any


def clean_text(text: str) -> str:
    """
    Clean text by removing special characters but preserving newlines.

    Args:
        text: Raw text

    Returns:
        Cleaned text
    """
    import re
    # Replace tabs and spaces with single space
    text = re.sub(r'[ \t\f\r]+', ' ', text)
    # Replace multiple spaces with single space
    text = re.sub(r' +', ' ', text)
    return text.strip()


def clean_words(words: List[str]) -> List[str]:
    """
    Clean word list by removing empty strings and special characters.

    Args:
        words: List of words

    Returns:
        Cleaned word list
    """
    cleaned = []
    for word in words:
        # Remove non-Chinese characters
        word_clean = ''.join(char for char in word if '\u4e00' <= char <= '\u9fff')
        if word_clean and len(word_clean) >= 1:
            cleaned.append(word_clean)
    return cleaned


async def segment_text_by_sentences(text: str) -> List[Dict[str, Any]]:
    """
    Segment text into sentences and then segment each sentence into words.

    Args:
        text: Raw text input

    Returns:
        List of dictionaries with sentence and words
    """
    # Split by newlines first
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    sentences = []

    for line in lines:
        # Split by Chinese punctuation
        sub_sentences = []
        current = ""

        for char in line:
            current += char
            if char in '。！？':
                if current.strip():
                    sub_sentences.append(current.strip())
                current = ""

        # Add remaining text if any
        if current.strip():
            sub_sentences.append(current.strip())

        # If no sub-sentences were created, use the whole line
        if not sub_sentences:
            sub_sentences = [line]

        sentences.extend(sub_sentences)

    # Segment each sentence
    results = []
    for sentence in sentences:
        # Perform jieba segmentation
        words = list(jieba.cut(sentence))

        # Clean words
        words_clean = clean_words(words)

        if words_clean:
            results.append({
                "sentence": sentence,
                "words": words_clean
            })

    return results

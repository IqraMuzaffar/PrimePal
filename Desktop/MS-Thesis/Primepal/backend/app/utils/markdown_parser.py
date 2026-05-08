"""
Markdown code block stripping utility.

LLM responses sometimes wrap JSON in markdown fences like:
    ```json
    { ... }
    ```

This module provides a robust line-based parser that handles edge cases:
  - Missing closing fence
  - Language tag on opening fence (```json, ```python, etc.)
  - Multiple fenced blocks (extracts the first one)
  - Nested backticks inside content
"""
import logging

logger = logging.getLogger(__name__)


def strip_markdown_code_block(text: str) -> str:
    """
    Strip markdown code fences from LLM response text using line-based parsing.

    C2 fix: The old approach (`text.split("```")[1]`) broke when:
      - The closing fence was missing
      - Content contained backticks
      - There were multiple fenced blocks

    This implementation walks the text line-by-line:
      1. If a line starts with ```, toggle the "inside fence" flag.
      2. On the opening fence, strip any language tag (e.g. "json").
      3. Collect all lines between opening and closing fences.
      4. If no fence is found, return the original text unchanged.

    Args:
        text: Raw LLM response that may contain markdown fences.

    Returns:
        The content inside the first code fence, or the original text if
        no fence is detected.
    """
    if not text or "```" not in text:
        return text

    lines = text.split("\n")
    inside_fence = False
    content_lines: list[str] = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("```"):
            if not inside_fence:
                # Opening fence — skip this line (may contain language tag)
                inside_fence = True
                continue
            else:
                # Closing fence — we're done
                break
        elif inside_fence:
            content_lines.append(line)

    if content_lines:
        result = "\n".join(content_lines).strip()
        logger.debug("Stripped markdown code block: %d chars -> %d chars", len(text), len(result))
        return result

    # No fenced content found — return original
    return text

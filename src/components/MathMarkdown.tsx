import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
}

const PIPE_PAIR_RE = /\|([^|\n]{1,24})\|/g;

const hasLettersOrDigits = (s: string) =>
  /[\w\u0600-\u06FF]/.test(s);

const MATH_CMD_RE =
  /\\lvert|\\vert\b|\\rangle|\\langle|\\(?:frac|sqrt|hat|vec|overline|cdot|times|pi|Delta|theta|alpha|beta|gamma|psi|phi|omega|sigma)\b/;

function normalizePair(pair: string): string {
  const inner = pair.slice(1, -1);
  if (inner.includes("$") || inner.includes("|")) return pair;
  const clean = inner.trim();
  if (hasLettersOrDigits(clean) === false) return pair;
  if (/^[-:]+$/.test(clean)) return pair;
  const textChars = clean.replace(/[^\u0600-\u06FFa-zA-Z]/g, "");
  if (textChars.length >= 3 && textChars.length === clean.length) return pair;
  return "$\\lvert " + clean + "\\rvert$";
}

function normalizeLinePair(line: string): string {
  return line.replace(PIPE_PAIR_RE, (pair) => normalizePair(pair));
}

const BRAKET_UNICODE_RE = /[⟨⟩]/;

function hasArabicProse(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s.replace(/\\[a-zA-Z]+\{[^}]*\}/g, ""));
}

function normalizeLine(line: string): string {
  if (!line.includes("|") && !line.includes("\\") && !BRAKET_UNICODE_RE.test(line)) {
    return line;
  }
  const trimmed = line.trim();
  if (/^[\s|:-]+$/.test(trimmed) || trimmed.includes("$")) return line;

  if (line.includes("\\")) {
    if (!MATH_CMD_RE.test(line)) return line;
    const stripped = trimmed
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "")
      .replace(/\\[a-zA-Z]+|[|$]/g, "");
    if (hasArabicProse(stripped)) return line;
    return "$$" + trimmed + "$$";
  }

  if (BRAKET_UNICODE_RE.test(line)) {
    return hasArabicProse(line) ? line : "$$" + trimmed + "$$";
  }

  if (/^\s*\|/.test(line)) return line;
  return normalizeLinePair(line);
}

function normalizePipes(md: string): string {
  return md
    .split("\n")
    .map((line) => normalizeLine(line))
    .join("\n");
}

export const MathMarkdown: React.FC<Props> = ({ children }) => {
  const normalized = React.useMemo(() => normalizePipes(children || ""), [children]);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, { strict: "ignore", throwOnError: false }],
      ]}
    >
      {normalized}
    </ReactMarkdown>
  );
};
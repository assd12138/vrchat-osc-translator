const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });
const charSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
const cjkRegex =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** 中日韩文字按字素切分，其他文字保留单词，忽略标点和大小写差异。 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const normalized = text.normalize("NFKC").toLowerCase();

  for (const item of wordSegmenter.segment(normalized)) {
    if (!item.isWordLike) continue;

    let buffer = "";
    for (const { segment: char } of charSegmenter.segment(item.segment)) {
      if (cjkRegex.test(char)) {
        if (buffer) {
          tokens.push(buffer);
          buffer = "";
        }
        tokens.push(char);
      } else {
        buffer += char;
      }
    }
    if (buffer) tokens.push(buffer);
  }
  return tokens;
}

/** 将旧句与新句的候选前缀比较，允许识别修正，也允许末尾追加内容。 */
export function calculateAsrSimilarity(
  oldText: string,
  newText: string,
): number {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  if (!oldTokens.length || !newTokens.length) return 0;

  const oldLength = oldTokens.length;
  const maxPrefix = Math.min(
    newTokens.length,
    oldLength + Math.max(4, Math.ceil(oldLength * 0.5)),
  );
  const prefix = newTokens.slice(0, maxPrefix);

  // 每行记录旧句与各个新句前缀的 Levenshtein 编辑距离，只保留相邻两行。
  let previous = Array.from({ length: prefix.length + 1 }, (_, index) => index);
  for (let i = 1; i <= oldLength; i++) {
    const current = new Array<number>(prefix.length + 1);
    current[0] = i;

    for (let j = 1; j <= prefix.length; j++) {
      const cost = oldTokens[i - 1] === prefix[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }

  let bestSimilarity = 0;
  const minPrefix = Math.max(1, Math.ceil(oldLength * 0.65));
  for (let length = minPrefix; length <= prefix.length; length++) {
    const similarity = 1 - previous[length] / Math.max(oldLength, length);
    bestSimilarity = Math.max(bestSimilarity, similarity);
  }
  return bestSimilarity;
}

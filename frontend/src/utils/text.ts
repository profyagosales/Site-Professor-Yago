export function highlightUppercaseTokens(text: string) {
  if (!text) return [{ text, highlight: false }];

  const parts: Array<{ text: string; highlight: boolean }> = [];
  const tokens = text.split(/(\s+)/);

  tokens.forEach((token) => {
    if (token.trim().length === 0) {
      parts.push({ text: token, highlight: false });
      return;
    }
    const sanitized = token.replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\/-]/gi, '');
    const hasHighlight =
      sanitized.length >= 2 &&
      sanitized === sanitized.toUpperCase() &&
      /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\/-]+$/.test(sanitized);

    parts.push({ text: token, highlight: hasHighlight });
  });

  return parts;
}

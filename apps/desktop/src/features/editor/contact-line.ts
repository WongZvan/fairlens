/**
 * 页头联系方式链接化（2026-11-05，#117）：
 * 仅识别 http/https、mailto、email、带路径的裸域名；javascript:/data: 等一律按文本。
 */
export type ContactToken =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string };

const CONTACT_RE =
  /(https?:\/\/[^\s·]+|mailto:[^\s·]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s·]*)?)/gi;

export function tokenizeContactLine(line: string): ContactToken[] {
  const tokens: ContactToken[] = [];
  let last = 0;
  for (const match of line.matchAll(CONTACT_RE)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > last) tokens.push({ type: 'text', text: line.slice(last, index) });
    let href = raw;
    if (/^[^:@\s]+@[^:@\s]+$/.test(raw)) href = `mailto:${raw}`;
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) href = `https://${raw}`;
    tokens.push({ type: 'link', text: raw, href });
    last = index + raw.length;
  }
  if (last < line.length) tokens.push({ type: 'text', text: line.slice(last) });
  return tokens;
}

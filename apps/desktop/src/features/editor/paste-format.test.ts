import { describe, expect, it } from 'vitest';
import {
  LARGE_PASTE_CHARS,
  isLargePaste,
  normalizePlainText,
  plainTextToHtml,
  rowsToLines,
} from './paste-format.js';

describe('粘贴文本归一化（§5.6 第④项）', () => {
  it('换行归一：CRLF/CR → LF', () => {
    expect(normalizePlainText('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('连续空行折叠为单空行并 trim', () => {
    expect(normalizePlainText('  a\n\n\n\nb  ')).toBe('a\n\nb');
  });

  it('保留单个换行/单空行', () => {
    expect(normalizePlainText('a\nb')).toBe('a\nb');
    expect(normalizePlainText('a\n\nb')).toBe('a\n\nb');
  });
});

describe('大段粘贴判定（§5.6 第②项）', () => {
  it('阈值边界：300 不触发，301 触发', () => {
    expect(isLargePaste('a'.repeat(LARGE_PASTE_CHARS))).toBe(false);
    expect(isLargePaste('a'.repeat(LARGE_PASTE_CHARS + 1))).toBe(true);
  });

  it('多段落且超过 120 字符触发', () => {
    expect(isLargePaste(`${'a'.repeat(60)}\n\n${'b'.repeat(61)}`)).toBe(true);
    expect(isLargePaste(`${'a'.repeat(60)}\n\nb`)).toBe(false);
  });

  it('单段落长文但不超 300 不触发', () => {
    expect(isLargePaste('a'.repeat(200))).toBe(false);
  });
});

describe('表格平铺（§5.6 第③项：不丢字）', () => {
  it('逐单元格拼接，空单元格剔除，全空行丢弃', () => {
    expect(rowsToLines([[' A ', 'B'], ['', 'C'], ['', '']])).toEqual(['A　B', 'C']);
  });

  it('保留单元格内文字（含中英文）', () => {
    expect(rowsToLines([['姓名', 'Alice']])).toEqual(['姓名　Alice']);
  });
});

describe('纯文本 → 插入片段', () => {
  it('按行转为 <br> 连接（适配要点 inline 上下文）', () => {
    expect(plainTextToHtml('a\nb')).toBe('a<br>b');
    expect(plainTextToHtml('a\n\nb')).toBe('a<br><br>b');
  });

  it('HTML 特殊字符转义', () => {
    expect(plainTextToHtml('<b>&')).toBe('&lt;b&gt;&amp;');
  });

  it('空文本返回空串', () => {
    expect(plainTextToHtml('')).toBe('');
    expect(plainTextToHtml('   ')).toBe('');
  });
});

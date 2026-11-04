/**
 * 粘贴选项气泡（m1.4 尾项，docs/01 §5.6 第①项）：
 * 粘贴即时插入保留格式；气泡 4 秒内可转「仅文本」原地替换，未选默认保留格式。
 * portal 到 body + fixed（画布 zoom transform 下绝对定位会错算，见 #106 教训）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { isComposingKey } from './ime.js';
import { PASTE_BUBBLE_TIMEOUT_MS, placeBubble, type BubbleAnchor } from './paste-bubble.js';

export interface PasteBubbleState {
  anchor: BubbleAnchor;
  large: boolean;
  /** 纯文本为空时（如仅图片）不提供「仅文本」，避免清空内容 */
  plainAvailable: boolean;
}

export interface PasteBubbleProps {
  state: PasteBubbleState | null;
  /** 保留格式（默认；也用于超时/Esc/点外关闭） */
  onKeep: () => void;
  /** 原地替换为纯文本 */
  onPlain: () => void;
}

export function PasteBubble({ state, onKeep, onPlain }: PasteBubbleProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 220, height: 64 });

  // 4 秒未选默认保留格式
  useEffect(() => {
    if (!state) return;
    const id = window.setTimeout(onKeep, PASTE_BUBBLE_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [state, onKeep]);

  // Esc / 点击气泡外关闭（Esc 在 IME 合成态下是取消候选，不关气泡）
  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.paste-bubble')) onKeep();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isComposingKey(e)) onKeep();
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [state, onKeep]);

  // 首次渲染后按实际尺寸校正位置
  useLayoutEffect(() => {
    if (!state || !ref.current) return;
    const el = ref.current;
    setSize((prev) => {
      const next = { width: el.offsetWidth, height: el.offsetHeight };
      return prev.width === next.width && prev.height === next.height ? prev : next;
    });
  }, [state]);

  if (!state) return null;
  const pos = placeBubble(state.anchor, size, {
    width: window.innerWidth,
    height: window.innerHeight,
  });

  return createPortal(
    <div
      ref={ref}
      className="paste-bubble"
      role="group"
      aria-label={t('editor.paste.title')}
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="paste-bubble-actions">
        <button type="button" className="on" onClick={onKeep}>
          {t('editor.paste.format')}
        </button>
        {state.plainAvailable && (
          <button type="button" onClick={onPlain}>
            {t('editor.paste.plain')}
            <span className="mono">{t('editor.paste.plainHint')}</span>
          </button>
        )}
      </div>
      {state.large && <p className="paste-bubble-note">{t('editor.paste.large')}</p>}
    </div>,
    document.body,
  );
}

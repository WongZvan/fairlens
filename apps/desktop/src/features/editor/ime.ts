/**
 * IME 合成态判定（m1.4 尾项）：
 * 中文输入法组合期间，Enter/Esc/Ctrl+组合键不应触发应用快捷键或对话框动作。
 * 部分 WebView 只给 keyCode 229（不置 isComposing），两者都要判。
 */
export interface ComposingKeyLike {
  isComposing?: boolean;
  keyCode?: number;
}

export const IME_COMPOSING_KEYCODE = 229;

export function isComposingKey(e: ComposingKeyLike): boolean {
  return e.isComposing === true || e.keyCode === IME_COMPOSING_KEYCODE;
}

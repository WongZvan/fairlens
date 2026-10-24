import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.js';

/** i18n 骨架（M0 DoD）：全部 UI 文案走 t()；未来英文界面=新增 locale 文件零改造（决策 #67） */
void i18n.use(initReactI18next).init({
  resources: { 'zh-CN': { translation: zhCN } },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

export default i18n;

export default {
  app: { name: 'FairLens' },
  titlebar: {
    saved: '已保存',
    windowMin: '最小化',
    windowMax: '最大化',
    windowClose: '关闭',
    theme: '主题：{{theme}}',
    settings: '设置',
  },
  theme: { light: '浅色', dark: '深色', system: '跟随系统' },
  library: {
    title: '简历库',
    emptyHint: '从模板新建，或拖入 DOCX / PDF 到此处',
    buildSoon: '编辑器即将于 M1 到来——当前为 M0 骨架',
  },
  status: {
    online: '在线',
    offline: '离线：AI 与更新不可用',
    m0: '骨架',
    commandHint: 'Ctrl+K 命令面板（M1）',
  },
  license: { unactivated: '未激活（M2 到来）' },
} as const;

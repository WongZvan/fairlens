import { ResumeDoc } from '@fairlens/shared';

/** m1.4 起打样画布改挂真编辑器：此为初始样例文档（blockId 稳定不随刷新变——快照/批注锚点要求） */
export const sampleDoc: ResumeDoc = ResumeDoc.parse({
  templateId: 'tpl-classic',
  profile: {
    name: '李思远',
    headline: '求职意向：产品经理（26 届）',
    contactLine: '138****2321 · lisiyuan@mail.com · github.com/lisiyuan',
  },
  sections: [
    {
      id: 'SecBas1c0001',
      type: 'basic',
      title: '基本信息',
      basicFields: [
        { id: 'FldLoc000001', label: '所在地', value: '武汉 · 可即时到岗' },
        { id: 'FldDir000001', label: '求职方向', value: 'B 端 / 数据' },
      ],
      entries: [],
    },
    {
      id: 'SecSki000001',
      type: 'skill',
      title: '技能',
      entries: [],
      skills: [
        {
          id: 'SkGMain00001',
          name: '技能',
          items: ['Axure / Figma · SQL（基础）', 'Python（数据分析）· 英语 CET-6'],
        },
      ],
    },
    {
      id: 'SecEdu00001A',
      type: 'education',
      title: '教育经历',
      entries: [
        {
          id: 'EntHust0001A',
          org: '华中科技大学',
          role: '软件工程 · 本科',
          start: '2022.09',
          end: '2026.06',
          bullets: [{ id: 'BulGpa00001A', runs: [{ text: 'GPA 3.6 / 4.0，主修产品设计、数据分析方向课程' }] }],
        },
      ],
    },
    {
      id: 'SecExp00001A',
      type: 'experience',
      title: '实习经历',
      entries: [
        {
          id: 'EntByte0001A',
          org: '字节跳动',
          role: '产品实习生 · 创作者工具',
          start: '2025.06',
          end: '2025.09',
          bullets: [
            { id: 'BulRpt00001A', runs: [{ text: '负责创作者后台的调研与需求梳理，输出 12 份竞品分析报告' }] },
            { id: 'BulDif00001A', runs: [{ text: '主导搜索改版的用户反馈分析，搭建埋点看板，问题定位效率提升 40%' }] },
          ],
        },
        {
          id: 'EntMeit0001A',
          org: '美团',
          role: '产品运营实习生',
          start: '2024.06',
          end: '2024.09',
          bullets: [{ id: 'BulCom00001A', runs: [{ text: '负责商家社群运营，策划 3 场促活活动，社群月活跃度提升 25%' }] }],
        },
      ],
    },
    {
      id: 'SecPro000001',
      type: 'project',
      title: '项目经历',
      entries: [
        {
          id: 'EntProj0001A',
          org: '校园二手书平台「书循环」',
          role: '联合创始人',
          start: '2023.03',
          ongoing: true,
          bullets: [
            {
              id: 'BulProj0001A',
              runs: [{ text: '负责产品 0 到 1：需求分析、原型设计与 MVP 上线，6 个月积累用户 4000+，促成交易 1200+ 笔' }],
            },
          ],
        },
      ],
    },
  ],
});

/* 打样期静态批注展示数据（评估面板/红笔——M4 真数据接管）保留原样 */
export const findings = [
  { sev: 'hi', target: 'BulRpt00001A', title: '实习经历缺量化成果', sub: '字节 · 第 1 条：补充被采纳数/影响' },
  { sev: 'hi', target: 'BulDif00001A', title: '「参与/负责部分」表述弱化贡献', sub: '已给出改写建议（画布内联）' },
  { sev: 'sug', target: 'BulGpa00001A', title: '教育经历建议附专业排名', sub: 'GPA 3.6 具备展示价值' },
] as const;

export const dims = [
  { name: '结构完整性', score: 72 },
  { name: 'STAR 描述', score: 61 },
  { name: '量化与成果', score: 48 },
  { name: '岗位匹配', score: 55 },
  { name: '关键词', score: 66 },
  { name: '清晰度', score: 78 },
];

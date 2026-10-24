/** 样例简历数据（m1.1 打样静态数据；M1 后续由 ResumeDoc+真实编辑器取代） */

export interface SampleBullet {
  id: string;
  text: string;
  annotation?: 'red-quantify' | 'red-link' | 'green-gpa' | 'diff';
}
export interface SampleEntry {
  id: string;
  org: string;
  role?: string;
  date: string;
  bullets: SampleBullet[];
}
export interface SampleSection {
  id: string;
  title: string;
  entries?: SampleEntry[];
  text?: string[];
}

export const sampleResume: {
  name: string;
  intent: string;
  contact: string;
  github: string;
  basics: string[];
  skills: string[];
  sections: SampleSection[];
} = {
  name: '李思远',
  intent: '求职意向：产品经理（26 届）',
  contact: '138****2321 · lisiyuan@mail.com · ',
  github: 'github.com/lisiyuan',
  basics: ['武汉 · 可即时到岗', '产品方向：B 端 / 数据'],
  skills: ['Axure / Figma · SQL（基础）', 'Python（数据分析）· 英语 CET-6'],
  sections: [
    {
      id: 'edu',
      title: '教育经历',
      entries: [
        {
          id: 'hust',
          org: '华中科技大学',
          role: '软件工程 · 本科',
          date: '2022.09 – 2026.06',
          bullets: [{ id: 'gpa', text: 'GPA 3.6 / 4.0，主修产品设计、数据分析方向课程', annotation: 'green-gpa' }],
        },
      ],
    },
    {
      id: 'exp',
      title: '实习经历',
      entries: [
        {
          id: 'bytedance',
          org: '字节跳动',
          role: '产品实习生 · 创作者工具',
          date: '2025.06 – 2025.09',
          bullets: [
            { id: 'report', text: '负责创作者后台的调研与需求梳理，输出 12 份竞品分析报告', annotation: 'red-quantify' },
            { id: 'diff', text: '', annotation: 'diff' },
          ],
        },
        {
          id: 'meituan',
          org: '美团',
          role: '产品运营实习生',
          date: '2024.06 – 2024.09',
          bullets: [{ id: 'community', text: '负责商家社群运营，策划 3 场促活活动，社群月活跃度提升 25%' }],
        },
      ],
    },
    {
      id: 'proj',
      title: '项目经历',
      entries: [
        {
          id: 'bookloop',
          org: '校园二手书平台「书循环」',
          role: '联合创始人',
          date: '2023.03 – 至今',
          bullets: [
            {
              id: 'growth',
              text: '负责产品 0 到 1：需求分析、原型设计与 MVP 上线，6 个月积累用户 4000+，促成交易 1200+ 笔',
              annotation: 'red-link',
            },
          ],
        },
      ],
    },
  ],
};

export const diffPair = {
  del: '参与搜索改版项目，负责部分数据整理与跟进',
  ins: '主导搜索改版的用户反馈分析，搭建埋点看板，问题定位效率提升 40%',
};

export const findings = [
  { sev: 'hi', target: 'report', title: '实习经历缺量化成果', sub: '字节 · 第 1 条：补充被采纳数/影响' },
  { sev: 'hi', target: 'diff', title: '「参与/负责部分」表述弱化贡献', sub: '已给出改写建议（画布内联）' },
  { sev: 'sug', target: 'gpa', title: '教育经历建议附专业排名', sub: 'GPA 3.6 具备展示价值' },
  { sev: 'mid', target: 'growth', title: '项目建议附仓库/演示链接', sub: '岗位 JD 强调作品集' },
] as const;

export const dims = [
  { name: '结构完整性', score: 72 },
  { name: 'STAR 描述', score: 61 },
  { name: '量化与成果', score: 48 },
  { name: '岗位匹配', score: 55 },
];

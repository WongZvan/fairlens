import { Check, Link2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { diffPair, sampleResume, type SampleBullet } from './sample-data.js';

/** 纸面（打样静态版）：经典单栏/侧栏双栏同 DOM CSS 切换；红笔+diff+页边批注为静态签名元素 */
export function Paper({ template }: { template: 'classic' | 'duo' }) {
  const { t } = useTranslation();
  return (
    <article className={`paper ${template}`}>
      <MarginNotes />
      <div className="float-bar">
        <button aria-label={t('editor.bold')}><b>B</b></button>
        <button aria-label={t('editor.italic')}><i>I</i></button>
        <button aria-label={t('editor.link')}><Link2 size={15} /></button>
        <span className="v" />
        <button className="ai"><Sparkles size={14} />{t('editor.rewrite')}</button>
      </div>

      <header className="p-head">
        <div className="name"><b>{sampleResume.name}</b><span className="intent">{sampleResume.intent}</span></div>
        <p className="contact">
          {sampleResume.contact}
          <a href="#github">{sampleResume.github}</a>
        </p>
        <div className="rule" />
      </header>

      <div className="p-side">
        <div className="photo-slot" aria-hidden="true"><span>照片</span></div>
        <section className="p-sec">
          <h3>{t('paper.basic')}</h3>
          <div className="p-plain">{sampleResume.basics.map((line) => <p key={line}>{line}</p>)}</div>
        </section>
        <section className="p-sec">
          <h3>{t('paper.skills')}</h3>
          <div className="p-plain">{sampleResume.skills.map((line) => <p key={line}>{line}</p>)}</div>
        </section>
      </div>

      <div className="p-main">
        {sampleResume.sections.map((sec) => (
          <section className="p-sec" key={sec.id}>
            <h3>{secTitle(sec.id)}</h3>
            {sec.entries?.map((e) => (
              <div className="p-entry" key={e.id}>
                <div className="row">
                  <b>{e.org}</b>
                  {e.role && <span className="role">{e.role}</span>}
                  <span className="date">{e.date}</span>
                </div>
                <ul className="p-bullets">
                  {e.bullets.filter((b) => b.annotation !== 'diff').map((b) => <BulletLi key={b.id} b={b} />)}
                  {e.bullets.some((b) => b.annotation === 'diff') && <DiffLi />}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}

function secTitle(id: string): string {
  return ({ edu: '教育经历', exp: '实习经历', proj: '项目经历' } as Record<string, string>)[id] ?? '分区';
}

function BulletLi({ b }: { b: SampleBullet }) {
  const pen = b.annotation === 'red-quantify' || b.annotation === 'red-link' || b.annotation === 'green-gpa';
  return (
    <li className={pen ? 'pen-u' : undefined} id={`blk-${b.id}`}>
      {b.text}
      {b.annotation === 'red-quantify' && <PenStroke variant="a" />}
      {b.annotation === 'red-link' && <PenStroke variant="b" />}
      {b.annotation === 'green-gpa' && <PenStroke variant="a" green />}
    </li>
  );
}

function PenStroke({ variant, green = false }: { variant: 'a' | 'b'; green?: boolean }) {
  const color = green ? '#2e6e4e' : '#c4372b';
  const d =
    variant === 'a'
      ? 'M2,5 Q30,2.4 62,4.6 T124,4 T198,5'
      : 'M2,4.4 Q36,2.2 70,5 T140,3.6 T198,4.8';
  return (
    <svg viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" opacity=".9" />
      <path d="M40,4.6 Q90,2.8 150,4.8" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}

function DiffLi() {
  return (
    <li className="pen-u" style={{ paddingRight: 26 }} id="blk-diff">
      <span className="del">{diffPair.del}</span>{' '}
      <span className="ins">{diffPair.ins}</span>
      <span className="ai-chip">
        <span className="tag">AI 建议</span>
        <button className="ok" aria-label="采纳"><Check size={11} /></button>
        <button className="no" aria-label="拒绝">✕</button>
      </span>
    </li>
  );
}

function MarginNotes() {
  const { t } = useTranslation();
  return (
    <>
      <div className="m-note red" style={{ top: 210, right: -8 }}>
        <b>缺量化</b>
        {t('editor.noteQuantify')}
        <span className="go">{t('editor.reviseThis')} →</span>
      </div>
      <div className="m-note red" style={{ top: 474, right: -16 }}>
        <b>建议附链接</b>
        {t('editor.noteLink')}
      </div>
      <div className="m-note green" style={{ top: 332, right: -4 }}>
        <b>可补强</b>
        {t('editor.noteGpa')}
      </div>
    </>
  );
}

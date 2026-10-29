import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * 应用级错误边界（#107）：React 未捕获异常会卸载整棵树 → 只剩窗口底色（"蓝屏"且无任何按钮）。
 * 这里兜底为错误卡片，保留可读信息与重载入口，便于定位而非直接白屏。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    if (import.meta.env.DEV) {
      const log = (window.__flErrors ??= []);
      log.push({ message: error.message, stack: error.stack ?? '', componentStack: info.componentStack ?? '' });
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="guard-overlay" role="alert">
        <div className="guard-box">
          <h2>界面遇到错误</h2>
          <p className="muted">已阻止整页崩溃。可尝试重新加载；若反复出现，请把下面信息反馈给开发者。</p>
          <pre className="mono small" style={{ maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <div className="guard-actions">
            <button className="m-btn primary" onClick={() => window.location.reload()}>重新加载</button>
          </div>
        </div>
      </div>
    );
  }
}

declare global {
  interface Window {
    /** dev-only：未捕获异常/拒绝的收集（诊断用，生产不写） */
    __flErrors?: Array<Record<string, unknown>>;
  }
}

/** dev-only 全局错误采集：拖拽等交互崩溃时抓栈（#107 诊断） */
export function installErrorCapture(): void {
  if (!import.meta.env.DEV) return;
  const push = (t: string, data: Record<string, unknown>) => {
    const log = (window.__flErrors ??= []);
    log.push({ t, at: Math.round(performance.now()), ...data });
  };
  window.addEventListener('error', (e) => push('error', { message: e.message, stack: (e.error as Error | undefined)?.stack ?? '' }));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | undefined;
    push('rejection', { message: r?.message ?? String(e.reason), stack: r?.stack ?? '' });
  });
}

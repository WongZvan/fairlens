import { StatusBar } from './StatusBar.js';
import { TitleBar } from './TitleBar.js';
import { LibraryPlaceholder } from './LibraryPlaceholder.js';

/** 应用壳：标题栏 + 主区（路由骨架：library|editor；dev 面路由 M4/M5 懒加载挂载） */
export function AppShell() {
  return (
    <div className="shell">
      <TitleBar />
      <LibraryPlaceholder />
      <StatusBar />
    </div>
  );
}

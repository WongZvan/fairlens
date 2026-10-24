/**
 * CommandRegistry（m1.5，docs/01 §5.5）：插件式命令注册表。
 * Ctrl+K 打开；无选区=命令面板；有选区=编辑动作（键位冲突裁决见 §5.10）。
 * v2 垂类可注册新命令（CapabilityRegistry 消费方）。
 */
export interface CommandDef {
  id: string;
  title: string;
  hint?: string;
  /** dev 面命令仅 role=dev 可见（§3.5 单产品角色门控） */
  devOnly?: boolean;
  keywords?: string[];
  run: () => void;
}

type Listener = () => void;

class CommandRegistryImpl {
  private commands = new Map<string, CommandDef>();
  private listeners = new Set<Listener>();

  register(def: CommandDef): () => void {
    this.commands.set(def.id, def);
    this.emit();
    return () => this.unregister(def.id);
  }

  unregister(id: string): void {
    this.commands.delete(id);
    this.emit();
  }

  list(devVisible: boolean): CommandDef[] {
    return [...this.commands.values()].filter((c) => devVisible || !c.devOnly);
  }

  search(query: string, devVisible: boolean): CommandDef[] {
    const q = query.trim().toLowerCase();
    const pool = this.list(devVisible);
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}

export const commandRegistry = new CommandRegistryImpl();

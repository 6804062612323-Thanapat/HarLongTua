export type RouteHandler = (params: string[]) => void;

/** เปลี่ยนหน้าตาม URL ส่วนหลังเครื่องหมาย # เช่น #/groups/123 */
export class Router {
  private readonly routes: { pattern: RegExp; handler: RouteHandler }[] = [];

  add(pattern: RegExp, handler: RouteHandler): this {
    this.routes.push({ pattern, handler });
    return this;
  }

  start(): void {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  go(path: string): void {
    if (location.hash === `#${path}`) this.resolve();
    else location.hash = path;
  }

  resolve(): void {
    const path = location.hash.slice(1) || '/';
    for (const { pattern, handler } of this.routes) {
      const match = path.match(pattern);
      if (match) return handler(match.slice(1));
    }
    this.go('/');
  }
}

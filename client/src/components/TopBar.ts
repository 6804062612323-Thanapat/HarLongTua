import { html, SafeHtml } from '../core/html';

/** แถบบนสุดของหน้าที่ล็อกอินแล้ว */
export class TopBar {
  markup(userName: string): SafeHtml {
    return html`
      <header class="topbar">
        <a class="brand" href="#/">หารลงตัว</a>
        <div class="topbar-user">
          <span>${userName}</span>
          <button class="btn-link btn-link-light" data-logout>ออกจากระบบ</button>
        </div>
      </header>`;
  }
}

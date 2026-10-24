// 轻量 toast 提示
let timer;
export function toast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast show ' + (type === 'err' ? 'err' : type === 'ok' ? 'ok' : '');
  clearTimeout(timer);
  timer = setTimeout(() => { el.className = 'toast'; }, 2600);
}

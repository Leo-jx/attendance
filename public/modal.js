// 通用弹窗
import { $id } from './util.js';

let mcb = null;

export function openM(title, body, okText, okFn) {
  $id('mTitle').textContent = title;
  $id('mBody').innerHTML = body;
  $id('mOk').textContent = okText || '保存';
  mcb = okFn;
  $id('modal').classList.add('show');
}
export function closeM() {
  $id('modal').classList.remove('show');
  mcb = null;
}
export function initModal() {
  $id('mCancel').addEventListener('click', closeM);
  $id('mOk').addEventListener('click', () => {
    if (mcb) { const f = mcb; mcb = null; f(); }
  });
  $id('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeM();
  });
}

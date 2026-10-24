// 名单模块
import { store, loadState } from './store.js';
import { api, toast } from './api.js';
import { esc, $id } from './util.js';
import { openM } from './modal.js';

export function initMember() {
  $id('btnAddStudent').addEventListener('click', () => {
    openM('新增学生',
      '<div class="fg"><label>学生姓名</label><input id="fSName" placeholder="多个姓名用顿号、逗号或空格分隔"></div>',
      '保存',
      async () => {
        const raw = $id('fSName').value.trim();
        if (!raw) { toast('请输入姓名', 'err'); return; }
        const arr = raw.split(/[、,，;\s]+/).filter(Boolean);
        try {
          const r = await api.addStudents(arr);
          await loadState();
          renderMember();
          closeM();
          toast('已新增 ' + r.added + ' 人', 'ok');
        } catch (err) { toast(err.message, 'err'); }
      });
  });

  $id('memberList').addEventListener('click', async (e) => {
    const del = e.target.closest('.del');
    if (!del) return;
    const id = Number(del.dataset.del);
    const name = del.dataset.name;
    if (!confirm('确定将「' + name + '」移出名单吗？')) return;
    try {
      await api.deleteStudent(id);
      await loadState();
      renderMember();
      toast('已移除 ' + name, 'ok');
    } catch (err) { toast(err.message, 'err'); }
  });
}

export function renderMember() {
  const list = $id('memberList');
  $id('memberCount').textContent = '共 ' + store.students.length + ' 人';
  if (!store.students.length) {
    list.innerHTML = '<li class="empty">暂无学生，点右上角新增</li>';
    return;
  }
  list.innerHTML = store.students.map((s, i) =>
    '<li><span class="no">' + (i + 1) + '</span>' +
    '<span class="nm">' + esc(s.name) + '</span>' +
    '<button class="del" data-del="' + s.id + '" data-name="' + esc(s.name) + '">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13h8l1-13M10 11v5M14 11v5"/></svg></button></li>'
  ).join('');
}

// 课表模块
import { store, loadState } from './store.js';
import { api, toast } from './api.js';
import { esc, $id } from './util.js';
import { openM } from './modal.js';

let pickedColor = 0;

export function initTimetable() {
  $id('btnAddCourse').addEventListener('click', () => openCourseForm(null));
  $id('ttBody').addEventListener('click', (e) => {
    const c = e.target.closest('.course');
    if (!c) return;
    const i = Number(c.dataset.ci);
    const co = store.courses[i];
    if (co) openCourseForm(co);
  });
  $id('btnReset').addEventListener('click', async () => {
    if (!confirm('恢复示例数据？当前所有改动（课程/学生/签到）会被覆盖。')) return;
    try {
      await api.reset();
      await loadState();
      renderTimetable();
      toast('已恢复示例数据', 'ok');
    } catch (err) {
      toast(err.message, 'err');
    }
  });
}

export function renderTimetable() {
  const periods = store.periods;
  const days = store.days;
  const colors = store.colors;
  $id('ttHead').innerHTML = '<th>节次<br>时间</th>' + days.map((d) => '<th>' + esc(d) + '</th>').join('');

  let body = '';
  const covered = new Array(days.length).fill(0);
  for (let p = 0; p < periods.length; p++) {
    body += '<tr><td class="time"><b>' + periods[p].id + '</b>' + periods[p].s + '-' + periods[p].e + '</td>';
    for (let w = 0; w < days.length; w++) {
      if (covered[w] > 0) { covered[w]--; continue; }
      const c = store.courses.find((x) => x.weekday === w && x.s === periods[p].id);
      if (c) {
        const rs = c.e - c.s + 1;
        covered[w] = rs - 1;
        const idx = store.courses.indexOf(c);
        body += '<td class="cell" rowspan="' + rs + '"><div class="course" data-ci="' + idx +
          '" style="background:' + colors[c.c] + ';color:#fff"><div class="nm">' + esc(c.name) +
          '</div><div class="rm">' + esc(c.room) + '</div></div></td>';
      } else {
        body += '<td class="cell"></td>';
      }
    }
    body += '</tr>';
  }
  $id('ttBody').innerHTML = body;
}

function courseForm(c) {
  c = c || { name: '', room: '', weekday: 0, s: 1, e: 1, c: 0 };
  pickedColor = c.c || 0;
  const wOpt = store.days.map((d, i) => '<option value="' + i + '"' + (i === c.weekday ? ' selected' : '') + '>' + d + '</option>').join('');
  const pOpt = store.periods.map((p) => '<option value="' + p.id + '"' + (p.id === c.s ? ' selected' : '') + '>第' + p.id + '节 ' + p.s + '</option>').join('');
  const pOpt2 = store.periods.map((p) => '<option value="' + p.id + '"' + (p.id === c.e ? ' selected' : '') + '>第' + p.id + '节 ' + p.s + '</option>').join('');
  const sw = store.colors.map((col, i) =>
    '<button type="button" data-ci="' + i + '" style="width:30px;height:30px;border-radius:8px;background:' + col + ';border:2px solid ' + (i === pickedColor ? '#182230' : 'transparent') + '"></button>'
  ).join('');

  return '<div class="fg"><label>课程名称</label><input id="fName" value="' + esc(c.name) + '"></div>' +
    '<div class="fg"><label>教室</label><input id="fRoom" value="' + esc(c.room) + '"></div>' +
    '<div class="row"><div class="fg"><label>星期</label><select id="fW">' + wOpt + '</select></div>' +
    '<div class="fg"><label>起始节</label><select id="fS">' + pOpt + '</select></div>' +
    '<div class="fg"><label>结束节</label><select id="fE">' + pOpt2 + '</select></div></div>' +
    '<div class="fg"><label>颜色</label><div id="swatch" style="display:flex;gap:8px;flex-wrap:wrap">' + sw + '</div></div>';
}

function openCourseForm(co) {
  const isEdit = !!co;
  openM(isEdit ? '编辑课程' : '添加课程', courseForm(co), '保存', async () => {
    const name = $id('fName').value.trim();
    if (!name) { toast('请填写课程名称', 'err'); return; }
    const s = Number($id('fS').value);
    const e = Number($id('fE').value);
    if (e < s) { toast('结束节不能早于开始节', 'err'); return; }
    const payload = {
      name,
      room: $id('fRoom').value.trim(),
      weekday: Number($id('fW').value),
      s, e, c: pickedColor
    };
    if (isEdit) payload.id = co.id;
    try {
      await api.saveCourse(payload);
      await loadState();
      renderTimetable();
      closeM();
      toast('已保存', 'ok');
    } catch (err) {
      toast(err.message, 'err');
    }
  });

  // 颜色选择交互
  const swatch = $id('swatch');
  if (swatch) {
    swatch.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-ci]');
      if (!b) return;
      pickedColor = Number(b.dataset.ci);
      swatch.querySelectorAll('button').forEach((x) => {
        x.style.borderColor = (Number(x.dataset.ci) === pickedColor) ? '#182230' : 'transparent';
      });
    });
  }
}

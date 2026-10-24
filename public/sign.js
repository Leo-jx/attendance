// 签到模块
import { store } from './store.js';
import { api, toast } from './api.js';
import { esc, $id } from './util.js';

const ORDER = ['none', 'attend', 'leave', 'absent'];
const TAG = { attend: '出勤', leave: '请假', absent: '缺勤', none: '未签到' };
let curFilter = 'all';
let recMap = {}; // { studentId: status }

export function initSign() {
  $id('signCourse').addEventListener('change', loadRecords);
  $id('signDate').addEventListener('change', loadRecords);
  $id('signList').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (li) cycle(Number(li.dataset.id));
  });
  $id('signList').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const li = e.target.closest('li[data-id]');
      if (li) { e.preventDefault(); cycle(Number(li.dataset.id)); }
    }
  });
  $id('filters').addEventListener('click', (e) => {
    const f = e.target.closest('.fc');
    if (!f) return;
    curFilter = f.dataset.f;
    f.parentNode.querySelectorAll('.fc').forEach((b) => (b.dataset.on = b === f ? '1' : '0'));
    renderSignList();
  });
  $id('btnAll').addEventListener('click', async () => {
    const courseId = currentCourse();
    const date = currentDate();
    if (!courseId) return;
    try {
      await api.setBatch(courseId, date, 'all');
      await loadRecords();
      toast('已全部出勤', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  });
  $id('btnClear').addEventListener('click', async () => {
    if (!confirm('清除本节所有签到状态？')) return;
    const courseId = currentCourse();
    const date = currentDate();
    if (!courseId) return;
    try {
      await api.setBatch(courseId, date, 'clear');
      await loadRecords();
      toast('已清除本节', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  });
}

function currentCourse() {
  const v = $id('signCourse').value;
  return v ? Number(v) : null;
}
function currentDate() {
  return $id('signDate').value;
}

export function renderSign() {
  const sel = $id('signCourse');
  const prev = sel.value;
  sel.innerHTML = '';
  if (!store.courses.length) {
    sel.innerHTML = '<option value="">（暂无课程）</option>';
    return;
  }
  store.courses.forEach((c) => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = store.days[c.weekday] + ' ' + c.s + '-' + c.e + '节 ' + c.name;
    sel.appendChild(o);
  });
  if (prev && store.courses.some((c) => String(c.id) === prev)) sel.value = prev;
  loadRecords();
}

async function loadRecords() {
  const courseId = currentCourse();
  const date = currentDate();
  if (!courseId || !date) { recMap = {}; renderSignList(); return; }
  try {
    recMap = await api.getRecords(courseId, date);
  } catch (err) {
    toast(err.message, 'err');
    recMap = {};
  }
  renderSignList();
}

function cycle(studentId) {
  const courseId = currentCourse();
  const date = currentDate();
  if (!courseId || !date) return;
  const cur = recMap[studentId] || 'none';
  const next = ORDER[(ORDER.indexOf(cur) + 1) % 4];
  recMap[studentId] = next;        // 乐观更新
  renderSignList();
  api.saveRecord(courseId, date, studentId, next).catch((err) => {
    recMap[studentId] = cur;       // 失败回滚
    renderSignList();
    toast(err.message, 'err');
  });
}

function renderSignList() {
  const st = { attend: 0, leave: 0, absent: 0, none: 0 };
  store.students.forEach((s) => {
    const k = recMap[s.id] || 'none';
    st[k] = (st[k] || 0) + 1;
  });
  $id('stTotal').textContent = store.students.length;
  $id('stAttend').textContent = st.attend;
  $id('stLeave').textContent = st.leave;
  $id('stAbsent').textContent = st.absent;
  $id('stNone').textContent = st.none;

  const shown = store.students.filter((s) => {
    if (curFilter === 'all') return true;
    return (recMap[s.id] || 'none') === curFilter;
  });
  const list = $id('signList');
  if (!shown.length) {
    list.innerHTML = '<li class="empty" style="grid-column:1/-1">当前筛选下暂无学生，点上方「全部」查看</li>';
    return;
  }
  list.innerHTML = shown.map((s) => {
    const k = recMap[s.id] || 'none';
    return '<li class="' + k + '" data-id="' + s.id + '" role="button" tabindex="0">' +
      '<span class="av">' + esc(s.name.charAt(0)) + '</span>' +
      '<span class="sname">' + esc(s.name) + '</span>' +
      '<span class="stag">' + TAG[k] + '</span></li>';
  }).join('');
}

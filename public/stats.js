// 统计模块
import { store } from './store.js';
import { api, toast } from './api.js';
import { esc, $id, daysAgo, fmtDate } from './util.js';
import { downloadCsv } from './export.js';

export function initStats() {
  const from = $id('statFrom');
  const to = $id('statTo');
  if (!from.value) from.value = daysAgo(29);
  if (!to.value) to.value = fmtDate(new Date());

  syncCourseOptions();
  const sel = $id('statCourse');
  [from, to, sel].forEach((el) => el.addEventListener('change', renderStats));
  $id('btnExport').addEventListener('click', async () => {
    try {
      await downloadCsv(from.value, to.value);
      toast('已导出 CSV', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  });
}

function syncCourseOptions() {
  const sel = $id('statCourse');
  const cur = sel.value;
  sel.innerHTML = '<option value="">全部课程</option>' +
    store.courses.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
}

export function renderStats() {
  syncCourseOptions();
  const from = $id('statFrom').value;
  const to = $id('statTo').value;
  const courseId = $id('statCourse').value;
  api.getStats(from, to, courseId).then(render).catch((err) => toast(err.message, 'err'));
}

function render(data) {
  let att = 0, lv = 0, ab = 0;
  Object.values(data.per).forEach((p) => { att += p.attend; lv += p.leave; ab += p.absent; });
  const denom = att + lv + ab;
  $id('overallRate').textContent = denom ? Math.round((att / denom) * 100) + '%' : '0%';
  $id('overallAttend').textContent = att;
  $id('overallLeave').textContent = lv;
  $id('overallAbsent').textContent = ab;
  $id('overallSessions').textContent = data.sessions;
  $id('statSessions').textContent = data.from + ' ~ ' + data.to + ' · ' + data.sessions + ' 场';

  const rank = data.students.map((s) => {
    const p = data.per[s.id] || { attend: 0, leave: 0, absent: 0 };
    const d = p.attend + p.leave + p.absent;
    const rate = d ? Math.round((p.attend / d) * 100) : null;
    return { s, p, rate, d };
  }).sort((a, b) => (b.rate == null ? -1 : b.rate) - (a.rate == null ? -1 : a.rate));

  const list = $id('statRank');
  if (!rank.length) {
    list.innerHTML = '<li class="empty">暂无学生数据</li>';
    return;
  }
  list.innerHTML = rank.map((r) => {
    const pct = r.rate == null ? '—' : r.rate + '%';
    const w = r.rate == null ? 0 : r.rate;
    const sub = '出勤 ' + r.p.attend + ' · 请假 ' + r.p.leave + ' · 缺勤 ' + r.p.absent;
    return '<li class="rank ' + (r.rate == null ? 'none' : r.rate >= 80 ? 'attend' : r.rate >= 60 ? 'leave' : 'absent') + '">' +
      '<div class="top"><span class="rname">' + esc(r.s.name) + '</span>' +
      '<span class="rpct">' + pct + '</span></div>' +
      '<div class="bar"><i style="width:' + w + '%"></i></div>' +
      '<div class="rsub">' + sub + '</div></li>';
  }).join('');
}

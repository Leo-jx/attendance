// 主入口：初始化模块、加载首屏数据、Tab 路由
import { loadState, store } from './store.js';
import { initModal } from './modal.js';
import { initTimetable, renderTimetable } from './timetable.js';
import { initSign, renderSign } from './sign.js';
import { initMember, renderMember } from './member.js';
import { initStats, renderStats } from './stats.js';
import { fmtDate, $id } from './util.js';
import { toast } from './toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  initModal();

  try {
    await loadState();
  } catch (e) {
    toast('加载数据失败：' + e.message, 'err');
  }

  initTimetable();
  initSign();
  initMember();
  initStats();

  const tabs = document.querySelectorAll('.tab');
  const pages = ['timetable', 'sign', 'member', 'stats'];

  window.show = (name) => {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    pages.forEach((n) => $id('p-' + n).classList.toggle('active', n === name));
    if (name === 'sign') renderSign();
    if (name === 'member') renderMember();
    if (name === 'timetable') renderTimetable();
    if (name === 'stats') renderStats();
  };

  tabs.forEach((t) => t.addEventListener('click', () => window.show(t.dataset.tab)));

  // 默认签到日期为今天
  $id('signDate').value = fmtDate(new Date());

  renderTimetable();
  renderMember();
  window.show('timetable');
});

// 统一 fetch 封装与错误提示
import { toast } from './toast.js';

async function req(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    let msg = '请求失败（' + res.status + '）';
    try { const j = await res.json(); msg = j.error || msg; } catch (e) {}
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res;
}

export const api = {
  getState: () => req('/api/state'),
  getRecords: (courseId, date) => req(`/api/records?course_id=${courseId}&date=${encodeURIComponent(date)}`),
  saveRecord: (courseId, date, studentId, status) =>
    req('/api/records', { method: 'POST', body: { course_id: courseId, date, student_id: studentId, status } }),
  setBatch: (courseId, date, mode) =>
    req('/api/records/batch', { method: 'POST', body: { course_id: courseId, date, mode } }),
  addStudents: (names) => req('/api/students', { method: 'POST', body: { names } }),
  deleteStudent: (id) => req('/api/students/' + id, { method: 'DELETE' }),
  saveCourse: (course) => req('/api/courses', { method: 'POST', body: course }),
  deleteCourse: (id) => req('/api/courses/' + id, { method: 'DELETE' }),
  reset: () => req('/api/reset', { method: 'POST' }),
  getStats: (from, to, courseId) => req(`/api/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${courseId ? '&course_id=' + courseId : ''}`),
  exportCsvRaw: (from, to) =>
    req(`/api/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
};

export { toast };

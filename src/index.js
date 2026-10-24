// Cloudflare Worker 入口：处理 /api/* 路由，其余请求回退到静态资源
import {
  getState, getRecords, upsertRecord, setBatch,
  addStudents, deleteStudent, saveCourse, deleteCourse,
  resetSeed, getStats, exportCsv
} from './db.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function error(msg, status = 400) {
  return json({ error: msg }, status);
}
async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function route(request, url, env, path) {
  const DB = env.DB;
  const method = request.method;

  if (path === '/api/state' && method === 'GET') {
    return json(await getState(DB));
  }

  if (path === '/api/records' && method === 'GET') {
    const courseId = Number(url.searchParams.get('course_id'));
    const date = url.searchParams.get('date');
    if (!courseId || !date) return error('缺少参数');
    return json(await getRecords(DB, courseId, date));
  }

  if (path === '/api/records' && method === 'POST') {
    const b = await readJson(request);
    if (!b.course_id || !b.date || !b.student_id || !b.status) return error('缺少参数');
    await upsertRecord(DB, Number(b.course_id), b.date, Number(b.student_id), b.status);
    return json({ ok: true });
  }

  if (path === '/api/records/batch' && method === 'POST') {
    const b = await readJson(request);
    if (!b.course_id || !b.date || !b.mode) return error('缺少参数');
    await setBatch(DB, Number(b.course_id), b.date, b.mode);
    return json({ ok: true });
  }

  if (path === '/api/students' && method === 'GET') {
    const r = await DB.prepare('SELECT id, name FROM students WHERE class_id=1 ORDER BY id').all();
    return json(r.results);
  }

  if (path === '/api/students' && method === 'POST') {
    const b = await readJson(request);
    const names = Array.isArray(b.names) ? b.names : String(b.names || '').split(/[、,，;\s]+/);
    const n = await addStudents(DB, names);
    return json({ ok: true, added: n });
  }

  const m = path.match(/^\/api\/students\/(\d+)$/);
  if (m && method === 'DELETE') {
    await deleteStudent(DB, Number(m[1]));
    return json({ ok: true });
  }

  if (path === '/api/courses' && method === 'POST') {
    const b = await readJson(request);
    const id = await saveCourse(DB, b);
    return json({ ok: true, id });
  }

  const cm = path.match(/^\/api\/courses\/(\d+)$/);
  if (cm && method === 'DELETE') {
    await deleteCourse(DB, Number(cm[1]));
    return json({ ok: true });
  }

  if (path === '/api/reset' && method === 'POST') {
    await resetSeed(DB);
    return json({ ok: true });
  }

  if (path === '/api/stats' && method === 'GET') {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const courseId = url.searchParams.get('course_id');
    return json(await getStats(DB, from, to, courseId ? Number(courseId) : null));
  }

  if (path === '/api/export' && method === 'GET') {
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const courseId = url.searchParams.get('course_id');
    const csv = await exportCsv(DB, from, to, courseId ? Number(courseId) : null);
    return new Response('﻿' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="attendance.csv"'
      }
    });
  }

  return error('未找到接口', 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      try {
        return await route(request, url, env, path);
      } catch (e) {
        return error(e.message || '服务器错误', 500);
      }
    }
    // 静态资源（前端）
    return env.ASSETS.fetch(request);
  }
};

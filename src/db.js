// D1 数据访问层
import { SAMPLE_COURSES, SAMPLE_STUDENTS, PERIODS, DAYS, COLORS } from './seed.js';

const STATUS = ['none', 'attend', 'leave', 'absent'];
const CLASS_ID = 1;

function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// 数据库为空时自动播种示例数据（保证部署后即可用）
export async function ensureSeed(DB) {
  const r = await DB.prepare('SELECT COUNT(*) AS c FROM students').first();
  if (r && r.c > 0) return;
  await resetSeed(DB);
}

// 恢复示例：清空并重新写入种子数据
export async function resetSeed(DB) {
  await DB.batch([
    DB.prepare('DELETE FROM records'),
    DB.prepare('DELETE FROM courses'),
    DB.prepare('DELETE FROM students'),
    DB.prepare('DELETE FROM classes')
  ]);
  await DB.prepare('INSERT INTO classes(name) VALUES(?)').bind('云计算01班').run();

  const insS = DB.prepare('INSERT INTO students(class_id,name) VALUES(?,?)');
  await DB.batch(SAMPLE_STUDENTS.map((n) => insS.bind(CLASS_ID, n)));

  const insC = DB.prepare(
    'INSERT INTO courses(class_id,name,room,weekday,start_period,end_period,color) VALUES(?,?,?,?,?,?,?)'
  );
  await DB.batch(
    SAMPLE_COURSES.map((c) => insC.bind(CLASS_ID, c.name, c.room, c.w, c.s, c.e, c.c))
  );
}

// 首屏状态
export async function getState(DB) {
  await ensureSeed(DB);
  const courses = await DB.prepare(
    `SELECT id, name, room, weekday, start_period AS s, end_period AS e, color AS c
     FROM courses WHERE class_id=? ORDER BY weekday, s`
  ).bind(CLASS_ID).all();
  const students = await DB.prepare(
    'SELECT id, name FROM students WHERE class_id=? ORDER BY id'
  ).bind(CLASS_ID).all();
  const cls = await DB.prepare('SELECT id, name FROM classes WHERE id=?').bind(CLASS_ID).first();
  return {
    class: cls,
    courses: courses.results,
    students: students.results,
    periods: PERIODS,
    days: DAYS,
    colors: COLORS
  };
}

// 签到记录：返回 { studentId: status }
export async function getRecords(DB, courseId, date) {
  const r = await DB.prepare(
    'SELECT student_id, status FROM records WHERE course_id=? AND date=?'
  ).bind(courseId, date).all();
  const map = {};
  r.results.forEach((x) => (map[x.student_id] = x.status));
  return map;
}

// 单条写入/更新（幂等）
export async function upsertRecord(DB, courseId, date, studentId, status) {
  if (!STATUS.includes(status)) throw new Error('非法状态');
  await DB.prepare(
    `INSERT INTO records(course_id,date,student_id,status,updated_at)
     VALUES(?,?,?,?,datetime('now'))
     ON CONFLICT(course_id,date,student_id)
     DO UPDATE SET status=excluded.status, updated_at=datetime('now')`
  ).bind(courseId, date, studentId, status).run();
}

// 批量：all=全部出勤，clear=清除本节
export async function setBatch(DB, courseId, date, mode) {
  if (mode === 'clear') {
    await DB.prepare('DELETE FROM records WHERE course_id=? AND date=?').bind(courseId, date).run();
  } else if (mode === 'all') {
    const students = await DB.prepare('SELECT id FROM students WHERE class_id=?').bind(CLASS_ID).all();
    const ins = DB.prepare(
      `INSERT INTO records(course_id,date,student_id,status,updated_at)
       VALUES(?,?,?,?,datetime('now'))
       ON CONFLICT(course_id,date,student_id)
       DO UPDATE SET status=excluded.status, updated_at=datetime('now')`
    );
    await DB.batch(students.results.map((s) => ins.bind(courseId, date, s.id, 'attend')));
  } else {
    throw new Error('非法模式');
  }
}

// 新增学生（支持批量，去重）
export async function addStudents(DB, names) {
  const clean = names.map((n) => String(n).trim()).filter(Boolean);
  if (!clean.length) throw new Error('请填写姓名');
  const ins = DB.prepare('INSERT OR IGNORE INTO students(class_id,name) VALUES(?,?)');
  await DB.batch(clean.map((n) => ins.bind(CLASS_ID, n)));
  return clean.length;
}

export async function deleteStudent(DB, id) {
  await DB.batch([
    DB.prepare('DELETE FROM records WHERE student_id=?').bind(id),
    DB.prepare('DELETE FROM students WHERE id=?').bind(id)
  ]);
}

// 课程新增或更新
export async function saveCourse(DB, course) {
  const name = (course.name || '').trim();
  if (!name) throw new Error('请填写课程名称');
  const weekday = Number(course.weekday);
  const s = Number(course.s);
  const e = Number(course.e);
  const c = Number(course.c) || 0;
  if (e < s) throw new Error('结束节不能早于开始节');
  const room = (course.room || '').trim();

  if (course.id) {
    await DB.prepare(
      'UPDATE courses SET name=?,room=?,weekday=?,start_period=?,end_period=?,color=? WHERE id=?'
    ).bind(name, room, weekday, s, e, c, course.id).run();
    return course.id;
  }
  const r = await DB.prepare(
    'INSERT INTO courses(class_id,name,room,weekday,start_period,end_period,color) VALUES(?,?,?,?,?,?,?)'
  ).bind(CLASS_ID, name, room, weekday, s, e, c).run();
  return r.meta && r.meta.last_row_id;
}

export async function deleteCourse(DB, id) {
  await DB.batch([
    DB.prepare('DELETE FROM records WHERE course_id=?').bind(id),
    DB.prepare('DELETE FROM courses WHERE id=?').bind(id)
  ]);
}

// 统计：区间内出勤率
export async function getStats(DB, from, to, courseId) {
  if (!from || !to) {
    const t = new Date();
    to = fmtDate(t);
    const d = new Date(t);
    d.setDate(d.getDate() - 29);
    from = fmtDate(d);
  }
  const extra = courseId ? ' AND course_id=?' : '';
  const binds = courseId ? [from, to, courseId] : [from, to];
  const sess = await DB.prepare(
    "SELECT COUNT(DISTINCT (course_id || '|' || date)) AS n FROM records WHERE date BETWEEN ? AND ?" + extra
  ).bind(...binds).first();
  const sessions = (sess && sess.n) || 0;

  const rows = await DB.prepare(
    `SELECT student_id,
            SUM(CASE WHEN status='attend' THEN 1 ELSE 0 END) AS attend,
            SUM(CASE WHEN status='leave'  THEN 1 ELSE 0 END) AS leave,
            SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent,
            COUNT(*) AS total
     FROM records WHERE date BETWEEN ? AND ?` + extra + ` GROUP BY student_id`
  ).bind(...binds).all();

  const per = {};
  rows.results.forEach((r) => {
    per[r.student_id] = { attend: r.attend, leave: r.leave, absent: r.absent, total: r.total };
  });

  const students = await DB.prepare(
    'SELECT id, name FROM students WHERE class_id=? ORDER BY id'
  ).bind(CLASS_ID).all();

  return { from, to, sessions, students: students.results, per };
}

// 导出 CSV（学生 × 日期 矩阵）
export async function exportCsv(DB, from, to, courseId) {
  const f = from || '0000-00-00';
  const t = to || '9999-99-99';
  const students = await DB.prepare(
    'SELECT id, name FROM students WHERE class_id=? ORDER BY id'
  ).bind(CLASS_ID).all();
  const extra = courseId ? ' AND course_id=?' : '';
  const binds = courseId ? [f, t, courseId] : [f, t];
  const rows = await DB.prepare(
    'SELECT student_id, date, status FROM records WHERE date BETWEEN ? AND ?' + extra
  ).bind(...binds).all();

  const dates = [...new Set(rows.results.map((r) => r.date))].sort();
  const map = {};
  rows.results.forEach((r) => (map[r.student_id + '|' + r.date] = r.status));

  const label = { attend: '出勤', leave: '请假', absent: '缺勤', none: '未签' };
  let csv = '姓名,' + dates.join(',') + '\n';
  students.results.forEach((s) => {
    const cells = dates.map((d) => label[map[s.id + '|' + d] || 'none']);
    csv += s.name + ',' + cells.join(',') + '\n';
  });
  if (!dates.length) csv += '（该区间暂无签到记录）\n';
  return csv;
}

-- 考勤系统 D1 (SQLite) 建表语句
-- 运行：wrangler d1 execute attendance --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS classes (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id   INTEGER NOT NULL DEFAULT 1,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(class_id, name)
);

CREATE TABLE IF NOT EXISTS courses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id      INTEGER NOT NULL DEFAULT 1,
  name          TEXT NOT NULL,
  room          TEXT,
  weekday       INTEGER NOT NULL,   -- 0=周一 ... 6=周日
  start_period  INTEGER NOT NULL,   -- 起始节次
  end_period    INTEGER NOT NULL,   -- 结束节次
  color         INTEGER NOT NULL DEFAULT 0  -- 颜色索引
);

CREATE TABLE IF NOT EXISTS records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id  INTEGER NOT NULL,
  date       TEXT NOT NULL,          -- YYYY-MM-DD
  student_id INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'none',  -- none|attend|leave|absent
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, date, student_id)
);

CREATE INDEX IF NOT EXISTS idx_records_course_date ON records(course_id, date);
CREATE INDEX IF NOT EXISTS idx_students_class       ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_class        ON courses(class_id);

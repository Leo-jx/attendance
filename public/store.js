// 全局共享状态（来自 /api/state）
import { api } from './api.js';

export const store = {
  classInfo: null,
  courses: [],
  students: [],
  periods: [],
  days: [],
  colors: []
};

export async function loadState() {
  const data = await api.getState();
  store.classInfo = data.class;
  store.courses = data.courses || [];
  store.students = data.students || [];
  store.periods = data.periods || [];
  store.days = data.days || [];
  store.colors = data.colors || [];
  return store;
}

// CSV 导出：调用后端 /api/export 并触发下载
export async function downloadCsv(from, to) {
  const res = await fetch(`/api/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!res.ok) throw new Error('导出失败（' + res.status + '）');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `考勤_${from || '全部'}_${to || '全部'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

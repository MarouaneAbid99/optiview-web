export function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    alert('Nothing to export');
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const s = val === null || val === undefined ? '' : String(val);
    const clean = s.replace(/"/g, '""');
    return /[",\n]/.test(clean) ? `"${clean}"` : clean;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');

  // BOM so Excel reads UTF-8 correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) throw new Error("لا توجد بيانات كافية للتصدير.");
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return `\uFEFF${headers.map(escape).join(",")}\n${rows.map((row) => headers.map((key) => escape(row[key])).join(",")).join("\n")}`;
}

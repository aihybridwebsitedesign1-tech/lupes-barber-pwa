export function exportToCSV(data: any[], filename: string, headers: Record<string, string>) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const columns = Object.keys(headers);
  const headerRow = columns.map(col => headers[col]).join(',');

  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col];

      if (value === null || value === undefined) {
        return '';
      }

      const stringValue = String(value);

      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    }).join(',');
  });

  const csv = [headerRow, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${date}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

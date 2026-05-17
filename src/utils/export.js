/**
 * Utility functions untuk export data rekap absensi.
 *
 * Menyediakan:
 * - buildCSVContent: membangun string CSV dari array data rekap (dapat ditest langsung)
 * - exportToCSV: mengunduh data rekap sebagai file CSV (dengan BOM UTF-8)
 * - printRecap: membuka window baru dengan format print yang rapi
 */

/**
 * Escape satu nilai CSV.
 * Jika nilai mengandung koma, kutip ganda, atau newline — bungkus dengan kutip ganda.
 *
 * @param {*} value
 * @returns {string}
 */
function escapeCSVValue(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Membangun string konten CSV dari array data rekap.
 * Tidak mengandung BOM — BOM ditambahkan oleh exportToCSV saat membuat Blob.
 *
 * @param {Array<{name: string, nis: string, hadir: number, izin: number, sakit: number, alpha: number, total: number, attendanceRate: string|number}>} rows
 * @returns {string} Konten CSV tanpa BOM
 */
export function buildCSVContent(rows) {
  const headers = ['Nama Siswa', 'NIS', 'Hadir', 'Izin', 'Sakit', 'Alpha', 'Total', '% Hadir'];

  const csvRows = rows.map(row => {
    // Pastikan attendanceRate ditampilkan dengan tanda %
    const rate = String(row.attendanceRate).endsWith('%')
      ? row.attendanceRate
      : row.attendanceRate + '%';

    const values = [row.name, row.nis, row.hadir, row.izin, row.sakit, row.alpha, row.total, rate];
    return values.map(escapeCSVValue).join(',');
  });

  return [headers.join(','), ...csvRows].join('\n');
}

/**
 * Mengekspor array data rekap ke file CSV dan men-trigger download.
 *
 * @param {Array<{name: string, nis: string, hadir: number, izin: number, sakit: number, alpha: number, total: number, attendanceRate: string|number}>} rows
 *   Array objek data rekap per siswa.
 * @param {string} filename - Nama file yang akan diunduh, contoh: "Rekap_Kelas-7A_Januari-2024.csv"
 */
export function exportToCSV(rows, filename) {
  const csvContent = buildCSVContent(rows);

  // Tambahkan BOM UTF-8 agar Excel membaca karakter Indonesia dengan benar
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Membuka window baru dan menampilkan rekap dalam format siap cetak.
 *
 * @param {string} title - Judul rekap, contoh: "Rekap Kelas 7A — Januari 2024"
 * @param {string} tableHTML - HTML string tabel rekap yang akan dicetak
 */
export function printRecap(title, tableHTML) {
  const win = window.open('', '_blank');
  if (!win) {
    console.error('Gagal membuka window baru untuk print. Pastikan popup tidak diblokir.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      padding: 24px;
      background: #fff;
    }

    h1 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #111;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 6px 10px;
      text-align: left;
    }

    th {
      background-color: #f0f0f0;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tr:nth-child(even) td {
      background-color: #fafafa;
    }

    tr:hover td {
      background-color: #f5f5f5;
    }

    td:nth-child(n+3) {
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
      }

      @page {
        margin: 1.5cm;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${tableHTML}
</body>
</html>`);

  win.document.close();
  win.print();
}

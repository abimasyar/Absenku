/**
 * Tests untuk src/utils/export.js
 *
 * Mencakup:
 * - Unit tests untuk buildCSVContent (format CSV, header, data rows, escaping)
 * - Unit tests untuk exportToCSV (trigger download, BOM, filename)
 * - Unit tests untuk printRecap
 * - Property 4: Export CSV Round Trip
 *   Untuk semua data rekap, export ke CSV lalu parse kembali harus menghasilkan
 *   nilai numerik yang identik dengan data asli.
 *   Validates: Requirements 6.2, 6.4
 */

import fc from 'fast-check';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCSVContent, exportToCSV, printRecap } from './export.js';

// ============================================================
// Setup mock untuk browser API yang tidak tersedia di jsdom
// ============================================================

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============================================================
// Helper: parse CSV string menjadi array of objects
// ============================================================

/**
 * Parse CSV string (dengan atau tanpa BOM) menjadi array of objects.
 */
function parseCSV(csvString) {
  const clean = csvString.startsWith('\uFEFF') ? csvString.slice(1) : csvString;
  const lines = clean.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

// ============================================================
// Unit Tests — buildCSVContent
// ============================================================

describe('buildCSVContent', () => {
  const sampleRows = [
    { name: 'Ahmad Fauzi', nis: '12345', hadir: 20, izin: 2, sakit: 1, alpha: 0, total: 23, attendanceRate: '86.96%' },
    { name: 'Siti Nurhaliza', nis: '12346', hadir: 22, izin: 0, sakit: 1, alpha: 0, total: 23, attendanceRate: '95.65%' },
    { name: 'Budi Santoso', nis: '12347', hadir: 18, izin: 3, sakit: 2, alpha: 0, total: 23, attendanceRate: '78.26%' },
  ];

  it('mengembalikan string', () => {
    expect(typeof buildCSVContent(sampleRows)).toBe('string');
  });

  it('tidak mengandung BOM (BOM ditambahkan oleh exportToCSV)', () => {
    const content = buildCSVContent(sampleRows);
    expect(content.startsWith('\uFEFF')).toBe(false);
  });

  it('baris pertama adalah header yang benar', () => {
    const content = buildCSVContent(sampleRows);
    const firstLine = content.split('\n')[0];
    expect(firstLine).toBe('Nama Siswa,NIS,Hadir,Izin,Sakit,Alpha,Total,% Hadir');
  });

  it('menghasilkan jumlah baris yang benar (header + data)', () => {
    const content = buildCSVContent(sampleRows);
    const lines = content.split('\n').filter(l => l.trim() !== '');
    expect(lines).toHaveLength(4);
  });

  it('data siswa pertama benar setelah parse', () => {
    const content = buildCSVContent(sampleRows);
    const parsed = parseCSV(content);
    expect(parsed[0]['Nama Siswa']).toBe('Ahmad Fauzi');
    expect(parsed[0]['NIS']).toBe('12345');
    expect(parsed[0]['Hadir']).toBe('20');
    expect(parsed[0]['Izin']).toBe('2');
    expect(parsed[0]['Sakit']).toBe('1');
    expect(parsed[0]['Alpha']).toBe('0');
    expect(parsed[0]['Total']).toBe('23');
    expect(parsed[0]['% Hadir']).toBe('86.96%');
  });

  it('menambahkan tanda % pada attendanceRate jika belum ada', () => {
    const rows = [
      { name: 'Test', nis: '99999', hadir: 10, izin: 0, sakit: 0, alpha: 0, total: 10, attendanceRate: 100 },
    ];
    const content = buildCSVContent(rows);
    const parsed = parseCSV(content);
    expect(parsed[0]['% Hadir']).toBe('100%');
  });

  it('menghandle nama siswa yang mengandung koma (dibungkus kutip ganda)', () => {
    const rows = [
      { name: 'Nama, Dengan Koma', nis: '11111', hadir: 5, izin: 0, sakit: 0, alpha: 0, total: 5, attendanceRate: '100%' },
    ];
    const content = buildCSVContent(rows);
    const parsed = parseCSV(content);
    expect(parsed[0]['Nama Siswa']).toBe('Nama, Dengan Koma');
  });

  it('menghandle nama siswa yang mengandung kutip ganda (di-escape menjadi "")', () => {
    const rows = [
      { name: 'Nama "Alias" Siswa', nis: '22222', hadir: 5, izin: 0, sakit: 0, alpha: 0, total: 5, attendanceRate: '100%' },
    ];
    const content = buildCSVContent(rows);
    const parsed = parseCSV(content);
    expect(parsed[0]['Nama Siswa']).toBe('Nama "Alias" Siswa');
  });

  it('menghandle array kosong — hanya menghasilkan header', () => {
    const content = buildCSVContent([]);
    const lines = content.split('\n').filter(l => l.trim() !== '');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Nama Siswa,NIS,Hadir,Izin,Sakit,Alpha,Total,% Hadir');
  });

  it('semua data siswa tersimpan dengan benar', () => {
    const content = buildCSVContent(sampleRows);
    const parsed = parseCSV(content);
    expect(parsed).toHaveLength(3);
    expect(parsed[1]['Nama Siswa']).toBe('Siti Nurhaliza');
    expect(parsed[2]['Nama Siswa']).toBe('Budi Santoso');
  });
});

// ============================================================
// Unit Tests — exportToCSV
// ============================================================

describe('exportToCSV', () => {
  const sampleRows = [
    { name: 'Ahmad Fauzi', nis: '12345', hadir: 20, izin: 2, sakit: 1, alpha: 0, total: 23, attendanceRate: '86.96%' },
  ];

  it('memanggil URL.createObjectURL satu kali', () => {
    exportToCSV(sampleRows, 'test.csv');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('memanggil URL.revokeObjectURL setelah download', () => {
    exportToCSV(sampleRows, 'test.csv');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('menggunakan filename yang diberikan sebagai atribut download', () => {
    const filename = 'Rekap_Kelas-7A_Januari-2024.csv';
    const originalCreateElement = document.createElement.bind(document);
    let capturedAnchor = null;
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') capturedAnchor = el;
      return el;
    });

    exportToCSV(sampleRows, filename);

    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor.download).toBe(filename);

    vi.restoreAllMocks();
  });

  it('membuat Blob dengan BOM UTF-8 di awal konten', () => {
    const OriginalBlob = globalThis.Blob;
    let capturedParts = null;

    class BlobCapture extends OriginalBlob {
      constructor(parts, options) {
        super(parts, options);
        capturedParts = parts;
      }
    }
    vi.stubGlobal('Blob', BlobCapture);

    exportToCSV(sampleRows, 'test.csv');

    expect(capturedParts).not.toBeNull();
    expect(capturedParts[0].startsWith('\uFEFF')).toBe(true);

    vi.unstubAllGlobals();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('tidak melempar error untuk array kosong', () => {
    expect(() => exportToCSV([], 'empty.csv')).not.toThrow();
  });
});

// ============================================================
// Unit Tests — printRecap
// ============================================================

describe('printRecap', () => {
  function makeMockWindow() {
    const mockPrint = vi.fn();
    const mockDoc = { write: vi.fn(), close: vi.fn() };
    const mockWin = { document: mockDoc, print: mockPrint };
    return { mockWin, mockPrint, mockDoc };
  }

  it('memanggil window.open dengan parameter yang benar', () => {
    const { mockWin } = makeMockWindow();
    const openSpy = vi.fn(() => mockWin);
    vi.stubGlobal('window', { ...window, open: openSpy });

    printRecap('Rekap Kelas 7A', '<table></table>');

    expect(openSpy).toHaveBeenCalledWith('', '_blank');

    vi.unstubAllGlobals();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });

  it('menulis HTML yang mengandung judul ke document', () => {
    const { mockWin, mockDoc } = makeMockWindow();
    vi.stubGlobal('window', { ...window, open: vi.fn(() => mockWin) });

    const title = 'Rekap Kelas 7A — Januari 2024';
    printRecap(title, '<table></table>');

    const writtenHTML = mockDoc.write.mock.calls[0][0];
    expect(writtenHTML).toContain(title);

    vi.unstubAllGlobals();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });

  it('menulis HTML yang mengandung tableHTML ke document', () => {
    const { mockWin, mockDoc } = makeMockWindow();
    vi.stubGlobal('window', { ...window, open: vi.fn(() => mockWin) });

    const tableHTML = '<table><tr><th>Nama</th></tr><tr><td>Ahmad</td></tr></table>';
    printRecap('Test', tableHTML);

    const writtenHTML = mockDoc.write.mock.calls[0][0];
    expect(writtenHTML).toContain(tableHTML);

    vi.unstubAllGlobals();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });

  it('memanggil win.document.close() dan win.print()', () => {
    const { mockWin, mockPrint, mockDoc } = makeMockWindow();
    vi.stubGlobal('window', { ...window, open: vi.fn(() => mockWin) });

    printRecap('Test', '<table></table>');

    expect(mockDoc.close).toHaveBeenCalledTimes(1);
    expect(mockPrint).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });

  it('tidak melempar error jika window.open mengembalikan null (popup diblokir)', () => {
    vi.stubGlobal('window', { ...window, open: vi.fn(() => null) });

    expect(() => printRecap('Test', '<table></table>')).not.toThrow();

    vi.unstubAllGlobals();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });
});

// ============================================================
// Property Tests
// ============================================================

/**
 * Property 4: Export CSV Round Trip
 * Validates: Requirements 6.2, 6.4
 *
 * Untuk semua data rekap bulanan yang valid, mengekspor ke format CSV kemudian
 * mem-parse kembali setiap baris harus menghasilkan nilai numerik (hadir, izin,
 * sakit, alpha, total) yang identik dengan data asli.
 */
describe('Feature: attendance-management-upgrade', () => {
  // Generator untuk satu baris rekap siswa.
  // Nama tidak boleh mengandung newline agar tidak merusak format CSV baris-per-baris.
  const recapRowArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\n') && !s.includes('\r')),
    nis: fc.stringMatching(/^[0-9]{5,10}$/),
    hadir: fc.nat({ max: 31 }),
    izin: fc.nat({ max: 10 }),
    sakit: fc.nat({ max: 10 }),
    alpha: fc.nat({ max: 10 }),
  }).map(row => ({
    ...row,
    total: row.hadir + row.izin + row.sakit + row.alpha,
    attendanceRate: row.hadir + row.izin + row.sakit + row.alpha > 0
      ? (Math.round((row.hadir / (row.hadir + row.izin + row.sakit + row.alpha)) * 10000) / 100) + '%'
      : '0%',
  }));

  const recapRowsArb = fc.array(recapRowArb, { minLength: 1, maxLength: 40 });

  it('Property 4: Export CSV Round Trip — nilai numerik identik setelah parse', () => {
    fc.assert(
      fc.property(recapRowsArb, (rows) => {
        // Gunakan buildCSVContent langsung — tidak perlu mock Blob
        const csvContent = buildCSVContent(rows);
        const parsed = parseCSV(csvContent);

        expect(parsed.length).toBe(rows.length);

        for (let i = 0; i < rows.length; i++) {
          const original = rows[i];
          const parsedRow = parsed[i];

          expect(parseInt(parsedRow['Hadir'], 10)).toBe(original.hadir);
          expect(parseInt(parsedRow['Izin'], 10)).toBe(original.izin);
          expect(parseInt(parsedRow['Sakit'], 10)).toBe(original.sakit);
          expect(parseInt(parsedRow['Alpha'], 10)).toBe(original.alpha);
          expect(parseInt(parsedRow['Total'], 10)).toBe(original.total);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Export CSV Round Trip — NIS dan nama siswa identik setelah parse', () => {
    fc.assert(
      fc.property(recapRowsArb, (rows) => {
        const csvContent = buildCSVContent(rows);
        const parsed = parseCSV(csvContent);

        for (let i = 0; i < rows.length; i++) {
          const original = rows[i];
          const parsedRow = parsed[i];

          expect(parsedRow['NIS']).toBe(String(original.nis));
          expect(parsedRow['Nama Siswa']).toBe(original.name);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Export CSV Round Trip — total = hadir + izin + sakit + alpha setelah parse', () => {
    fc.assert(
      fc.property(recapRowsArb, (rows) => {
        const csvContent = buildCSVContent(rows);
        const parsed = parseCSV(csvContent);

        for (let i = 0; i < rows.length; i++) {
          const parsedRow = parsed[i];
          const hadir = parseInt(parsedRow['Hadir'], 10);
          const izin = parseInt(parsedRow['Izin'], 10);
          const sakit = parseInt(parsedRow['Sakit'], 10);
          const alpha = parseInt(parsedRow['Alpha'], 10);
          const total = parseInt(parsedRow['Total'], 10);

          // Invariant: total = hadir + izin + sakit + alpha
          expect(total).toBe(hadir + izin + sakit + alpha);
        }
      }),
      { numRuns: 100 }
    );
  });
});

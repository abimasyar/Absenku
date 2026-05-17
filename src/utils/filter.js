/**
 * Utility functions untuk filtering data
 */

/**
 * Filter daftar siswa berdasarkan nama atau NIS (case-insensitive).
 * Tidak mengubah attendanceState — hanya memfilter array siswa.
 * @param {Array} students - Array siswa lengkap
 * @param {string} query - Query pencarian
 * @returns {Array} Array siswa yang cocok dengan query
 */
export function filterStudents(students, query) {
  if (!query || !query.trim()) return students;
  const q = query.trim().toLowerCase();
  return students.filter(s =>
    s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
  );
}

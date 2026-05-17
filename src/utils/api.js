/**
 * API helpers — langsung query Supabase (tanpa Edge Function)
 */
import { supabase } from '../supabase.js';
import { isDemoMode, demoGetStudentsByClass, demoSubmitAttendance, demoGetMonthlyRecap, demoGetStudentRecap, demoAddClass, demoAddStudent, demoDeactivateStudent, demoUpdateClass, demoUpdateStudent, demoDeleteClass, demoDeleteStudent } from '../demo.js';

export async function submitAttendance(classId, date, records) {
  if (isDemoMode()) return demoSubmitAttendance(classId, date, records);

  const { data: { session } } = await supabase.auth.getSession();
  const teacherId = session?.user?.id || null;

  let inserted = 0, updated = 0;

  for (const r of records) {
    // Cek apakah sudah ada record untuk siswa + kelas + tanggal ini
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', r.student_id)
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('attendance')
        .update({ status: r.status, note: r.note || null, teacher_id: teacherId })
        .eq('id', existing.id);
      updated++;
    } else {
      await supabase
        .from('attendance')
        .insert({ class_id: classId, student_id: r.student_id, date, status: r.status, note: r.note || null, teacher_id: teacherId });
      inserted++;
    }
  }

  return { ok: true, inserted, updated };
}

export async function getStudentsByClass(classId) {
  if (isDemoMode()) return demoGetStudentsByClass(classId);

  const { data, error } = await supabase
    .from('students')
    .select('id, class_id, nis, name, gender, status')
    .eq('class_id', classId)
    .order('name');

  if (error) throw new Error(error.message || 'Gagal memuat siswa');
  return data || [];
}

export async function getMonthlyRecap(classId, month, year) {
  if (isDemoMode()) return demoGetMonthlyRecap(classId, month, year);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const { data, error } = await supabase
    .from('attendance')
    .select('status')
    .eq('class_id', classId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw new Error(error.message || 'Gagal memuat rekap');

  let total_hadir = 0, total_izin = 0, total_sakit = 0, total_alpha = 0;
  (data || []).forEach(a => {
    if (a.status === 'hadir') total_hadir++;
    else if (a.status === 'izin') total_izin++;
    else if (a.status === 'sakit') total_sakit++;
    else if (a.status === 'alpha') total_alpha++;
  });

  return { total_hadir, total_izin, total_sakit, total_alpha };
}


/**
 * Ambil rekap absensi per siswa untuk bulan dan tahun tertentu.
 * Return: { student, stats, history }
 */
export async function getStudentRecap(studentId, month, year) {
  if (isDemoMode()) return demoGetStudentRecap(studentId, month, year);

  // Ambil data siswa beserta nama kelas
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id, name, nis, gender, class_id, classes(name)')
    .eq('id', studentId)
    .single();

  if (studentError || !studentData) {
    throw new Error(studentError?.message || 'Siswa tidak ditemukan');
  }

  const student = {
    id: studentData.id,
    name: studentData.name,
    nis: studentData.nis,
    gender: studentData.gender,
    class_name: studentData.classes?.name || '-',
  };

  // Ambil data absensi untuk bulan dan tahun yang dipilih
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('date, status, note')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (attendanceError) {
    throw new Error(attendanceError.message || 'Gagal memuat data absensi');
  }

  const history = (attendanceData || []).map(a => ({
    date: a.date,
    status: a.status,
    note: a.note || null,
  }));

  // Hitung statistik
  let total_hadir = 0, total_izin = 0, total_sakit = 0, total_alpha = 0;
  history.forEach(h => {
    if (h.status === 'hadir') total_hadir++;
    else if (h.status === 'izin') total_izin++;
    else if (h.status === 'sakit') total_sakit++;
    else if (h.status === 'alpha') total_alpha++;
  });

  const total_days = total_hadir + total_izin + total_sakit + total_alpha;
  const attendance_rate = total_days > 0
    ? parseFloat(((total_hadir / total_days) * 100).toFixed(1))
    : 0;

  return {
    student,
    stats: { total_hadir, total_izin, total_sakit, total_alpha, total_days, attendance_rate },
    history,
  };
}

/**
 * Tambah kelas baru
 */
export async function addClass(classData) {
  if (isDemoMode()) return demoAddClass(classData);
  const { data, error } = await supabase
    .from('classes')
    .insert({ name: classData.name.trim(), grade_level: parseInt(classData.grade_level), school_id: classData.school_id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Tambah siswa baru
 */
export async function addStudent(studentData) {
  if (isDemoMode()) return demoAddStudent(studentData);
  const { data, error } = await supabase
    .from('students')
    .insert({ name: studentData.name.trim(), nis: studentData.nis.trim(), gender: studentData.gender, class_id: studentData.class_id, status: 'aktif' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Nonaktifkan siswa
 */
export async function deactivateStudent(studentId) {
  if (isDemoMode()) return demoDeactivateStudent(studentId);
  const { error } = await supabase
    .from('students')
    .update({ status: 'tidak_aktif' })
    .eq('id', studentId);
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Edit nama & tingkat kelas
 */
export async function updateClass(classId, classData) {
  if (isDemoMode()) return demoUpdateClass(classId, classData);
  const { error } = await supabase
    .from('classes')
    .update({ name: classData.name.trim(), grade_level: parseInt(classData.grade_level) })
    .eq('id', classId);
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Edit data siswa (nama, NIS, jenis kelamin)
 */
export async function updateStudent(studentId, studentData) {
  if (isDemoMode()) return demoUpdateStudent(studentId, studentData);
  const updates = {};
  if (studentData.name) updates.name = studentData.name.trim();
  if (studentData.nis) updates.nis = studentData.nis.trim();
  if (studentData.gender) updates.gender = studentData.gender;
  const { error } = await supabase.from('students').update(updates).eq('id', studentId);
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Hapus kelas permanen
 */
export async function deleteClass(classId) {
  if (isDemoMode()) return demoDeleteClass(classId);
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Hapus siswa permanen
 */
export async function deleteStudent(studentId) {
  if (isDemoMode()) return demoDeleteStudent(studentId);
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) throw new Error(error.message);
  return true;
}

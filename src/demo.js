/**
 * Demo Mode — Mock data & fake auth for testing without Supabase
 */

let _demoMode = false;
let _demoRole = 'guru'; // 'guru' or 'admin'

export function isDemoMode() { return _demoMode; }
export function enableDemo(role = 'guru') { _demoMode = true; _demoRole = role; }
export function disableDemo() { _demoMode = false; }

// ---- Mock Data ----

const SCHOOL = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'SMK TKJ Maju Bersama',
  address: 'Jl. Pendidikan No. 10, Jakarta Selatan',
};

const USERS = {
  guru: {
    id: '22222222-2222-2222-2222-222222222222',
    school_id: SCHOOL.id,
    nip: '198001010001',
    name: 'Budi Santoso',
    email: 'guru@demo.com',
    role: 'guru',
    avatar_url: null,
  },
};

let CLASSES = [
  { id: '44444444-4444-4444-4444-444444444444', school_id: SCHOOL.id, name: 'X TKJ 1', grade_level: 10, homeroom_teacher_id: USERS.guru.id },
  { id: '55555555-5555-5555-5555-555555555555', school_id: SCHOOL.id, name: 'X TKJ 2', grade_level: 10, homeroom_teacher_id: USERS.guru.id },
  { id: '66666666-6666-6666-6666-666666666666', school_id: SCHOOL.id, name: 'XI TKJ 1', grade_level: 11, homeroom_teacher_id: USERS.guru.id },
];

function makeStudents(classId, className, count = 10) {
  const names = [
    'Ahmad Fauzi', 'Dewi Lestari', 'Rizky Pratama', 'Sari Indah', 'Muhammad Ilham',
    'Putri Amelia', 'Dimas Saputra', 'Nurul Hidayah', 'Fajar Ramadhan', 'Ayu Wulandari',
    'Bagas Setiawan', 'Citra Dewi', 'Eko Prasetyo', 'Fitri Handayani', 'Galih Permana',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `student-${classId}-${i + 1}`,
    class_id: classId,
    nis: `${className}-${String(i + 1).padStart(3, '0')}`,
    name: names[i % names.length],
    gender: i % 2 === 0 ? 'L' : 'P',
    status: 'aktif',
  }));
}

let ALL_STUDENTS = [
  ...makeStudents(CLASSES[0].id, 'X-TKJ1', 12),
  ...makeStudents(CLASSES[1].id, 'X-TKJ2', 10),
  ...makeStudents(CLASSES[2].id, 'XI-TKJ1', 11),
];

// In-memory attendance store for demo
const attendanceStore = [];

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Seed some attendance for today
function seedTodayAttendance() {
  if (attendanceStore.length > 0) return;
  const today = getToday();
  const class7A = CLASSES[0];
  const students7A = ALL_STUDENTS.filter(s => s.class_id === class7A.id);
  const statuses = ['hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'izin', 'sakit', 'hadir', 'hadir', 'alpha'];
  students7A.forEach((s, i) => {
    attendanceStore.push({
      id: `att-${s.id}-${today}`,
      class_id: class7A.id,
      student_id: s.id,
      teacher_id: USERS.guru.id,
      date: today,
      status: statuses[i % statuses.length],
      note: null,
    });
  });
}

// ---- Demo API ----

export function demoGetProfile() {
  return USERS[_demoRole];
}

export function demoGetSchool() {
  return SCHOOL;
}

export function demoQueryClasses() {
  return { data: [...CLASSES].sort((a, b) => a.name.localeCompare(b.name)), error: null };
}

export function demoQueryStudents(classId) {
  const data = ALL_STUDENTS.filter(s => s.class_id === classId && s.status === 'aktif');
  return { data, error: null };
}

export function demoQueryAttendance(filters = {}) {
  seedTodayAttendance();
  let results = [...attendanceStore];
  if (filters.class_id) results = results.filter(a => a.class_id === filters.class_id);
  if (filters.date) results = results.filter(a => a.date === filters.date);
  if (filters.student_ids) results = results.filter(a => filters.student_ids.includes(a.student_id));
  return { data: results, error: null };
}

export function demoGetStudentsByClass(classId) {
  return ALL_STUDENTS.filter(s => s.class_id === classId && s.status === 'aktif');
}

export function demoSubmitAttendance(classId, date, records) {
  let inserted = 0, updated = 0;
  for (const r of records) {
    const idx = attendanceStore.findIndex(a => a.class_id === classId && a.student_id === r.student_id && a.date === date);
    if (idx >= 0) {
      attendanceStore[idx].status = r.status;
      attendanceStore[idx].note = r.note;
      updated++;
    } else {
      attendanceStore.push({
        id: `att-${r.student_id}-${date}`,
        class_id: classId,
        student_id: r.student_id,
        teacher_id: USERS[_demoRole].id,
        date,
        status: r.status,
        note: r.note,
      });
      inserted++;
    }
  }
  return { ok: true, inserted, updated };
}

export function demoGetMonthlyRecap(classId, month, year) {
  seedTodayAttendance();
  let h = 0, i = 0, s = 0, a = 0;
  attendanceStore.forEach(att => {
    if (att.class_id !== classId) return;
    const d = new Date(att.date + 'T00:00:00');
    if ((d.getMonth() + 1) !== month || d.getFullYear() !== year) return;
    if (att.status === 'hadir') h++;
    else if (att.status === 'izin') i++;
    else if (att.status === 'sakit') s++;
    else if (att.status === 'alpha') a++;
  });
  return { total_hadir: h, total_izin: i, total_sakit: s, total_alpha: a };
}


/**
 * Ambil rekap absensi per siswa untuk bulan dan tahun tertentu.
 * Return: { student, stats, history }
 */
export function demoGetStudentRecap(studentId, month, year) {
  seedTodayAttendance();

  // Cari data siswa
  const studentData = ALL_STUDENTS.find(s => s.id === studentId);
  if (!studentData) {
    throw new Error('Siswa tidak ditemukan');
  }

  // Cari nama kelas
  const classData = CLASSES.find(c => c.id === studentData.class_id);
  const student = {
    id: studentData.id,
    name: studentData.name,
    nis: studentData.nis,
    gender: studentData.gender,
    class_name: classData ? classData.name : '-',
  };

  // Filter absensi berdasarkan student_id, month, year
  const history = attendanceStore
    .filter(att => {
      if (att.student_id !== studentId) return false;
      const d = new Date(att.date + 'T00:00:00');
      return (d.getMonth() + 1) === month && d.getFullYear() === year;
    })
    .map(att => ({
      date: att.date,
      status: att.status,
      note: att.note || null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

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

// ---- Demo Management API ----

let _classCounter = 100;
let _studentCounter = 1000;

/**
 * Tambah kelas baru ke demo data
 */
export function demoAddClass(classData) {
  const newClass = {
    id: `demo-class-${++_classCounter}`,
    school_id: SCHOOL.id,
    name: classData.name.trim(),
    grade_level: parseInt(classData.grade_level),
    homeroom_teacher_id: USERS[_demoRole]?.id || USERS.guru.id,
  };
  CLASSES.push(newClass);
  return newClass;
}

/**
 * Tambah siswa baru ke demo data
 */
export function demoAddStudent(studentData) {
  const newStudent = {
    id: `demo-student-${++_studentCounter}`,
    class_id: studentData.class_id,
    nis: studentData.nis.trim(),
    name: studentData.name.trim(),
    gender: studentData.gender,
    status: 'aktif',
  };
  ALL_STUDENTS.push(newStudent);
  return newStudent;
}

/**
 * Nonaktifkan siswa di demo data
 */
export function demoDeactivateStudent(studentId) {
  const idx = ALL_STUDENTS.findIndex(s => s.id === studentId);
  if (idx >= 0) {
    ALL_STUDENTS[idx] = { ...ALL_STUDENTS[idx], status: 'tidak_aktif' };
    return true;
  }
  return false;
}

/**
 * Ambil semua siswa (aktif dan tidak aktif) untuk satu kelas
 */
export function demoGetAllStudentsByClass(classId) {
  return ALL_STUDENTS.filter(s => s.class_id === classId);
}

/**
 * Edit nama & tingkat kelas di demo data
 */
export function demoUpdateClass(classId, classData) {
  const idx = CLASSES.findIndex(c => c.id === classId);
  if (idx >= 0) {
    CLASSES[idx] = { ...CLASSES[idx], name: classData.name.trim(), grade_level: parseInt(classData.grade_level) };
    return true;
  }
  return false;
}

/**
 * Edit data siswa di demo data
 */
export function demoUpdateStudent(studentId, studentData) {
  const idx = ALL_STUDENTS.findIndex(s => s.id === studentId);
  if (idx >= 0) {
    if (studentData.name) ALL_STUDENTS[idx] = { ...ALL_STUDENTS[idx], name: studentData.name.trim() };
    if (studentData.nis) ALL_STUDENTS[idx] = { ...ALL_STUDENTS[idx], nis: studentData.nis.trim() };
    if (studentData.gender) ALL_STUDENTS[idx] = { ...ALL_STUDENTS[idx], gender: studentData.gender };
    return true;
  }
  return false;
}

/**
 * Hapus kelas dari demo data
 */
export function demoDeleteClass(classId) {
  const idx = CLASSES.findIndex(c => c.id === classId);
  if (idx >= 0) CLASSES.splice(idx, 1);
  // Hapus juga siswa di kelas tersebut
  const toRemove = ALL_STUDENTS.filter(s => s.class_id === classId).map(s => s.id);
  toRemove.forEach(id => {
    const i = ALL_STUDENTS.findIndex(s => s.id === id);
    if (i >= 0) ALL_STUDENTS.splice(i, 1);
  });
  return true;
}

/**
 * Hapus siswa dari demo data
 */
export function demoDeleteStudent(studentId) {
  const idx = ALL_STUDENTS.findIndex(s => s.id === studentId);
  if (idx >= 0) ALL_STUDENTS.splice(idx, 1);
  return true;
}

/**
 * Update profil user di demo data
 */
export function demoUpdateProfile(updates) {
  const user = USERS[_demoRole];
  if (!user) return;
  if (updates.name) user.name = updates.name.trim();
  if (updates.nip !== undefined) user.nip = updates.nip;
  if (updates.role) user.role = updates.role;
  if (updates.schoolName) SCHOOL.name = updates.schoolName.trim();
  if (updates.schoolAddress !== undefined) SCHOOL.address = updates.schoolAddress;
}

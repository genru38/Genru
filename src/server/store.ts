import fs from 'node:fs';
import path from 'node:path';
import type {
  AttendanceRecord,
  BootstrapPayload,
  Employee,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  ShiftSettings,
  WorkMode,
} from '../types/attendance.ts';
import {
  calculateWorkDurationMinutes,
  evaluateClockInStatus,
  getJakartaDateString,
  validateEmployeeInput,
  validateLeaveRequest,
} from '../utils/attendanceRules.ts';

interface StoreData {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  settings: ShiftSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'attendance-store.json');

function shiftJakartaDate(baseDateStr: string, offsetDays: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function wibToUtcIso(dateStr: string, hhmm: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  // WIB is UTC+7
  const dt = new Date(Date.UTC(y, m - 1, d, hh - 7, mm, 0));
  return dt.toISOString();
}

function createSeedData(): StoreData {
  const today = getJakartaDateString();
  const yesterday = shiftJakartaDate(today, -1);
  const twoDaysAgo = shiftJakartaDate(today, -2);
  const threeDaysAgo = shiftJakartaDate(today, -3);

  const employees: Employee[] = [
    {
      id: 'emp-1',
      nik: 'EMP-001',
      name: 'Budi Santoso',
      role: 'Senior Software Engineer',
      department: 'Engineering',
      email: 'budi.santoso@presensiku.id',
      avatarUrl: '/src/assets/images/avatar_budi_1795356788754.jpg',
      joinedDate: '2023-03-14',
    },
    {
      id: 'emp-2',
      nik: 'EMP-002',
      name: 'Siti Rahma',
      role: 'People Operations Lead',
      department: 'Human Resources',
      email: 'siti.rahma@presensiku.id',
      avatarUrl: '/src/assets/images/avatar_siti_1795356788833.jpg',
      joinedDate: '2022-08-01',
    },
    {
      id: 'emp-3',
      nik: 'EMP-003',
      name: 'Andi Pratama',
      role: 'Product Designer',
      department: 'Design',
      email: 'andi.pratama@presensiku.id',
      avatarUrl: '/src/assets/images/avatar_andi_1795356788704.jpg',
      joinedDate: '2024-01-15',
    },
    {
      id: 'emp-4',
      nik: 'EMP-004',
      name: 'Ratna Dewi',
      role: 'Finance & Payroll Lead',
      department: 'Finance',
      email: 'ratna.dewi@presensiku.id',
      avatarUrl: '/src/assets/images/avatar_ratna_1795356788160.jpg',
      joinedDate: '2023-06-12',
    },
    {
      id: 'emp-5',
      nik: 'EMP-005',
      name: 'Hendra Wijaya',
      role: 'Operations Coordinator',
      department: 'Operations',
      email: 'hendra.wijaya@presensiku.id',
      joinedDate: '2024-05-20',
    },
    {
      id: 'emp-6',
      nik: 'EMP-006',
      name: 'Nadia Putri',
      role: 'Backend Developer',
      department: 'Engineering',
      email: 'nadia.putri@presensiku.id',
      joinedDate: '2025-02-03',
    },
  ];

  const attendance: AttendanceRecord[] = [
    // Today's deterministic records (Andi & Nadia belum absen agar langsung bisa dicoba)
    {
      id: 'att-today-1',
      employeeId: 'emp-1',
      date: today,
      clockIn: wibToUtcIso(today, '07:52'),
      clockOut: null,
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: null,
      notes: 'Hadir di kantor lantai 3',
    },
    {
      id: 'att-today-2',
      employeeId: 'emp-2',
      date: today,
      clockIn: wibToUtcIso(today, '08:04'),
      clockOut: null,
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: null,
      notes: 'Persiapan rekap bulanan',
    },
    {
      id: 'att-today-4',
      employeeId: 'emp-4',
      date: today,
      clockIn: wibToUtcIso(today, '08:27'),
      clockOut: null,
      workMode: 'WFH',
      status: 'terlambat',
      lateMinutes: 27,
      workDurationMinutes: null,
      notes: 'Kendala koneksi internet pagi hari',
    },
    // Past workdays history
    {
      id: 'att-yest-1',
      employeeId: 'emp-1',
      date: yesterday,
      clockIn: wibToUtcIso(yesterday, '07:55'),
      clockOut: wibToUtcIso(yesterday, '17:10'),
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: 555,
      notes: 'Deploy modul laporan',
    },
    {
      id: 'att-yest-2',
      employeeId: 'emp-2',
      date: yesterday,
      clockIn: wibToUtcIso(yesterday, '08:02'),
      clockOut: wibToUtcIso(yesterday, '17:05'),
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: 543,
      notes: '',
    },
    {
      id: 'att-yest-3',
      employeeId: 'emp-3',
      date: yesterday,
      clockIn: wibToUtcIso(yesterday, '08:11'),
      clockOut: wibToUtcIso(yesterday, '17:20'),
      workMode: 'WFH',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: 549,
      notes: 'Review desain dashboard',
    },
    {
      id: 'att-yest-4',
      employeeId: 'emp-4',
      date: yesterday,
      clockIn: wibToUtcIso(yesterday, '08:00'),
      clockOut: wibToUtcIso(yesterday, '17:00'),
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: 540,
      notes: '',
    },
    {
      id: 'att-yest-6',
      employeeId: 'emp-6',
      date: yesterday,
      clockIn: wibToUtcIso(yesterday, '08:22'),
      clockOut: wibToUtcIso(yesterday, '17:30'),
      workMode: 'WFO',
      status: 'terlambat',
      lateMinutes: 22,
      workDurationMinutes: 548,
      notes: 'Lalu lintas padat',
    },
    {
      id: 'att-2d-1',
      employeeId: 'emp-1',
      date: twoDaysAgo,
      clockIn: wibToUtcIso(twoDaysAgo, '07:49'),
      clockOut: wibToUtcIso(twoDaysAgo, '17:02'),
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: 553,
      notes: '',
    },
    {
      id: 'att-2d-3',
      employeeId: 'emp-3',
      date: twoDaysAgo,
      clockIn: wibToUtcIso(twoDaysAgo, '08:05'),
      clockOut: wibToUtcIso(twoDaysAgo, '17:08'),
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: 543,
      notes: '',
    },
    {
      id: 'att-3d-5',
      employeeId: 'emp-5',
      date: threeDaysAgo,
      clockIn: wibToUtcIso(threeDaysAgo, '08:08'),
      clockOut: wibToUtcIso(threeDaysAgo, '17:15'),
      workMode: 'Dinas Luar',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: 547,
      notes: 'Kunjungan klien area Jakarta Selatan',
    },
  ];

  const leaves: LeaveRequest[] = [
    {
      id: 'lv-1',
      employeeId: 'emp-5',
      type: 'Sakit',
      startDate: today,
      endDate: today,
      reason: 'Pemeriksaan dokter dan istirahat pemulihan demam.',
      status: 'disetujui',
      createdAt: wibToUtcIso(yesterday, '19:30'),
      reviewedAt: wibToUtcIso(yesterday, '20:15'),
    },
    {
      id: 'lv-2',
      employeeId: 'emp-3',
      type: 'Cuti Tahunan',
      startDate: shiftJakartaDate(today, 2),
      endDate: shiftJakartaDate(today, 3),
      reason: 'Acara keluarga di Bandung.',
      status: 'menunggu',
      createdAt: wibToUtcIso(yesterday, '14:10'),
    },
    {
      id: 'lv-3',
      employeeId: 'emp-6',
      type: 'Izin',
      startDate: twoDaysAgo,
      endDate: twoDaysAgo,
      reason: 'Pengurusan perpanjangan dokumen kependudukan.',
      status: 'disetujui',
      createdAt: wibToUtcIso(threeDaysAgo, '16:00'),
      reviewedAt: wibToUtcIso(threeDaysAgo, '17:05'),
    },
  ];

  const settings: ShiftSettings = {
    companyName: 'PT Nusantara Digital Karya',
    officeLocation: 'Menara Sudirman Lt. 12, Jakarta Pusat',
    shiftName: 'Shift Reguler Kantor',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    toleranceMinutes: 15,
  };

  return { employees, attendance, leaves, settings };
}

function readStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const initial = createSeedData();
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(STORE_FILE, 'utf-8');
  return JSON.parse(raw) as StoreData;
}

function writeStore(data: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getBootstrapData(): BootstrapPayload {
  const store = readStore();
  return {
    ...store,
    todayDate: getJakartaDateString(),
  };
}

export function clockInEmployee(payload: {
  employeeId: string;
  workMode: WorkMode;
  notes?: string;
}): { record?: AttendanceRecord; error?: string; statusCode?: number } {
  const store = readStore();
  const employee = store.employees.find((e) => e.id === payload.employeeId);
  if (!employee) {
    return { error: 'Karyawan tidak ditemukan.', statusCode: 404 };
  }

  const validModes: WorkMode[] = ['WFO', 'WFH', 'Dinas Luar'];
  if (!validModes.includes(payload.workMode)) {
    return { error: 'Mode kerja tidak valid.', statusCode: 400 };
  }

  const today = getJakartaDateString();
  const existing = store.attendance.find(
    (a) => a.employeeId === payload.employeeId && a.date === today
  );
  if (existing) {
    return { error: `${employee.name} sudah melakukan absen masuk hari ini.`, statusCode: 409 };
  }

  const now = new Date();
  const { status, lateMinutes } = evaluateClockInStatus(
    now,
    store.settings.shiftStart,
    store.settings.toleranceMinutes
  );

  const record: AttendanceRecord = {
    id: `att-${Date.now()}`,
    employeeId: employee.id,
    date: today,
    clockIn: now.toISOString(),
    clockOut: null,
    workMode: payload.workMode,
    status,
    lateMinutes,
    workDurationMinutes: null,
    notes: (payload.notes ?? '').trim().slice(0, 200),
  };

  store.attendance.unshift(record);
  writeStore(store);
  return { record };
}

export function clockOutEmployee(payload: {
  employeeId: string;
  notes?: string;
}): { record?: AttendanceRecord; error?: string; statusCode?: number } {
  const store = readStore();
  const employee = store.employees.find((e) => e.id === payload.employeeId);
  if (!employee) {
    return { error: 'Karyawan tidak ditemukan.', statusCode: 404 };
  }

  const today = getJakartaDateString();
  const idx = store.attendance.findIndex(
    (a) => a.employeeId === payload.employeeId && a.date === today
  );
  if (idx === -1) {
    return { error: `${employee.name} belum melakukan absen masuk hari ini.`, statusCode: 400 };
  }

  const existing = store.attendance[idx];
  if (existing.clockOut) {
    return { error: `${employee.name} sudah melakukan absen pulang hari ini.`, statusCode: 409 };
  }

  const nowIso = new Date().toISOString();
  const duration = calculateWorkDurationMinutes(existing.clockIn, nowIso);
  const extraNote = (payload.notes ?? '').trim().slice(0, 200);
  const updated: AttendanceRecord = {
    ...existing,
    clockOut: nowIso,
    workDurationMinutes: duration,
    notes: extraNote
      ? existing.notes
        ? `${existing.notes} · Pulang: ${extraNote}`
        : extraNote
      : existing.notes,
  };

  store.attendance[idx] = updated;
  writeStore(store);
  return { record: updated };
}

export function createManualAttendance(payload: {
  employeeId: string;
  date: string;
  clockInHHMM: string;
  clockOutHHMM?: string;
  workMode: WorkMode;
  notes?: string;
}): { record?: AttendanceRecord; error?: string; statusCode?: number } {
  const store = readStore();
  const employee = store.employees.find((e) => e.id === payload.employeeId);
  if (!employee) {
    return { error: 'Karyawan tidak ditemukan.', statusCode: 404 };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return { error: 'Format tanggal tidak valid.', statusCode: 400 };
  }
  if (!/^\d{2}:\d{2}$/.test(payload.clockInHHMM)) {
    return { error: 'Jam masuk wajib diisi dengan format HH:MM.', statusCode: 400 };
  }
  if (payload.clockOutHHMM && !/^\d{2}:\d{2}$/.test(payload.clockOutHHMM)) {
    return { error: 'Format jam pulang tidak valid.', statusCode: 400 };
  }
  if (payload.clockOutHHMM && payload.clockOutHHMM <= payload.clockInHHMM) {
    return { error: 'Jam pulang harus lebih akhir dari jam masuk.', statusCode: 400 };
  }

  const clockInIso = wibToUtcIso(payload.date, payload.clockInHHMM);
  const clockOutIso = payload.clockOutHHMM
    ? wibToUtcIso(payload.date, payload.clockOutHHMM)
    : null;

  const { status, lateMinutes } = evaluateClockInStatus(
    new Date(clockInIso),
    store.settings.shiftStart,
    store.settings.toleranceMinutes
  );

  const existingIdx = store.attendance.findIndex(
    (a) => a.employeeId === payload.employeeId && a.date === payload.date
  );

  const record: AttendanceRecord = {
    id: existingIdx >= 0 ? store.attendance[existingIdx].id : `att-${Date.now()}`,
    employeeId: payload.employeeId,
    date: payload.date,
    clockIn: clockInIso,
    clockOut: clockOutIso,
    workMode: payload.workMode,
    status,
    lateMinutes,
    workDurationMinutes: clockOutIso
      ? calculateWorkDurationMinutes(clockInIso, clockOutIso)
      : null,
    notes: (payload.notes ?? '').trim().slice(0, 200),
  };

  if (existingIdx >= 0) {
    store.attendance[existingIdx] = record;
  } else {
    store.attendance.unshift(record);
  }
  writeStore(store);
  return { record };
}

export function createLeaveRequest(payload: {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}): { leave?: LeaveRequest; error?: string; statusCode?: number } {
  const validationError = validateLeaveRequest(payload);
  if (validationError) {
    return { error: validationError, statusCode: 400 };
  }

  const store = readStore();
  const employee = store.employees.find((e) => e.id === payload.employeeId);
  if (!employee) {
    return { error: 'Karyawan tidak ditemukan.', statusCode: 404 };
  }

  const leave: LeaveRequest = {
    id: `lv-${Date.now()}`,
    employeeId: payload.employeeId,
    type: payload.type,
    startDate: payload.startDate,
    endDate: payload.endDate,
    reason: payload.reason.trim().slice(0, 300),
    status: 'menunggu',
    createdAt: new Date().toISOString(),
  };

  store.leaves.unshift(leave);
  writeStore(store);
  return { leave };
}

export function updateLeaveStatus(
  id: string,
  status: LeaveStatus
): { leave?: LeaveRequest; error?: string; statusCode?: number } {
  if (!['disetujui', 'ditolak'].includes(status)) {
    return { error: 'Status persetujuan tidak valid.', statusCode: 400 };
  }
  const store = readStore();
  const idx = store.leaves.findIndex((l) => l.id === id);
  if (idx === -1) {
    return { error: 'Pengajuan izin tidak ditemukan.', statusCode: 404 };
  }

  const updated: LeaveRequest = {
    ...store.leaves[idx],
    status,
    reviewedAt: new Date().toISOString(),
  };
  store.leaves[idx] = updated;
  writeStore(store);
  return { leave: updated };
}

export function createEmployee(payload: {
  nik: string;
  name: string;
  role: string;
  department: string;
  email: string;
}): { employee?: Employee; error?: string; statusCode?: number } {
  const store = readStore();
  const validationError = validateEmployeeInput(
    payload,
    store.employees.map((e) => e.nik)
  );
  if (validationError) {
    return { error: validationError, statusCode: 400 };
  }

  const employee: Employee = {
    id: `emp-${Date.now()}`,
    nik: payload.nik.trim().toUpperCase(),
    name: payload.name.trim(),
    role: payload.role.trim(),
    department: payload.department.trim(),
    email:
      payload.email.trim() ||
      `${payload.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.')}@presensiku.id`,
    joinedDate: getJakartaDateString(),
  };

  store.employees.push(employee);
  writeStore(store);
  return { employee };
}

export function deleteEmployee(id: string): { deletedId?: string; error?: string; statusCode?: number } {
  const store = readStore();
  if (store.employees.length <= 1) {
    return { error: 'Minimal harus tersisa satu karyawan aktif di sistem.', statusCode: 400 };
  }
  const idx = store.employees.findIndex((e) => e.id === id);
  if (idx === -1) {
    return { error: 'Karyawan tidak ditemukan.', statusCode: 404 };
  }
  store.employees.splice(idx, 1);
  store.attendance = store.attendance.filter((a) => a.employeeId !== id);
  store.leaves = store.leaves.filter((l) => l.employeeId !== id);
  writeStore(store);
  return { deletedId: id };
}

export function updateSettings(payload: ShiftSettings): {
  settings?: ShiftSettings;
  error?: string;
  statusCode?: number;
} {
  if (!payload.companyName?.trim() || !payload.shiftName?.trim()) {
    return { error: 'Nama perusahaan dan nama shift wajib diisi.', statusCode: 400 };
  }
  if (!/^\d{2}:\d{2}$/.test(payload.shiftStart) || !/^\d{2}:\d{2}$/.test(payload.shiftEnd)) {
    return { error: 'Format jam masuk dan pulang harus HH:MM.', statusCode: 400 };
  }
  if (payload.shiftEnd <= payload.shiftStart) {
    return { error: 'Jam pulang harus lebih akhir dari jam masuk.', statusCode: 400 };
  }
  const tolerance = Number(payload.toleranceMinutes);
  if (Number.isNaN(tolerance) || tolerance < 0 || tolerance > 120) {
    return { error: 'Toleransi keterlambatan harus antara 0 hingga 120 menit.', statusCode: 400 };
  }

  const store = readStore();
  const nextSettings: ShiftSettings = {
    companyName: payload.companyName.trim(),
    officeLocation: payload.officeLocation.trim(),
    shiftName: payload.shiftName.trim(),
    shiftStart: payload.shiftStart,
    shiftEnd: payload.shiftEnd,
    toleranceMinutes: tolerance,
  };
  store.settings = nextSettings;
  writeStore(store);
  return { settings: nextSettings };
}

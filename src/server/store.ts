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
import { createSeedData, wibToUtcIso, type StoreData } from '../utils/seedData.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'attendance-store.json');

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

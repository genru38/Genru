import type {
  AttendanceRecord,
  BootstrapPayload,
  Employee,
  LeaveRequest,
  LeaveType,
  ShiftSettings,
  WorkMode,
} from '../types/attendance';
import {
  calculateWorkDurationMinutes,
  evaluateClockInStatus,
  getJakartaDateString,
  validateEmployeeInput,
  validateLeaveRequest,
} from './attendanceRules';
import { createSeedData, wibToUtcIso, type StoreData } from './seedData';

const LOCAL_STORAGE_KEY = 'presensiku_static_store_v1';

let useLocalFallback = false;

function readLocalStore(): StoreData {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as StoreData;
    }
  } catch {
    // ignore storage read error and initialize fresh seed
  }
  const initial = createSeedData();
  writeLocalStore(initial);
  return initial;
}

function writeLocalStore(data: StoreData): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

async function tryServerApi<T>(url: string, options?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, status: res.status };
    }
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.error || `Permintaan gagal (${res.status})` };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  if (!useLocalFallback) {
    const res = await tryServerApi<BootstrapPayload>('./api/bootstrap');
    if (res.ok) {
      return res.data;
    }
    if (res.error && res.status >= 500) {
      throw new Error(res.error);
    }
    // No JSON API available (e.g. GitHub Pages / static hosting): seamlessly use browser storage
    useLocalFallback = true;
  }

  const store = readLocalStore();
  return {
    ...store,
    todayDate: getJakartaDateString(),
  };
}

export async function apiClockIn(payload: {
  employeeId: string;
  workMode: WorkMode;
  notes: string;
}): Promise<void> {
  if (!useLocalFallback) {
    const res = await tryServerApi('/api/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const store = readLocalStore();
  const employee = store.employees.find((e) => e.id === payload.employeeId);
  if (!employee) throw new Error('Karyawan tidak ditemukan.');

  const today = getJakartaDateString();
  if (store.attendance.some((a) => a.employeeId === payload.employeeId && a.date === today)) {
    throw new Error(`${employee.name} sudah melakukan absen masuk hari ini.`);
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
    notes: payload.notes.trim().slice(0, 200),
  };

  store.attendance.unshift(record);
  writeLocalStore(store);
}

export async function apiClockOut(payload: {
  employeeId: string;
  notes: string;
}): Promise<void> {
  if (!useLocalFallback) {
    const res = await tryServerApi('/api/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const store = readLocalStore();
  const employee = store.employees.find((e) => e.id === payload.employeeId);
  if (!employee) throw new Error('Karyawan tidak ditemukan.');

  const today = getJakartaDateString();
  const idx = store.attendance.findIndex(
    (a) => a.employeeId === payload.employeeId && a.date === today
  );
  if (idx === -1) throw new Error(`${employee.name} belum melakukan absen masuk hari ini.`);

  const existing = store.attendance[idx];
  if (existing.clockOut) throw new Error(`${employee.name} sudah melakukan absen pulang hari ini.`);

  const nowIso = new Date().toISOString();
  const duration = calculateWorkDurationMinutes(existing.clockIn, nowIso);
  const extraNote = payload.notes.trim().slice(0, 200);
  store.attendance[idx] = {
    ...existing,
    clockOut: nowIso,
    workDurationMinutes: duration,
    notes: extraNote
      ? existing.notes
        ? `${existing.notes} · Pulang: ${extraNote}`
        : extraNote
      : existing.notes,
  };
  writeLocalStore(store);
}

export async function apiManualAttendance(payload: {
  employeeId: string;
  date: string;
  clockInHHMM: string;
  clockOutHHMM?: string;
  workMode: WorkMode;
  notes: string;
}): Promise<void> {
  if (!useLocalFallback) {
    const res = await tryServerApi('/api/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const store = readLocalStore();
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
    notes: payload.notes.trim().slice(0, 200),
  };

  if (existingIdx >= 0) store.attendance[existingIdx] = record;
  else store.attendance.unshift(record);
  writeLocalStore(store);
}

export async function apiCreateLeave(payload: {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<void> {
  if (!useLocalFallback) {
    const res = await tryServerApi('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const err = validateLeaveRequest(payload);
  if (err) throw new Error(err);

  const store = readLocalStore();
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
  writeLocalStore(store);
}

export async function apiUpdateLeaveStatus(
  id: string,
  status: 'disetujui' | 'ditolak'
): Promise<void> {
  if (!useLocalFallback) {
    const res = await tryServerApi(`/api/leaves/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (res.ok) return;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const store = readLocalStore();
  const idx = store.leaves.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error('Pengajuan izin tidak ditemukan.');
  store.leaves[idx] = {
    ...store.leaves[idx],
    status,
    reviewedAt: new Date().toISOString(),
  };
  writeLocalStore(store);
}

export async function apiCreateEmployee(payload: {
  nik: string;
  name: string;
  role: string;
  department: string;
  email: string;
}): Promise<{ employee: Employee }> {
  if (!useLocalFallback) {
    const res = await tryServerApi<{ employee: Employee }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) return res.data;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const store = readLocalStore();
  const err = validateEmployeeInput(
    payload,
    store.employees.map((e) => e.nik)
  );
  if (err) throw new Error(err);

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
  writeLocalStore(store);
  return { employee };
}

export async function apiDeleteEmployee(id: string): Promise<void> {
  if (!useLocalFallback) {
    const res = await tryServerApi(`/api/employees/${id}`, { method: 'DELETE' });
    if (res.ok) return;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const store = readLocalStore();
  if (store.employees.length <= 1) {
    throw new Error('Minimal harus tersisa satu karyawan aktif di sistem.');
  }
  store.employees = store.employees.filter((e) => e.id !== id);
  store.attendance = store.attendance.filter((a) => a.employeeId !== id);
  store.leaves = store.leaves.filter((l) => l.employeeId !== id);
  writeLocalStore(store);
}

export async function apiSaveSettings(next: ShiftSettings): Promise<void> {
  if (!useLocalFallback) {
    const res = await tryServerApi('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(next),
    });
    if (res.ok) return;
    if (res.error) throw new Error(res.error);
    useLocalFallback = true;
  }

  const store = readLocalStore();
  store.settings = {
    companyName: next.companyName.trim(),
    officeLocation: next.officeLocation.trim(),
    shiftName: next.shiftName.trim(),
    shiftStart: next.shiftStart,
    shiftEnd: next.shiftEnd,
    toleranceMinutes: Number(next.toleranceMinutes),
  };
  writeLocalStore(store);
}

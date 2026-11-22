import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttendanceCsv,
  buildDailyRoster,
  calculateWorkDurationMinutes,
  computeDailySummary,
  evaluateClockInStatus,
  formatDurationId,
  formatTimeWIB,
  validateEmployeeInput,
  validateLeaveRequest,
} from './attendanceRules';
import type { AttendanceRecord, Employee, LeaveRequest } from '../types/attendance';

test('evaluateClockInStatus distinguishes on-time, tolerance, and late arrivals in WIB', () => {
  // 01:00 UTC = 08:00 WIB (exact shift start)
  assert.deepEqual(
    evaluateClockInStatus(new Date('2026-11-22T01:00:00.000Z'), '08:00', 15),
    { status: 'hadir', lateMinutes: 0 }
  );

  // 01:15 UTC = 08:15 WIB (within 15 min tolerance)
  assert.deepEqual(
    evaluateClockInStatus(new Date('2026-11-22T01:15:00.000Z'), '08:00', 15),
    { status: 'hadir', lateMinutes: 0 }
  );

  // 01:28 UTC = 08:28 WIB (28 minutes after 08:00, beyond 15 min tolerance)
  assert.deepEqual(
    evaluateClockInStatus(new Date('2026-11-22T01:28:00.000Z'), '08:00', 15),
    { status: 'terlambat', lateMinutes: 28 }
  );
});

test('calculateWorkDurationMinutes, formatDurationId, and formatTimeWIB format accurately', () => {
  const mins = calculateWorkDurationMinutes(
    '2026-11-22T01:00:00.000Z',
    '2026-11-22T10:15:00.000Z'
  );
  assert.equal(mins, 555);
  assert.equal(formatDurationId(mins), '9j 15m');
  assert.equal(formatDurationId(45), '45m');
  assert.equal(formatDurationId(0), '< 1m');
  assert.equal(formatDurationId(null), '—');
  assert.equal(formatTimeWIB('2026-11-22T01:05:00.000Z'), '08:05');
});

test('validateLeaveRequest rejects invalid dates and short reasons', () => {
  assert.equal(
    validateLeaveRequest({
      employeeId: '',
      type: 'Sakit',
      startDate: '2026-11-22',
      endDate: '2026-11-22',
      reason: 'Demam tinggi',
    }),
    'Pilih karyawan terlebih dahulu.'
  );

  assert.equal(
    validateLeaveRequest({
      employeeId: 'emp-1',
      type: 'Cuti Tahunan',
      startDate: '2026-11-25',
      endDate: '2026-11-22',
      reason: 'Acara keluarga di luar kota',
    }),
    'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'
  );

  assert.equal(
    validateLeaveRequest({
      employeeId: 'emp-1',
      type: 'Izin',
      startDate: '2026-11-22',
      endDate: '2026-11-22',
      reason: 'ok',
    }),
    'Alasan pengajuan minimal 5 karakter.'
  );

  assert.equal(
    validateLeaveRequest({
      employeeId: 'emp-1',
      type: 'Cuti Tahunan',
      startDate: '2026-11-23',
      endDate: '2026-11-24',
      reason: 'Cuti keluarga tahunan',
    }),
    null
  );
});

test('validateEmployeeInput enforces unique NIK and required fields', () => {
  assert.equal(
    validateEmployeeInput(
      {
        nik: 'EMP-001',
        name: 'Dewi Lestari',
        role: 'QA Engineer',
        department: 'Engineering',
        email: 'dewi@perusahaan.id',
      },
      ['EMP-001', 'EMP-002']
    ),
    'NIK "EMP-001" sudah terdaftar.'
  );

  assert.equal(
    validateEmployeeInput(
      {
        nik: 'EMP-009',
        name: 'Dewi Lestari',
        role: 'QA Engineer',
        department: 'Engineering',
        email: 'dewi@perusahaan.id',
      },
      ['EMP-001', 'EMP-002']
    ),
    null
  );
});

test('computeDailySummary and buildDailyRoster classify hadir, terlambat, izin, and belum_absen', () => {
  const employees: Employee[] = [
    { id: 'e1', nik: 'EMP-001', name: 'Budi', role: 'Dev', department: 'Tech', email: 'b@x.id', joinedDate: '2025-01-10' },
    { id: 'e2', nik: 'EMP-002', name: 'Siti', role: 'HR', department: 'HR', email: 's@x.id', joinedDate: '2025-01-10' },
    { id: 'e3', nik: 'EMP-003', name: 'Andi', role: 'UI', department: 'Design', email: 'a@x.id', joinedDate: '2025-02-01' },
    { id: 'e4', nik: 'EMP-004', name: 'Ratna', role: 'Fin', department: 'Finance', email: 'r@x.id', joinedDate: '2025-03-01' },
  ];

  const records: AttendanceRecord[] = [
    {
      id: 'att-1',
      employeeId: 'e1',
      date: '2026-11-22',
      clockIn: '2026-11-22T00:55:00.000Z',
      clockOut: null,
      workMode: 'WFO',
      status: 'hadir',
      lateMinutes: 0,
      workDurationMinutes: null,
      notes: '',
    },
    {
      id: 'att-2',
      employeeId: 'e2',
      date: '2026-11-22',
      clockIn: '2026-11-22T01:30:00.000Z',
      clockOut: null,
      workMode: 'WFH',
      status: 'terlambat',
      lateMinutes: 30,
      workDurationMinutes: null,
      notes: 'Hujan deras',
    },
  ];

  const leaves: LeaveRequest[] = [
    {
      id: 'lv-1',
      employeeId: 'e3',
      type: 'Sakit',
      startDate: '2026-11-22',
      endDate: '2026-11-23',
      reason: 'Istirahat sakit demam',
      status: 'disetujui',
      createdAt: '2026-11-21T10:00:00.000Z',
    },
  ];

  const roster = buildDailyRoster(employees, records, leaves, '2026-11-22');
  assert.deepEqual(
    roster.map((r) => r.effectiveStatus),
    ['hadir', 'terlambat', 'izin', 'belum_absen']
  );

  const summary = computeDailySummary(employees, records, leaves, '2026-11-22');
  assert.deepEqual(summary, {
    totalEmployees: 4,
    presentCount: 2,
    onTimeCount: 1,
    lateCount: 1,
    leaveCount: 1,
    absentCount: 1,
    attendanceRatePercent: 50,
  });
});

test('buildAttendanceCsv escapes commas and quotes properly', () => {
  const employeesById = new Map<string, Employee>([
    [
      'e1',
      {
        id: 'e1',
        nik: 'EMP-001',
        name: 'Budi, Santoso',
        role: 'Dev',
        department: 'Engineering',
        email: 'b@x.id',
        joinedDate: '2025-01-10',
      },
    ],
  ]);
  const csv = buildAttendanceCsv(
    [
      {
        id: 'att-1',
        employeeId: 'e1',
        date: '2026-11-22',
        clockIn: '2026-11-22T00:55:00.000Z',
        clockOut: '2026-11-22T10:00:00.000Z',
        workMode: 'WFO',
        status: 'hadir',
        lateMinutes: 0,
        workDurationMinutes: 545,
        notes: 'Rapat "Sprint"',
      },
    ],
    employeesById
  );
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes('"Budi, Santoso"'));
  assert.ok(lines[1].includes('"Rapat ""Sprint"""'));
});

import type {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  ShiftSettings,
} from '../types/attendance.ts';
import { getJakartaDateString } from './attendanceRules.ts';

export interface StoreData {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  settings: ShiftSettings;
}

export function shiftJakartaDate(baseDateStr: string, offsetDays: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

export function wibToUtcIso(dateStr: string, hhmm: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh - 7, mm, 0));
  return dt.toISOString();
}

export function createSeedData(): StoreData {
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
      avatarUrl: './src/assets/images/avatar_budi_1795356788754.jpg',
      joinedDate: '2023-03-14',
    },
    {
      id: 'emp-2',
      nik: 'EMP-002',
      name: 'Siti Rahma',
      role: 'People Operations Lead',
      department: 'Human Resources',
      email: 'siti.rahma@presensiku.id',
      avatarUrl: './src/assets/images/avatar_siti_1795356788833.jpg',
      joinedDate: '2022-08-01',
    },
    {
      id: 'emp-3',
      nik: 'EMP-003',
      name: 'Andi Pratama',
      role: 'Product Designer',
      department: 'Design',
      email: 'andi.pratama@presensiku.id',
      avatarUrl: './src/assets/images/avatar_andi_1795356788704.jpg',
      joinedDate: '2024-01-15',
    },
    {
      id: 'emp-4',
      nik: 'EMP-004',
      name: 'Ratna Dewi',
      role: 'Finance & Payroll Lead',
      department: 'Finance',
      email: 'ratna.dewi@presensiku.id',
      avatarUrl: './src/assets/images/avatar_ratna_1795356788160.jpg',
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

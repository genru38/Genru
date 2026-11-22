export type WorkMode = 'WFO' | 'WFH' | 'Dinas Luar';

export type AttendanceStatus = 'hadir' | 'terlambat';

export type LeaveType = 'Sakit' | 'Izin' | 'Cuti Tahunan';

export type LeaveStatus = 'menunggu' | 'disetujui' | 'ditolak';

export interface Employee {
  id: string;
  nik: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatarUrl?: string;
  joinedDate: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD in local/Jakarta calendar
  clockIn: string; // ISO string
  clockOut: string | null; // ISO string
  workMode: WorkMode;
  status: AttendanceStatus;
  lateMinutes: number;
  workDurationMinutes: number | null;
  notes: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  reviewedAt?: string;
}

export interface ShiftSettings {
  companyName: string;
  officeLocation: string;
  shiftName: string;
  shiftStart: string; // HH:MM
  shiftEnd: string; // HH:MM
  toleranceMinutes: number;
}

export interface BootstrapPayload {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  settings: ShiftSettings;
  todayDate: string;
}

export type ActiveTab = 'dashboard' | 'history' | 'leaves' | 'employees' | 'settings';

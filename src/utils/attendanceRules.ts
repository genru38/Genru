import type {
  AttendanceRecord,
  AttendanceStatus,
  Employee,
  LeaveRequest,
} from '../types/attendance';

export interface DailyEmployeeRow {
  employee: Employee;
  record: AttendanceRecord | null;
  approvedLeave: LeaveRequest | null;
  effectiveStatus: 'hadir' | 'terlambat' | 'izin' | 'belum_absen';
}

export interface DailySummary {
  totalEmployees: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  attendanceRatePercent: number;
}

export function parseHHMMToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) {
    throw new Error(`Format jam tidak valid: ${hhmm}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Jam di luar rentang 00:00-23:59: ${hhmm}`);
  }
  return hours * 60 + minutes;
}

export function evaluateClockInStatus(
  clockInDate: Date,
  shiftStartHHMM: string,
  toleranceMinutes: number,
  timeZoneOffsetMinutes = 420 // Default WIB (UTC+7) when evaluating deterministic ISO timestamps
): { status: AttendanceStatus; lateMinutes: number } {
  const utcMinutes = clockInDate.getUTCHours() * 60 + clockInDate.getUTCMinutes();
  const localMinutes = ((utcMinutes + timeZoneOffsetMinutes) % 1440 + 1440) % 1440;
  const shiftStartMinutes = parseHHMMToMinutes(shiftStartHHMM);
  const diff = localMinutes - shiftStartMinutes;

  if (diff <= toleranceMinutes) {
    return { status: 'hadir', lateMinutes: 0 };
  }
  return { status: 'terlambat', lateMinutes: diff };
}

export function calculateWorkDurationMinutes(clockInIso: string, clockOutIso: string): number {
  const start = new Date(clockInIso).getTime();
  const end = new Date(clockOutIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }
  return Math.round((end - start) / 60000);
}

export function formatDurationId(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes < 0) {
    return '—';
  }
  if (minutes === 0) {
    return '< 1m';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hrs}j`;
  }
  return `${hrs}j ${mins}m`;
}

export function formatTimeWIB(isoString: string | null | undefined): string {
  if (!isoString) {
    return '—';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  })
    .format(date)
    .replace(/\./g, ':');
}

export function formatDateId(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

export function getJakartaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
  return formatter.format(date);
}

export function isDateWithinRange(targetDate: string, startDate: string, endDate: string): boolean {
  return targetDate >= startDate && targetDate <= endDate;
}

export function buildDailyRoster(
  employees: Employee[],
  records: AttendanceRecord[],
  leaves: LeaveRequest[],
  targetDate: string
): DailyEmployeeRow[] {
  const recordsByEmp = new Map<string, AttendanceRecord>();
  for (const rec of records) {
    if (rec.date === targetDate) {
      recordsByEmp.set(rec.employeeId, rec);
    }
  }

  const leaveByEmp = new Map<string, LeaveRequest>();
  for (const leave of leaves) {
    if (
      leave.status === 'disetujui' &&
      isDateWithinRange(targetDate, leave.startDate, leave.endDate)
    ) {
      leaveByEmp.set(leave.employeeId, leave);
    }
  }

  return employees.map((employee) => {
    const record = recordsByEmp.get(employee.id) ?? null;
    const approvedLeave = leaveByEmp.get(employee.id) ?? null;
    let effectiveStatus: DailyEmployeeRow['effectiveStatus'] = 'belum_absen';
    if (record) {
      effectiveStatus = record.status;
    } else if (approvedLeave) {
      effectiveStatus = 'izin';
    }
    return {
      employee,
      record,
      approvedLeave,
      effectiveStatus,
    };
  });
}

export function computeDailySummary(
  employees: Employee[],
  records: AttendanceRecord[],
  leaves: LeaveRequest[],
  targetDate: string
): DailySummary {
  const roster = buildDailyRoster(employees, records, leaves, targetDate);
  const totalEmployees = roster.length;
  let onTimeCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let absentCount = 0;

  for (const row of roster) {
    if (row.effectiveStatus === 'hadir') onTimeCount += 1;
    else if (row.effectiveStatus === 'terlambat') lateCount += 1;
    else if (row.effectiveStatus === 'izin') leaveCount += 1;
    else absentCount += 1;
  }

  const presentCount = onTimeCount + lateCount;
  const attendanceRatePercent =
    totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  return {
    totalEmployees,
    presentCount,
    onTimeCount,
    lateCount,
    leaveCount,
    absentCount,
    attendanceRatePercent,
  };
}

export function validateLeaveRequest(input: {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}): string | null {
  if (!input.employeeId.trim()) {
    return 'Pilih karyawan terlebih dahulu.';
  }
  if (!['Sakit', 'Izin', 'Cuti Tahunan'].includes(input.type)) {
    return 'Jenis pengajuan tidak valid.';
  }
  if (!input.startDate || !input.endDate) {
    return 'Tanggal mulai dan tanggal selesai wajib diisi.';
  }
  if (input.endDate < input.startDate) {
    return 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
  }
  if (input.reason.trim().length < 5) {
    return 'Alasan pengajuan minimal 5 karakter.';
  }
  return null;
}

export function validateEmployeeInput(
  input: {
    nik: string;
    name: string;
    role: string;
    department: string;
    email: string;
  },
  existingNiks: string[]
): string | null {
  const nik = input.nik.trim();
  if (nik.length < 4) {
    return 'NIK minimal 4 karakter (contoh: EMP-007).';
  }
  if (existingNiks.some((item) => item.toLowerCase() === nik.toLowerCase())) {
    return `NIK "${nik}" sudah terdaftar.`;
  }
  if (input.name.trim().length < 2) {
    return 'Nama lengkap karyawan wajib diisi.';
  }
  if (input.role.trim().length < 2) {
    return 'Jabatan karyawan wajib diisi.';
  }
  if (input.department.trim().length < 2) {
    return 'Departemen wajib dipilih atau diisi.';
  }
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return 'Format alamat email tidak valid.';
  }
  return null;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildAttendanceCsv(
  records: AttendanceRecord[],
  employeesById: Map<string, Employee>
): string {
  const headers = [
    'Tanggal',
    'NIK',
    'Nama Karyawan',
    'Departemen',
    'Mode Kerja',
    'Jam Masuk (WIB)',
    'Jam Pulang (WIB)',
    'Status',
    'Terlambat (Menit)',
    'Durasi Kerja',
    'Catatan',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const rec of records) {
    const emp = employeesById.get(rec.employeeId);
    const row = [
      rec.date,
      emp?.nik ?? '-',
      emp?.name ?? 'Karyawan Tidak Ditemukan',
      emp?.department ?? '-',
      rec.workMode,
      formatTimeWIB(rec.clockIn),
      formatTimeWIB(rec.clockOut),
      rec.status === 'hadir' ? 'Tepat Waktu' : 'Terlambat',
      String(rec.lateMinutes),
      formatDurationId(rec.workDurationMinutes),
      rec.notes || '',
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }

  return lines.join('\n');
}

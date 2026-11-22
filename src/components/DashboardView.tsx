import { useEffect, useMemo, useState } from 'react';
import { Clock, LogIn, LogOut, MapPin, Search } from 'lucide-react';
import type {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  ShiftSettings,
  WorkMode,
} from '../types/attendance';
import {
  buildDailyRoster,
  computeDailySummary,
  formatDateId,
  formatDurationId,
  formatTimeWIB,
  type DailyEmployeeRow,
} from '../utils/attendanceRules';
import { Avatar } from './Avatar';

interface DashboardViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  settings: ShiftSettings;
  todayDate: string;
  activeEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
  onClockIn: (payload: { employeeId: string; workMode: WorkMode; notes: string }) => Promise<void>;
  onClockOut: (payload: { employeeId: string; notes: string }) => Promise<void>;
  submitting: boolean;
}

const WORK_MODES: WorkMode[] = ['WFO', 'WFH', 'Dinas Luar'];

type StatusFilter = 'all' | 'hadir' | 'terlambat' | 'izin' | 'belum_absen';

function renderStatusLabel(row: DailyEmployeeRow) {
  if (row.effectiveStatus === 'hadir') {
    return <span className="text-xs font-semibold text-emerald-700">Tepat Waktu</span>;
  }
  if (row.effectiveStatus === 'terlambat') {
    return (
      <span className="text-xs font-semibold text-amber-700">
        Terlambat {formatDurationId(row.record?.lateMinutes)}
      </span>
    );
  }
  if (row.effectiveStatus === 'izin') {
    return (
      <span className="text-xs font-semibold text-slate-600">
        {row.approvedLeave?.type ?? 'Izin'}
      </span>
    );
  }
  return <span className="text-xs font-medium text-slate-400">Belum Absen</span>;
}

export function DashboardView({
  employees,
  attendance,
  leaves,
  settings,
  todayDate,
  activeEmployeeId,
  onSelectEmployee,
  onClockIn,
  onClockOut,
  submitting,
}: DashboardViewProps) {
  const [now, setNow] = useState(() => new Date());
  const [workMode, setWorkMode] = useState<WorkMode>('WFO');
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const liveClockString = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    })
      .format(now)
      .replace(/\./g, ':');
  }, [now]);

  const liveDayDateString = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(now);
  }, [now]);

  const summary = useMemo(
    () => computeDailySummary(employees, attendance, leaves, todayDate),
    [employees, attendance, leaves, todayDate]
  );

  const roster = useMemo(
    () => buildDailyRoster(employees, attendance, leaves, todayDate),
    [employees, attendance, leaves, todayDate]
  );

  const activeEmployee = employees.find((e) => e.id === activeEmployeeId) ?? employees[0];
  const activeRow = roster.find((r) => r.employee.id === activeEmployee?.id) ?? null;

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department));
    return Array.from(set).sort();
  }, [employees]);

  const filteredRoster = useMemo(() => {
    return roster.filter((row) => {
      if (departmentFilter !== 'all' && row.employee.department !== departmentFilter) {
        return false;
      }
      if (statusFilter !== 'all' && row.effectiveStatus !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          row.employee.name.toLowerCase().includes(q) ||
          row.employee.nik.toLowerCase().includes(q) ||
          row.employee.role.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [roster, departmentFilter, statusFilter, searchQuery]);

  async function handleClockAction() {
    if (!activeEmployee || submitting) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      if (!activeRow?.record) {
        await onClockIn({
          employeeId: activeEmployee.id,
          workMode,
          notes,
        });
        setNotes('');
        setActionSuccess(`${activeEmployee.name} berhasil mencatat absen masuk (${workMode}).`);
      } else if (!activeRow.record.clockOut) {
        await onClockOut({
          employeeId: activeEmployee.id,
          notes,
        });
        setNotes('');
        setActionSuccess(`${activeEmployee.name} berhasil mencatat absen pulang.`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan presensi.');
    }
  }

  const waitingEmployees = roster.filter(
    (r) => r.effectiveStatus === 'belum_absen' || r.effectiveStatus === 'izin'
  );

  return (
    <div className="space-y-6">
      {/* 4-column summary strip */}
      <section aria-label="Ringkasan kehadiran hari ini">
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Hadir Hari Ini</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {summary.presentCount}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                dari {summary.totalEmployees} karyawan ({summary.attendanceRatePercent}%)
              </span>
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Tepat Waktu</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                {summary.onTimeCount}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                sebelum {settings.shiftStart} +{settings.toleranceMinutes}m
              </span>
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Terlambat</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold text-amber-700 tabular-nums">
                {summary.lateCount}
              </span>
              <span className="text-xs text-slate-500">melewati toleransi</span>
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Izin &amp; Belum Absen</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {summary.leaveCount + summary.absentCount}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {summary.leaveCount} izin · {summary.absentCount} belum absen
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Workspace Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Primary Clock-In / Clock-Out Terminal */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <p className="text-xs font-medium text-slate-500">{liveDayDateString}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    data-testid="live-clock"
                    className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 tabular-nums"
                  >
                    {liveClockString}
                  </span>
                  <span className="text-xs font-medium text-slate-500">WIB</span>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
                <p className="font-medium text-slate-900">{settings.shiftName}</p>
                <p className="font-mono tabular-nums text-slate-500">
                  {settings.shiftStart} – {settings.shiftEnd} WIB · Toleransi {settings.toleranceMinutes}m
                </p>
                <p className="inline-flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{settings.officeLocation}</span>
                </p>
              </div>
            </div>

            {activeEmployee && (
              <div className="py-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      name={activeEmployee.name}
                      avatarUrl={activeEmployee.avatarUrl}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-semibold text-slate-900 truncate">
                        {activeEmployee.name}
                      </h2>
                      <p className="text-xs text-slate-500 truncate">
                        <span className="font-mono">{activeEmployee.nik}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{activeEmployee.role}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{activeEmployee.department}</span>
                      </p>
                    </div>
                  </div>

                  {activeRow && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Status Hari Ini</p>
                      <div className="mt-0.5">{renderStatusLabel(activeRow)}</div>
                    </div>
                  )}
                </div>

                {activeRow?.approvedLeave && !activeRow.record ? (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">
                      Sedang dalam masa {activeRow.approvedLeave.type}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateId(activeRow.approvedLeave.startDate)} –{' '}
                      {formatDateId(activeRow.approvedLeave.endDate)} · {activeRow.approvedLeave.reason}
                    </p>
                  </div>
                ) : activeRow?.record?.clockOut ? (
                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500">Jam Masuk</p>
                      <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatTimeWIB(activeRow.record.clockIn)} WIB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Jam Pulang</p>
                      <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatTimeWIB(activeRow.record.clockOut)} WIB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Durasi</p>
                      <p className="mt-1 font-mono text-base font-semibold text-emerald-700 tabular-nums">
                        {formatDurationId(activeRow.record.workDurationMinutes)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!activeRow?.record && (
                      <div>
                        <span className="block text-xs font-medium text-slate-700 mb-2">
                          Mode Kehadiran
                        </span>
                        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                          {WORK_MODES.map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setWorkMode(mode)}
                              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1E40AF] ${
                                workMode === mode
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeRow?.record && (
                      <div className="flex items-center justify-between py-3 border-y border-slate-200 text-sm">
                        <span className="text-slate-600">
                          Sudah absen masuk pukul{' '}
                          <strong className="font-mono text-slate-900 tabular-nums">
                            {formatTimeWIB(activeRow.record.clockIn)} WIB
                          </strong>
                        </span>
                        <span className="text-xs text-slate-500">
                          Mode: {activeRow.record.workMode}
                        </span>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="attendance-notes"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Catatan Kehadiran (opsional)
                      </label>
                      <input
                        id="attendance-notes"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={
                          activeRow?.record
                            ? 'Ringkasan pekerjaan atau catatan pulang...'
                            : 'Contoh: Hadir di lantai 3 / Bekerja dari rumah...'
                        }
                        maxLength={200}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {actionError && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {actionError}
              </p>
            )}
            {actionSuccess && (
              <p role="status" className="text-xs font-medium text-emerald-700">
                {actionSuccess}
              </p>
            )}

            {activeEmployee && !activeRow?.approvedLeave && !activeRow?.record?.clockOut && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleClockAction}
                className={`w-full inline-flex items-center justify-center gap-2.5 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-colors whitespace-nowrap disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  activeRow?.record
                    ? 'bg-slate-900 hover:bg-slate-800 focus-visible:outline-slate-900'
                    : 'bg-[#1E40AF] hover:bg-[#1E3A8A] focus-visible:outline-[#1E40AF]'
                }`}
              >
                {activeRow?.record ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>{submitting ? 'Menyimpan...' : 'Absen Pulang Sekarang'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>{submitting ? 'Menyimpan...' : 'Absen Masuk Sekarang'}</span>
                  </>
                )}
              </button>
            )}

            {activeRow?.record?.clockOut && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-medium text-slate-600">
                <Clock className="h-4 w-4 text-emerald-700" />
                <span>Presensi hari ini telah selesai dicatat.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Daily Breakdown & Quick Roster Check */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Distribusi Kehadiran Tim
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Proporsi status karyawan per {formatDateId(todayDate)}
            </p>

            {/* Clean proportional bar */}
            <div className="mt-5">
              <div className="h-2.5 w-full rounded-md bg-slate-100 overflow-hidden flex">
                {summary.totalEmployees > 0 && (
                  <>
                    <div
                      style={{ width: `${(summary.onTimeCount / summary.totalEmployees) * 100}%` }}
                      className="bg-emerald-600 transition-all"
                      title={`Tepat Waktu: ${summary.onTimeCount}`}
                    />
                    <div
                      style={{ width: `${(summary.lateCount / summary.totalEmployees) * 100}%` }}
                      className="bg-amber-500 transition-all"
                      title={`Terlambat: ${summary.lateCount}`}
                    />
                    <div
                      style={{ width: `${(summary.leaveCount / summary.totalEmployees) * 100}%` }}
                      className="bg-slate-400 transition-all"
                      title={`Izin/Cuti: ${summary.leaveCount}`}
                    />
                  </>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tepat Waktu</span>
                  <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                    {summary.onTimeCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Terlambat</span>
                  <span className="font-mono font-semibold text-amber-700 tabular-nums">
                    {summary.lateCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Izin / Sakit</span>
                  <span className="font-mono font-semibold text-slate-700 tabular-nums">
                    {summary.leaveCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Belum Absen</span>
                  <span className="font-mono font-semibold text-slate-500 tabular-nums">
                    {summary.absentCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-900">
                  Belum Absen / Izin Hari Ini
                </h3>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {waitingEmployees.length} orang
                </span>
              </div>

              {waitingEmployees.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  Seluruh karyawan aktif telah mencatat kehadiran hari ini.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {waitingEmployees.slice(0, 4).map((item) => (
                    <li
                      key={item.employee.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          name={item.employee.name}
                          avatarUrl={item.employee.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {item.employee.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {item.employee.department} ·{' '}
                            {item.effectiveStatus === 'izin'
                              ? item.approvedLeave?.type
                              : 'Belum absen'}
                          </p>
                        </div>
                      </div>
                      {item.effectiveStatus === 'belum_absen' && (
                        item.employee.id === activeEmployee?.id ? (
                          <span className="text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
                            Aktif
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectEmployee(item.employee.id)}
                            className="text-xs font-medium text-[#1E40AF] hover:underline whitespace-nowrap shrink-0"
                          >
                            Pilih
                          </button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Today's Live Attendance Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Kehadiran Hari Ini
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar status presensi seluruh karyawan pada {formatDateId(todayDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <label htmlFor="dashboard-search" className="sr-only">
                Cari karyawan
              </label>
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="dashboard-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau NIK..."
                className="w-48 sm:w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="dashboard-dept" className="sr-only">
                Filter departemen
              </label>
              <select
                id="dashboard-dept"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#1E40AF] focus:outline-none"
              >
                <option value="all">Semua Departemen</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'all', label: `Semua (${roster.length})` },
              { id: 'hadir', label: `Tepat Waktu (${summary.onTimeCount})` },
              { id: 'terlambat', label: `Terlambat (${summary.lateCount})` },
              { id: 'izin', label: `Izin (${summary.leaveCount})` },
              { id: 'belum_absen', label: `Belum Absen (${summary.absentCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Karyawan</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Masuk</th>
                <th className="py-3 px-4">Pulang</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                    Tidak ada karyawan yang sesuai dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((row) => (
                  <tr
                    key={row.employee.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={row.employee.name}
                          avatarUrl={row.employee.avatarUrl}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {row.employee.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            <span className="font-mono">{row.employee.nik}</span> · {row.employee.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {row.employee.department}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {row.record?.workMode ?? '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-900 tabular-nums">
                      {row.record ? formatTimeWIB(row.record.clockIn) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-900 tabular-nums">
                      {row.record?.clockOut ? formatTimeWIB(row.record.clockOut) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                      {formatDurationId(row.record?.workDurationMinutes)}
                    </td>
                    <td className="py-3 px-5 text-right">{renderStatusLabel(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

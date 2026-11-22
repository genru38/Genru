import { useMemo, useState } from 'react';
import { CalendarPlus, Search, X } from 'lucide-react';
import type { AttendanceRecord, Employee, WorkMode } from '../types/attendance';
import { formatDateId, formatDurationId, formatTimeWIB } from '../utils/attendanceRules';
import { Avatar } from './Avatar';

interface HistoryViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  todayDate: string;
  onSaveManualAttendance: (payload: {
    employeeId: string;
    date: string;
    clockInHHMM: string;
    clockOutHHMM?: string;
    workMode: WorkMode;
    notes: string;
  }) => Promise<void>;
}

export function HistoryView({
  employees,
  attendance,
  todayDate,
  onSaveManualAttendance,
}: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'hadir' | 'terlambat'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [manualEmpId, setManualEmpId] = useState(employees[0]?.id ?? '');
  const [manualDate, setManualDate] = useState(todayDate);
  const [manualClockIn, setManualClockIn] = useState('08:00');
  const [manualClockOut, setManualClockOut] = useState('17:00');
  const [manualWorkMode, setManualWorkMode] = useState<WorkMode>('WFO');
  const [manualNotes, setManualNotes] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const employeesById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const filteredRecords = useMemo(() => {
    return [...attendance]
      .sort((a, b) => b.date.localeCompare(a.date) || b.clockIn.localeCompare(a.clockIn))
      .filter((rec) => {
        if (dateFilter && rec.date !== dateFilter) return false;
        if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
        if (search.trim()) {
          const emp = employeesById.get(rec.employeeId);
          const q = search.toLowerCase();
          const hit =
            (emp?.name.toLowerCase().includes(q) ?? false) ||
            (emp?.nik.toLowerCase().includes(q) ?? false) ||
            rec.notes.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      });
  }, [attendance, dateFilter, statusFilter, search, employeesById]);

  const totals = useMemo(() => {
    let totalMinutes = 0;
    let lateCount = 0;
    for (const rec of filteredRecords) {
      if (rec.workDurationMinutes) totalMinutes += rec.workDurationMinutes;
      if (rec.status === 'terlambat') lateCount += 1;
    }
    return {
      count: filteredRecords.length,
      totalHoursLabel: formatDurationId(totalMinutes),
      lateCount,
    };
  }, [filteredRecords]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualError(null);

    if (!manualEmpId) {
      setManualError('Pilih karyawan terlebih dahulu.');
      return;
    }
    if (!manualDate) {
      setManualError('Tanggal wajib diisi.');
      return;
    }
    if (!manualClockIn) {
      setManualError('Jam masuk wajib diisi.');
      return;
    }
    if (manualClockOut && manualClockOut <= manualClockIn) {
      setManualError('Jam pulang harus lebih akhir dari jam masuk.');
      return;
    }

    setSaving(true);
    try {
      await onSaveManualAttendance({
        employeeId: manualEmpId,
        date: manualDate,
        clockInHHMM: manualClockIn,
        clockOutHHMM: manualClockOut || undefined,
        workMode: manualWorkMode,
        notes: manualNotes,
      });
      setModalOpen(false);
      setManualNotes('');
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Gagal menyimpan koreksi absensi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-slate-500">Total Catatan</span>
            <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
              {totals.count}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <div>
            <span className="text-slate-500">Akumulasi Jam Kerja</span>
            <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
              {totals.totalHoursLabel}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <div>
            <span className="text-slate-500">Keterlambatan</span>
            <p className="font-mono text-lg font-semibold text-amber-700 tabular-nums mt-0.5">
              {totals.lateCount}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setManualEmpId(employees[0]?.id ?? '');
            setManualError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors whitespace-nowrap shrink-0"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Catat Koreksi Manual</span>
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <label htmlFor="history-search" className="sr-only">
                Cari riwayat absensi
              </label>
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="history-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIK, atau catatan..."
                className="w-56 sm:w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="history-date" className="text-xs text-slate-500">
                Tanggal:
              </label>
              <input
                id="history-date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1E40AF] focus:outline-none"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-xs font-medium text-[#1E40AF] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'hadir', label: 'Tepat Waktu' },
                { id: 'terlambat', label: 'Terlambat' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Tanggal</th>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Masuk</th>
                <th className="py-3 px-4">Pulang</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    Belum ada riwayat absensi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const emp = employeesById.get(rec.employeeId);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                        {formatDateId(rec.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={emp?.name ?? 'Karyawan'}
                            avatarUrl={emp?.avatarUrl}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {emp?.name ?? 'Karyawan Dihapus'}
                            </p>
                            <p className="text-xs text-slate-500">
                              <span className="font-mono">{emp?.nik ?? '-'}</span> ·{' '}
                              {emp?.department ?? '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{rec.workMode}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-900 tabular-nums">
                        {formatTimeWIB(rec.clockIn)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-900 tabular-nums">
                        {formatTimeWIB(rec.clockOut)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {formatDurationId(rec.workDurationMinutes)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-[220px] truncate">
                        {rec.notes || '—'}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        {rec.status === 'hadir' ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Tepat Waktu
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700">
                            Terlambat {formatDurationId(rec.lateMinutes)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-attendance-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2
                id="manual-attendance-title"
                className="font-display text-base font-semibold text-slate-900"
              >
                Catat Koreksi Kehadiran
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup dialog koreksi kehadiran"
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="manual-employee"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Karyawan
                </label>
                <select
                  id="manual-employee"
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.nik})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manual-date"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Tanggal
                  </label>
                  <input
                    id="manual-date"
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-mode"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Mode Kerja
                  </label>
                  <select
                    id="manual-mode"
                    value={manualWorkMode}
                    onChange={(e) => setManualWorkMode(e.target.value as WorkMode)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
                  >
                    <option value="WFO">WFO</option>
                    <option value="WFH">WFH</option>
                    <option value="Dinas Luar">Dinas Luar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manual-in"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Jam Masuk (WIB)
                  </label>
                  <input
                    id="manual-in"
                    type="time"
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E40AF] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-out"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Jam Pulang (opsional)
                  </label>
                  <input
                    id="manual-out"
                    type="time"
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E40AF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="manual-notes"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Alasan Koreksi
                </label>
                <input
                  id="manual-notes"
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Contoh: Lupa melakukan presensi pulang"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              {manualError && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {manualError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

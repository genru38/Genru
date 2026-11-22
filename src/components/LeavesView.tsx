import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import type {
  Employee,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '../types/attendance';
import { formatDateId, validateLeaveRequest } from '../utils/attendanceRules';
import { Avatar } from './Avatar';

interface LeavesViewProps {
  employees: Employee[];
  leaves: LeaveRequest[];
  activeEmployeeId: string;
  todayDate: string;
  onCreateLeave: (payload: {
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }) => Promise<void>;
  onUpdateLeaveStatus: (id: string, status: 'disetujui' | 'ditolak') => Promise<void>;
}

const LEAVE_TYPES: LeaveType[] = ['Izin', 'Sakit', 'Cuti Tahunan'];

export function LeavesView({
  employees,
  leaves,
  activeEmployeeId,
  todayDate,
  onCreateLeave,
  onUpdateLeaveStatus,
}: LeavesViewProps) {
  const [employeeId, setEmployeeId] = useState(activeEmployeeId || employees[0]?.id || '');
  const [type, setType] = useState<LeaveType>('Izin');
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const employeesById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const filteredLeaves = useMemo(() => {
    return leaves.filter((lv) => statusFilter === 'all' || lv.status === statusFilter);
  }, [leaves, statusFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validationError = validateLeaveRequest({
      employeeId,
      type,
      startDate,
      endDate,
      reason,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onCreateLeave({ employeeId, type, startDate, endDate, reason });
      setReason('');
      setFormSuccess('Pengajuan izin berhasil dikirim dan menunggu persetujuan.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan izin.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(id: string, status: 'disetujui' | 'ditolak') {
    setProcessingId(id);
    try {
      await onUpdateLeaveStatus(id, status);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Submit Leave Form */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Ajukan Izin / Cuti Baru
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Isi rincian ketidakhadiran untuk diteruskan ke peninjau HR.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label
              htmlFor="leave-employee"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Nama Karyawan
            </label>
            <select
              id="leave-employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.nik})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="leave-type"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Jenis Pengajuan
            </label>
            <select
              id="leave-type"
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="leave-start"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Tanggal Mulai
              </label>
              <input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="leave-end"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Tanggal Selesai
              </label>
              <input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="leave-reason"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Alasan &amp; Keterangan
            </label>
            <textarea
              id="leave-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan keperluan izin, sakit, atau cuti (min. 5 karakter)..."
              maxLength={300}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p role="status" className="text-xs font-medium text-emerald-700">
              {formSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#1E40AF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3A8A] transition-colors disabled:opacity-60"
          >
            {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan'}
          </button>
        </form>
      </section>

      {/* Right: Leave Requests List */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Daftar Pengajuan Izin
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tinjau dan setujui permohonan izin atau cuti karyawan
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'menunggu', label: 'Menunggu' },
                { id: 'disetujui', label: 'Disetujui' },
                { id: 'ditolak', label: 'Ditolak' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredLeaves.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Belum ada pengajuan izin pada kategori ini.
            </div>
          ) : (
            filteredLeaves.map((leave) => {
              const emp = employeesById.get(leave.employeeId);
              const isBusy = processingId === leave.id;
              return (
                <div key={leave.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar
                      name={emp?.name ?? 'Karyawan'}
                      avatarUrl={emp?.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-slate-900">
                          {emp?.name ?? 'Karyawan'}
                        </p>
                        <span className="text-xs text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-medium text-slate-700">{leave.type}</span>
                        <span className="text-xs text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {formatDateId(leave.startDate)}
                          {leave.endDate !== leave.startDate
                            ? ` – ${formatDateId(leave.endDate)}`
                            : ''}
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        {leave.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {leave.status === 'menunggu' ? (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDecision(leave.id, 'disetujui')}
                          aria-label={`Setujui pengajuan ${emp?.name ?? ''}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDecision(leave.id, 'ditolak')}
                          aria-label={`Tolak pengajuan ${emp?.name ?? ''}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-700 transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </button>
                      </>
                    ) : leave.status === 'disetujui' ? (
                      <span className="text-xs font-semibold text-emerald-700">Disetujui</span>
                    ) : (
                      <span className="text-xs font-semibold text-red-700">Ditolak</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

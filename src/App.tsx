import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardView } from './components/DashboardView';
import { EmployeesView } from './components/EmployeesView';
import { HistoryView } from './components/HistoryView';
import { LeavesView } from './components/LeavesView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import type {
  ActiveTab,
  BootstrapPayload,
  LeaveType,
  ShiftSettings,
  WorkMode,
} from './types/attendance';
import {
  apiClockIn,
  apiClockOut,
  apiCreateEmployee,
  apiCreateLeave,
  apiDeleteEmployee,
  apiManualAttendance,
  apiSaveSettings,
  apiUpdateLeaveStatus,
  fetchBootstrap as loadBootstrapData,
} from './utils/attendanceClient';
import { buildAttendanceCsv } from './utils/attendanceRules';

export default function App() {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>('emp-3');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [submittingClock, setSubmittingClock] = useState(false);

  const fetchBootstrap = useCallback(async () => {
    try {
      setLoadError(null);
      const payload = await loadBootstrapData();
      setData(payload);
      setActiveEmployeeId((prev) => {
        if (payload.employees.some((e) => e.id === prev)) return prev;
        return payload.employees[0]?.id ?? '';
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  const pendingLeavesCount = useMemo(() => {
    if (!data) return 0;
    return data.leaves.filter((l) => l.status === 'menunggu').length;
  }, [data]);

  async function handleClockIn(payload: {
    employeeId: string;
    workMode: WorkMode;
    notes: string;
  }) {
    setSubmittingClock(true);
    try {
      await apiClockIn(payload);
      await fetchBootstrap();
    } finally {
      setSubmittingClock(false);
    }
  }

  async function handleClockOut(payload: { employeeId: string; notes: string }) {
    setSubmittingClock(true);
    try {
      await apiClockOut(payload);
      await fetchBootstrap();
    } finally {
      setSubmittingClock(false);
    }
  }

  async function handleManualAttendance(payload: {
    employeeId: string;
    date: string;
    clockInHHMM: string;
    clockOutHHMM?: string;
    workMode: WorkMode;
    notes: string;
  }) {
    await apiManualAttendance(payload);
    await fetchBootstrap();
  }

  async function handleCreateLeave(payload: {
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    await apiCreateLeave(payload);
    await fetchBootstrap();
  }

  async function handleUpdateLeaveStatus(id: string, status: 'disetujui' | 'ditolak') {
    await apiUpdateLeaveStatus(id, status);
    await fetchBootstrap();
  }

  async function handleCreateEmployee(payload: {
    nik: string;
    name: string;
    role: string;
    department: string;
    email: string;
  }) {
    const res = await apiCreateEmployee(payload);
    await fetchBootstrap();
    if (res.employee?.id) {
      setActiveEmployeeId(res.employee.id);
    }
  }

  async function handleDeleteEmployee(id: string) {
    await apiDeleteEmployee(id);
    await fetchBootstrap();
  }

  async function handleSaveSettings(next: ShiftSettings) {
    await apiSaveSettings(next);
    await fetchBootstrap();
  }

  function handleExportCsv() {
    if (!data) return;
    const employeesById = new Map(data.employees.map((e) => [e.id, e]));
    const csv = buildAttendanceCsv(data.attendance, employeesById);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-absensi-${data.todayDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <div className="hidden lg:block w-64 bg-white border-r border-slate-200 p-5 space-y-4">
          <div className="h-6 w-28 bg-slate-200 rounded" />
          <div className="space-y-2 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8 space-y-6">
          <div className="h-10 w-64 bg-slate-200 rounded" />
          <div className="h-28 bg-white border border-slate-200 rounded-xl" />
          <div className="h-72 bg-white border border-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <h1 className="font-display text-lg font-semibold text-slate-900">
            Gagal Memuat Data Absensi
          </h1>
          <p className="text-sm text-slate-600">{loadError || 'Terjadi kesalahan koneksi.'}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchBootstrap();
            }}
            className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A]"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        employees={data.employees}
        activeEmployeeId={activeEmployeeId}
        onSelectEmployee={setActiveEmployeeId}
        pendingLeavesCount={pendingLeavesCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          companyName={data.settings.companyName}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onExportCsv={handleExportCsv}
          onOpenAddEmployee={() => setAddEmployeeModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-[1280px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              employees={data.employees}
              attendance={data.attendance}
              leaves={data.leaves}
              settings={data.settings}
              todayDate={data.todayDate}
              activeEmployeeId={activeEmployeeId}
              onSelectEmployee={setActiveEmployeeId}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              submitting={submittingClock}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              employees={data.employees}
              attendance={data.attendance}
              todayDate={data.todayDate}
              onSaveManualAttendance={handleManualAttendance}
            />
          )}

          {activeTab === 'leaves' && (
            <LeavesView
              employees={data.employees}
              leaves={data.leaves}
              activeEmployeeId={activeEmployeeId}
              todayDate={data.todayDate}
              onCreateLeave={handleCreateLeave}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={data.employees}
              addModalOpen={addEmployeeModalOpen}
              onOpenAddModal={() => setAddEmployeeModalOpen(true)}
              onCloseAddModal={() => setAddEmployeeModalOpen(false)}
              onCreateEmployee={handleCreateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={data.settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
}

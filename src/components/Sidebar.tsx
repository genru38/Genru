import {
  CalendarClock,
  ClipboardList,
  FileCheck2,
  Settings,
  Users,
  X,
} from 'lucide-react';
import type { ActiveTab, Employee } from '../types/attendance';
import { Avatar } from './Avatar';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  employees: Employee[];
  activeEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
  pendingLeavesCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: typeof CalendarClock }> = [
  { id: 'dashboard', label: 'Beranda Absensi', icon: CalendarClock },
  { id: 'history', label: 'Riwayat Kehadiran', icon: ClipboardList },
  { id: 'leaves', label: 'Pengajuan Izin', icon: FileCheck2 },
  { id: 'employees', label: 'Direktori Karyawan', icon: Users },
  { id: 'settings', label: 'Pengaturan Shift', icon: Settings },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  employees,
  activeEmployeeId,
  onSelectEmployee,
  pendingLeavesCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const activeEmployee = employees.find((e) => e.id === activeEmployeeId) ?? employees[0];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 w-64">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
        <a
          href="#beranda"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('dashboard');
            onCloseMobile();
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          PresensiKu
        </a>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu navigasi"
          className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-900 rounded-lg focus-visible:outline-2 focus-visible:outline-[#1E40AF]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Menu utama" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#1E40AF] ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'leaves' && pendingLeavesCount > 0 && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive ? 'text-slate-300' : 'text-amber-700 font-semibold'
                  }`}
                >
                  {pendingLeavesCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3 shrink-0">
        <div>
          <label
            htmlFor="active-employee-switcher"
            className="block text-xs font-medium text-slate-500 mb-1.5"
          >
            Simulasi Akun Karyawan
          </label>
          <select
            id="active-employee-switcher"
            value={activeEmployeeId}
            onChange={(e) => onSelectEmployee(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#1E40AF] focus:bg-white focus:outline-none"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.nik})
              </option>
            ))}
          </select>
        </div>

        {activeEmployee && (
          <div className="flex items-center gap-3 pt-1">
            <Avatar name={activeEmployee.name} avatarUrl={activeEmployee.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{activeEmployee.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {activeEmployee.department}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            aria-hidden="true"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}

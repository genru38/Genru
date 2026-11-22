import { Download, Menu, UserPlus } from 'lucide-react';
import type { ActiveTab } from '../types/attendance';

interface TopBarProps {
  activeTab: ActiveTab;
  companyName: string;
  onOpenMobileMenu: () => void;
  onExportCsv: () => void;
  onOpenAddEmployee: () => void;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Beranda Absensi',
  history: 'Riwayat Kehadiran',
  leaves: 'Pengajuan Izin & Cuti',
  employees: 'Direktori Karyawan',
  settings: 'Pengaturan Shift',
};

export function TopBar({
  activeTab,
  companyName,
  onOpenMobileMenu,
  onExportCsv,
  onOpenAddEmployee,
}: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-6 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg focus-visible:outline-2 focus-visible:outline-[#1E40AF]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-500 truncate hidden sm:inline">{companyName}</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {TAB_TITLES[activeTab]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {activeTab === 'employees' ? (
          <button
            type="button"
            onClick={onOpenAddEmployee}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Karyawan</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </button>
        )}
      </div>
    </header>
  );
}

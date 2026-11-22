import { useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import type { Employee } from '../types/attendance';
import { formatDateId, validateEmployeeInput } from '../utils/attendanceRules';
import { Avatar } from './Avatar';

interface EmployeesViewProps {
  employees: Employee[];
  addModalOpen: boolean;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  onCreateEmployee: (payload: {
    nik: string;
    name: string;
    role: string;
    department: string;
    email: string;
  }) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Design',
  'Finance',
  'Operations',
  'Marketing',
];

export function EmployeesView({
  employees,
  addModalOpen,
  onOpenAddModal,
  onCloseAddModal,
  onCreateEmployee,
  onDeleteEmployee,
}: EmployeesViewProps) {
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [nik, setNik] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.nik.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
    );
  }, [employees, search]);

  function resetForm() {
    setNik('');
    setName('');
    setRole('');
    setDepartment('Engineering');
    setEmail('');
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const validationError = validateEmployeeInput(
      { nik, name, role, department, email },
      employees.map((item) => item.nik)
    );
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    try {
      await onCreateEmployee({ nik, name, role, department, email });
      resetForm();
      onCloseAddModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambah karyawan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await onDeleteEmployee(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus karyawan.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Direktori Karyawan Aktif
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Total {employees.length} karyawan terdaftar dalam sistem presensi
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <label htmlFor="employee-search" className="sr-only">
                Cari karyawan
              </label>
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="employee-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIK, jabatan..."
                className="w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {deleteError && (
          <p role="alert" className="px-5 py-3 text-xs font-medium text-red-700 bg-red-50 border-b border-red-100">
            {deleteError}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-3 px-5">NIK</th>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Bergabung</th>
                <th className="py-3 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                    Tidak ada karyawan yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {emp.nik}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} avatarUrl={emp.avatarUrl} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{emp.department}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{emp.email}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDateId(emp.joinedDate)}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      {confirmDeleteId === emp.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(emp.id)}
                            className="text-xs font-semibold text-red-700 hover:underline"
                          >
                            Konfirmasi Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-slate-500 hover:text-slate-900"
                          >
                            Batal
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(emp.id)}
                          aria-label={`Hapus ${emp.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-employee-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2
                id="add-employee-title"
                className="font-display text-base font-semibold text-slate-900"
              >
                Tambah Karyawan Baru
              </h2>
              <button
                type="button"
                onClick={onCloseAddModal}
                aria-label="Tutup dialog tambah karyawan"
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="emp-nik"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    NIK Karyawan
                  </label>
                  <input
                    id="emp-nik"
                    type="text"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="EMP-007"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="emp-dept"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Departemen
                  </label>
                  <select
                    id="emp-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="emp-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Nama Lengkap
                </label>
                <input
                  id="emp-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Raka Mahendra"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="emp-role"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Jabatan
                </label>
                <input
                  id="emp-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Contoh: QA Automation Engineer"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="emp-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Email Kerja (opsional)
                </label>
                <input
                  id="emp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@presensiku.id"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseAddModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

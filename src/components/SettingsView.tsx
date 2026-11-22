import { useEffect, useState } from 'react';
import type { ShiftSettings } from '../types/attendance';

interface SettingsViewProps {
  settings: ShiftSettings;
  onSaveSettings: (next: ShiftSettings) => Promise<void>;
}

export function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [form, setForm] = useState<ShiftSettings>(settings);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);

    if (!form.companyName.trim() || !form.shiftName.trim()) {
      setError('Nama perusahaan dan nama shift wajib diisi.');
      return;
    }
    if (form.shiftEnd <= form.shiftStart) {
      setError('Jam pulang harus lebih akhir dari jam masuk.');
      return;
    }

    setSaving(true);
    try {
      await onSaveSettings(form);
      setSavedMsg('Pengaturan shift berhasil diperbarui dan diterapkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Aturan Jam Kerja &amp; Lokasi Kantor
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Perubahan jam masuk dan toleransi akan langsung memengaruhi evaluasi status absensi masuk berikutnya.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="set-company"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Nama Perusahaan
            </label>
            <input
              id="set-company"
              type="text"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="set-location"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Lokasi Kantor Utama
            </label>
            <input
              id="set-location"
              type="text"
              value={form.officeLocation}
              onChange={(e) => setForm((f) => ({ ...f, officeLocation: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="set-shift-name"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Nama Shift Aktif
            </label>
            <input
              id="set-shift-name"
              type="text"
              value={form.shiftName}
              onChange={(e) => setForm((f) => ({ ...f, shiftName: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="set-start"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Jam Masuk (WIB)
              </label>
              <input
                id="set-start"
                type="time"
                value={form.shiftStart}
                onChange={(e) => setForm((f) => ({ ...f, shiftStart: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="set-end"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Jam Pulang (WIB)
              </label>
              <input
                id="set-end"
                type="time"
                value={form.shiftEnd}
                onChange={(e) => setForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="set-tolerance"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Toleransi Terlambat (Menit)
              </label>
              <input
                id="set-tolerance"
                type="number"
                min={0}
                max={120}
                value={form.toleranceMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, toleranceMinutes: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {error}
            </p>
          )}
          {savedMsg && (
            <p role="status" className="text-xs font-medium text-emerald-700">
              {savedMsg}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#1E40AF] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Shift'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

# PresensiKu — Sistem Absensi Karyawan

Aplikasi manajemen absensi karyawan dengan pencatatan jam masuk/pulang real-time (WIB), pengajuan izin & cuti, direktori karyawan, pengaturan shift, dan ekspor laporan CSV.

## Menjalankan Secara Lokal (Full-Stack)

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Data tersimpan otomatis di `data/attendance-store.json`.

## Deploy ke GitHub Pages / Hosting Statis

Proyek ini sudah dikonfigurasi dengan `base: './'` dan mode penyimpanan browser (`localStorage`) otomatis apabila server backend tidak tersedia (misalnya di GitHub Pages pada subpath seperti `https://domain-anda.com/absen/`).

### Opsi 1: Otomatis via GitHub Actions (Disarankan)
1. Push seluruh isi proyek ini ke branch `main` repository GitHub Anda.
2. Buka **Settings -> Pages** pada repository GitHub.
3. Pada bagian **Build and deployment -> Source**, pilih **GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` akan otomatis menjalankan `npm run build` dan men-deploy folder `dist/`.

### Opsi 2: Upload Manual (cPanel / Hosting Statis)
Jangan upload file `index.html` sumber secara langsung. Jalankan build terlebih dahulu:
```bash
npm install
npm run build
```
Lalu upload **seluruh isi folder `dist/`** ke direktori tujuan (misalnya `public_html/absen/`).

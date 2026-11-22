import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  clockInEmployee,
  clockOutEmployee,
  createEmployee,
  createLeaveRequest,
  createManualAttendance,
  deleteEmployee,
  getBootstrapData,
  updateLeaveStatus,
  updateSettings,
} from './src/server/store.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/bootstrap', (_req, res) => {
    try {
      res.json(getBootstrapData());
    } catch (err) {
      console.error('Bootstrap error:', err);
      res.status(500).json({ error: 'Gagal memuat data absensi.' });
    }
  });

  app.post('/api/attendance/clock-in', (req, res) => {
    const { employeeId, workMode, notes } = req.body ?? {};
    const result = clockInEmployee({ employeeId, workMode, notes });
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.status(201).json({ record: result.record });
  });

  app.post('/api/attendance/clock-out', (req, res) => {
    const { employeeId, notes } = req.body ?? {};
    const result = clockOutEmployee({ employeeId, notes });
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.json({ record: result.record });
  });

  app.post('/api/attendance/manual', (req, res) => {
    const { employeeId, date, clockInHHMM, clockOutHHMM, workMode, notes } = req.body ?? {};
    const result = createManualAttendance({
      employeeId,
      date,
      clockInHHMM,
      clockOutHHMM,
      workMode,
      notes,
    });
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.status(201).json({ record: result.record });
  });

  app.post('/api/leaves', (req, res) => {
    const { employeeId, type, startDate, endDate, reason } = req.body ?? {};
    const result = createLeaveRequest({ employeeId, type, startDate, endDate, reason });
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.status(201).json({ leave: result.leave });
  });

  app.patch('/api/leaves/:id', (req, res) => {
    const { status } = req.body ?? {};
    const result = updateLeaveStatus(req.params.id, status);
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.json({ leave: result.leave });
  });

  app.post('/api/employees', (req, res) => {
    const { nik, name, role, department, email } = req.body ?? {};
    const result = createEmployee({ nik, name, role, department, email });
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.status(201).json({ employee: result.employee });
  });

  app.delete('/api/employees/:id', (req, res) => {
    const result = deleteEmployee(req.params.id);
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.json({ deletedId: result.deletedId });
  });

  app.put('/api/settings', (req, res) => {
    const result = updateSettings(req.body ?? {});
    if (result.error) {
      res.status(result.statusCode ?? 400).json({ error: result.error });
      return;
    }
    res.json({ settings: result.settings });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PresensiKu server listening on http://localhost:${PORT}`);
  });
}

startServer();

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import Middleware
import { authMiddleware, requireRole } from './middleware/authMiddleware.js';

// Import Controllers
import * as authController from './controllers/authController.js';
import * as attendanceController from './controllers/attendanceController.js';
import * as requestController from './controllers/requestController.js';
import * as documentController from './controllers/documentController.js';
import * as adminController from './controllers/adminController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ==========================================
// PUBLIC ROUTES
// ==========================================
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/reset-password', authController.resetPassword);

// ==========================================
// SECURED ROUTES (Requires valid Auth token)
// ==========================================
app.use('/api', authMiddleware);

// User info details
app.get('/api/auth/me', authController.getCurrentUser);
app.post('/api/auth/update-profile', authController.updateProfile);

// Attendance
app.post('/api/attendance/check-in', attendanceController.checkIn);
app.post('/api/attendance/check-out', attendanceController.checkOut);
app.get('/api/attendance/history', attendanceController.getHistory);

// Requests
app.post('/api/requests', requestController.submitRequest);
app.get('/api/requests', requestController.getRequests);

// --- HR & Admin ---
app.put('/api/requests/:id', requireRole(['HR', 'Admin']), requestController.handleApproveReject);

// --- Accountant & Admin ---
app.get('/api/documents', requireRole(['KeToan', 'Admin']), documentController.getDocuments);
app.post('/api/documents/upload', requireRole(['KeToan', 'Admin']), documentController.uploadDocument);
app.post('/api/documents/:id/otp-request', requireRole(['KeToan', 'Admin']), documentController.requestDocumentAccess);
app.post('/api/documents/:id/download', requireRole(['KeToan', 'Admin']), documentController.downloadDocument);

// --- Super Admin Only ---
app.get('/api/admin/entities', requireRole(['Admin']), adminController.getEntities);
app.post('/api/admin/departments', requireRole(['Admin']), adminController.manageDepartments);
app.post('/api/admin/positions', requireRole(['Admin']), adminController.managePositions);

app.get('/api/admin/users', requireRole(['HR', 'Admin']), adminController.getUsers);
app.put('/api/admin/users/:employeeId', requireRole(['HR', 'Admin']), adminController.updateUserAccount);

app.post('/api/admin/manual-override', requireRole(['Admin']), adminController.manualAttendanceOverride);
app.get('/api/admin/matrix-grid', requireRole(['Admin']), adminController.getMatrixGrid);
app.get('/api/admin/export-payroll', requireRole(['Admin']), adminController.exportPayrollData);

// Logs
app.get('/api/admin/logs', adminController.getLogs);
app.post('/api/admin/logs', adminController.pushLog);



app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// For Vercel Serverless Function deployment, export app
export default app;

// Listen if run directly (useful for local dev testing)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Local dev server running on http://localhost:${PORT}`);
  });
}

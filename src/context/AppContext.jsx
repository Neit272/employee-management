import React, { createContext, useState, useEffect, useContext } from 'react';

const AppContext = createContext();

// Initialize HTML5 Broadcast Channel for cross-tab multiplayer sync
const syncChannel = new BroadcastChannel('genx_pks_hrm_sync');

const initialDepartments = ['Hành chính', 'Nhân sự', 'Kế toán', 'Kỹ thuật', 'Kinh doanh'];
const initialPositions = ['Trưởng phòng', 'Nhân viên chính thức', 'Nhân viên thử việc', 'Kế toán viên', 'Chuyên viên HR'];

const initialHistory = [
  // ============================================================
  // NV001 - Nguyễn Văn A (Nhân viên KT) — Tháng 6/2026
  // ============================================================
  { id: 101, employeeId: 'NV001', date: '2026-06-02', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:32:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 102, employeeId: 'NV001', date: '2026-06-03', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:14:00', clockOut: '17:30:00', actualHours: 8.2, status: 'Đi muộn' },
  { id: 103, employeeId: 'NV001', date: '2026-06-04', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:58:00', clockOut: '17:28:00', actualHours: 8.4, status: 'Hợp lệ' },
  { id: 104, employeeId: 'NV001', date: '2026-06-05', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:35:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 105, employeeId: 'NV001', date: '2026-06-06', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:10:00', actualHours: 8.0, status: 'Về sớm' },
  { id: 106, employeeId: 'NV001', date: '2026-06-09', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 107, employeeId: 'NV001', date: '2026-06-10', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:32:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 108, employeeId: 'NV001', date: '2026-06-11', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 109, employeeId: 'NV001', date: '2026-06-12', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 110, employeeId: 'NV001', date: '2026-06-13', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:02:00', clockOut: '17:30:00', actualHours: 8.4, status: 'Hợp lệ' },
  { id: 111, employeeId: 'NV001', date: '2026-06-16', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 112, employeeId: 'NV001', date: '2026-06-17', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:20:00', clockOut: '17:30:00', actualHours: 8.1, status: 'Đi muộn' },
  { id: 113, employeeId: 'NV001', date: '2026-06-18', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 114, employeeId: 'NV001', date: '2026-06-19', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Vắng mặt' },
  { id: 115, employeeId: 'NV001', date: '2026-06-20', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:58:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 116, employeeId: 'NV001', date: '2026-06-23', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 117, employeeId: 'NV001', date: '2026-06-24', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 118, employeeId: 'NV001', date: '2026-06-25', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:35:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 119, employeeId: 'NV001', date: '2026-06-26', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:15:00', clockOut: '17:02:00', actualHours: 7.8, status: 'Đi muộn' },
  { id: 120, employeeId: 'NV001', date: '2026-06-27', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Vắng mặt' },
  { id: 121, employeeId: 'NV001', date: '2026-06-28', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 122, employeeId: 'NV001', date: '2026-06-30', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },

  // ============================================================
  // NV002 - Trần Thị B (Kế toán) — Tháng 6/2026
  // ============================================================
  { id: 201, employeeId: 'NV002', date: '2026-06-02', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 202, employeeId: 'NV002', date: '2026-06-03', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 203, employeeId: 'NV002', date: '2026-06-04', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 204, employeeId: 'NV002', date: '2026-06-05', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:05:00', clockOut: '17:28:00', actualHours: 8.3, status: 'Hợp lệ' },
  { id: 205, employeeId: 'NV002', date: '2026-06-06', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 206, employeeId: 'NV002', date: '2026-06-09', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:18:00', clockOut: '17:30:00', actualHours: 8.2, status: 'Đi muộn' },
  { id: 207, employeeId: 'NV002', date: '2026-06-10', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 208, employeeId: 'NV002', date: '2026-06-11', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 209, employeeId: 'NV002', date: '2026-06-12', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:15:00', actualHours: 8.2, status: 'Về sớm' },
  { id: 210, employeeId: 'NV002', date: '2026-06-13', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 211, employeeId: 'NV002', date: '2026-06-16', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 212, employeeId: 'NV002', date: '2026-06-17', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 213, employeeId: 'NV002', date: '2026-06-18', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 214, employeeId: 'NV002', date: '2026-06-19', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 215, employeeId: 'NV002', date: '2026-06-20', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 216, employeeId: 'NV002', date: '2026-06-23', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 217, employeeId: 'NV002', date: '2026-06-24', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 218, employeeId: 'NV002', date: '2026-06-25', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:32:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 219, employeeId: 'NV002', date: '2026-06-26', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 220, employeeId: 'NV002', date: '2026-06-27', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:10:00', clockOut: '17:30:00', actualHours: 8.3, status: 'Hợp lệ' },
  { id: 221, employeeId: 'NV002', date: '2026-06-28', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 222, employeeId: 'NV002', date: '2026-06-30', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },

  // ============================================================
  // NV003 - Lê Văn C (HR) — Tháng 6/2026
  // ============================================================
  { id: 301, employeeId: 'NV003', date: '2026-06-02', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:58:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 302, employeeId: 'NV003', date: '2026-06-03', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 303, employeeId: 'NV003', date: '2026-06-04', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:22:00', clockOut: '17:30:00', actualHours: 8.0, status: 'Đi muộn' },
  { id: 304, employeeId: 'NV003', date: '2026-06-05', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 305, employeeId: 'NV003', date: '2026-06-06', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 306, employeeId: 'NV003', date: '2026-06-09', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 307, employeeId: 'NV003', date: '2026-06-10', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Vắng mặt' },
  { id: 308, employeeId: 'NV003', date: '2026-06-11', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 309, employeeId: 'NV003', date: '2026-06-12', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 310, employeeId: 'NV003', date: '2026-06-13', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:00:00', actualHours: 8.0, status: 'Về sớm' },
  { id: 311, employeeId: 'NV003', date: '2026-06-16', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 312, employeeId: 'NV003', date: '2026-06-17', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 313, employeeId: 'NV003', date: '2026-06-18', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 314, employeeId: 'NV003', date: '2026-06-19', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 315, employeeId: 'NV003', date: '2026-06-20', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 316, employeeId: 'NV003', date: '2026-06-23', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 317, employeeId: 'NV003', date: '2026-06-24', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 318, employeeId: 'NV003', date: '2026-06-25', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 319, employeeId: 'NV003', date: '2026-06-26', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:17:00', clockOut: '17:30:00', actualHours: 8.1, status: 'Đi muộn' },
  { id: 320, employeeId: 'NV003', date: '2026-06-27', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 321, employeeId: 'NV003', date: '2026-06-28', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 322, employeeId: 'NV003', date: '2026-06-30', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },

  // ============================================================
  // NV000 - Phạm Văn D (Admin) — Tháng 6/2026
  // ============================================================
  { id: 401, employeeId: 'NV000', date: '2026-06-02', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:45:00', clockOut: '18:00:00', actualHours: 9.0, status: 'Hợp lệ' },
  { id: 402, employeeId: 'NV000', date: '2026-06-03', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:45:00', actualHours: 8.8, status: 'Hợp lệ' },
  { id: 403, employeeId: 'NV000', date: '2026-06-04', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 404, employeeId: 'NV000', date: '2026-06-05', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 405, employeeId: 'NV000', date: '2026-06-06', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 406, employeeId: 'NV000', date: '2026-06-09', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 407, employeeId: 'NV000', date: '2026-06-10', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 408, employeeId: 'NV000', date: '2026-06-11', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 409, employeeId: 'NV000', date: '2026-06-12', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 410, employeeId: 'NV000', date: '2026-06-13', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 411, employeeId: 'NV000', date: '2026-06-16', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 412, employeeId: 'NV000', date: '2026-06-17', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 413, employeeId: 'NV000', date: '2026-06-18', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 414, employeeId: 'NV000', date: '2026-06-19', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 415, employeeId: 'NV000', date: '2026-06-20', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 416, employeeId: 'NV000', date: '2026-06-23', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 417, employeeId: 'NV000', date: '2026-06-24', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 418, employeeId: 'NV000', date: '2026-06-25', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 419, employeeId: 'NV000', date: '2026-06-26', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 420, employeeId: 'NV000', date: '2026-06-27', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 421, employeeId: 'NV000', date: '2026-06-28', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 422, employeeId: 'NV000', date: '2026-06-30', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },

  // ============================================================
  // NV004 - Hoàng Văn E (Thực tập sinh) — Tháng 6/2026
  // ============================================================
  { id: 501, employeeId: 'NV005', date: '2026-06-02', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:02:00', clockOut: '17:30:00', actualHours: 8.4, status: 'Hợp lệ' },
  { id: 502, employeeId: 'NV005', date: '2026-06-03', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:25:00', clockOut: '17:30:00', actualHours: 8.0, status: 'Đi muộn' },
  { id: 503, employeeId: 'NV005', date: '2026-06-04', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 504, employeeId: 'NV005', date: '2026-06-05', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:10:00', actualHours: 8.2, status: 'Về sớm' },
  { id: 505, employeeId: 'NV005', date: '2026-06-06', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:58:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 506, employeeId: 'NV005', date: '2026-06-09', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Vắng mặt' },
  { id: 507, employeeId: 'NV005', date: '2026-06-10', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ không phép' },
  { id: 508, employeeId: 'NV005', date: '2026-06-11', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 509, employeeId: 'NV005', date: '2026-06-12', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 510, employeeId: 'NV005', date: '2026-06-13', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '08:30:00', clockOut: '17:30:00', actualHours: 7.9, status: 'Đi muộn' },
  { id: 511, employeeId: 'NV005', date: '2026-06-16', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 512, employeeId: 'NV005', date: '2026-06-17', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 513, employeeId: 'NV005', date: '2026-06-18', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 514, employeeId: 'NV005', date: '2026-06-19', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 515, employeeId: 'NV005', date: '2026-06-20', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '-', clockOut: '-', actualHours: 0, status: 'Nghỉ phép' },
  { id: 516, employeeId: 'NV005', date: '2026-06-23', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:58:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 517, employeeId: 'NV005', date: '2026-06-24', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 518, employeeId: 'NV005', date: '2026-06-25', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:52:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 519, employeeId: 'NV005', date: '2026-06-26', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:48:00', clockOut: '17:05:00', actualHours: 8.1, status: 'Về sớm' },
  { id: 520, employeeId: 'NV005', date: '2026-06-27', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
  { id: 521, employeeId: 'NV005', date: '2026-06-28', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:50:00', clockOut: '17:30:00', actualHours: 8.6, status: 'Hợp lệ' },
  { id: 522, employeeId: 'NV005', date: '2026-06-30', shift: 'Ca hành chính (08:00 - 17:30)', clockIn: '07:55:00', clockOut: '17:30:00', actualHours: 8.5, status: 'Hợp lệ' },
];

const initialRequests = [
  { id: 1, type: 'Xin nghỉ phép', fromDate: '2026-07-02', toDate: '2026-07-03', reason: 'Nghỉ khám bệnh định kỳ tại bệnh viện.', attachment: { name: 'giay_kham_benh.pdf', size: '1.2 MB' }, status: 'Approved', employeeName: 'Nguyễn Văn A', employeeId: 'NV001', submitDate: '2026-06-28' },
  { id: 2, type: 'Đăng ký tăng ca', fromDate: '2026-06-30', toDate: '2026-06-30', reason: 'Hoàn thành báo cáo tài chính quý 2.', attachment: null, status: 'Pending', employeeName: 'Trần Thị B', employeeId: 'NV002', submitDate: '2026-06-29' },
  { id: 3, type: 'Giải trình quên check-in', fromDate: '2026-06-27', toDate: '2026-06-27', reason: 'Quên bấm checkin ca sáng do vội họp khẩn.', attachment: null, status: 'Pending', employeeName: 'Nguyễn Văn A', employeeId: 'NV001', submitDate: '2026-06-28' }
];

const initialDocuments = [
  { id: 1, name: 'Hợp đồng lao động Nguyễn Văn A.pdf', employeeId: 'NV001', uploadDate: '2026-01-15 09:30', type: 'Hợp đồng lao động' },
  { id: 2, name: 'Báo cáo thuế Q1-2026.pdf', employeeId: 'NV002', uploadDate: '2026-04-10 14:15', type: 'Báo cáo tài chính' },
  { id: 3, name: 'Thỏa thuận bảo mật NDA.pdf', employeeId: 'NV001', uploadDate: '2026-01-15 10:00', type: 'Cam kết bảo mật' },
];

const presetUsers = {
  NhanVien: {
    fullName: 'Nguyễn Văn A',
    email: 'nva@genxpks.com',
    role: 'NhanVien',
    employeeId: 'NV001',
    cccd: '012345678912',
    phone: '0987654321',
    address: '123 Đường Láng, Hà Nội',
    startDate: '2025-01-15',
    department: 'Kỹ thuật',
    position: 'Nhân viên chính thức',
    gender: 'Nam',
    dob: '1998-05-20',
    isProfileComplete: true,
    contractExpiry: '2027-01-15'
  },
  KeToan: {
    fullName: 'Trần Thị B',
    email: 'ttb@genxpks.com',
    role: 'KeToan',
    employeeId: 'NV002',
    cccd: '012345678913',
    phone: '0976543210',
    address: '456 Cầu Giấy, Hà Nội',
    startDate: '2025-02-10',
    department: 'Kế toán',
    position: 'Kế toán viên',
    gender: 'Nữ',
    dob: '1996-08-15',
    isProfileComplete: true,
    contractExpiry: '2026-08-31'
  },
  HR: {
    fullName: 'Lê Văn C',
    email: 'lvc@genxpks.com',
    role: 'HR',
    employeeId: 'NV003',
    cccd: '012345678914',
    phone: '0965432109',
    address: '789 Nguyễn Chí Thanh, Hà Nội',
    startDate: '2024-11-01',
    department: 'Nhân sự',
    position: 'Chuyên viên HR',
    gender: 'Nam',
    dob: '1995-12-05',
    isProfileComplete: true,
    contractExpiry: '2026-11-01'
  },
  Admin: {
    fullName: 'Phạm Văn D (System Admin)',
    email: 'admin@genxpks.com',
    role: 'Admin',
    employeeId: 'NV000',
    cccd: '012345678911',
    phone: '0999999999',
    address: 'Trụ sở chính GENX PKS',
    startDate: '2024-01-01',
    department: 'Hành chính',
    position: 'Trưởng phòng',
    gender: 'Nam',
    dob: '1990-01-01',
    isProfileComplete: true,
    contractExpiry: 'Vô thời hạn'
  }
};

export const AppProvider = ({ children }) => {
  // Current user state
  const [currentUser, setCurrentUser] = useState(presetUsers.NhanVien);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Dynamic entity states
  const [departments, setDepartments] = useState(initialDepartments);
  const [positions, setPositions] = useState(initialPositions);
  const [attendanceHistory, rawSetAttendanceHistory] = useState(initialHistory);
  const [requests, rawSetRequests] = useState(initialRequests);
  const [documents, setDocuments] = useState(initialDocuments);
  
  // Custom user collection (for HR management & Admin list)
  const [allUsers, rawSetAllUsers] = useState([
    { ...presetUsers.NhanVien },
    { ...presetUsers.KeToan },
    { ...presetUsers.HR },
    { ...presetUsers.Admin },
    {
      fullName: 'Hoàng Văn E (Thực tập sinh)',
      email: 'hve@genxpks.com',
      role: 'NhanVien',
      employeeId: 'NV004',
      cccd: '',
      phone: '',
      address: '',
      startDate: '2026-06-01',
      department: 'Kỹ thuật',
      position: 'Nhân viên thử việc',
      gender: '',
      dob: '',
      isProfileComplete: false,
      contractExpiry: '2026-09-01'
    },
    {
      fullName: 'Hoàng Thị E',
      email: 'hte@genxpks.com',
      role: 'NhanVien',
      employeeId: 'NV005',
      cccd: '012345678920',
      phone: '0912345678',
      address: '22 Trần Phú, Hà Nội',
      startDate: '2025-08-01',
      department: 'Kinh doanh',
      position: 'Nhân viên chính thức',
      gender: 'Nữ',
      dob: '1999-03-10',
      isProfileComplete: true,
      contractExpiry: '2026-08-01'
    }
  ]);

  // Simulation states
  const [officeWifi, setOfficeWifi] = useState(true);
  const [gpsWithinRange, setGpsWithinRange] = useState(true);
  const [systemTimeOffset, setSystemTimeOffset] = useState(0); // Offset in minutes
  const [firebaseLogs, setFirebaseLogs] = useState([]);
  
  // Real time punch state for active user
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentShift, setCurrentShift] = useState('');
  const [checkInTime, setCheckInTime] = useState(null);
  
  // Navigation / Page Routing Control
  const [currentPath, setCurrentPath] = useState('/dashboard');

  // Global Custom Dialog State
  const [modalDialog, setModalDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null
  });

  // Global Undo Toast State
  const [undoToast, setUndoToast] = useState(null);

  const triggerUndo = (message, onConfirm, onUndo) => {
    setUndoToast(prev => {
      if (prev && prev.onConfirm) {
        prev.onConfirm();
      }
      return { message, onConfirm, onUndo, id: Date.now() };
    });
  };

  const showDialog = (config) => {
    setModalDialog({
      isOpen: true,
      title: config.title || 'Thông báo',
      message: config.message || '',
      type: config.type || 'info',
      onConfirm: config.onConfirm || null,
      onCancel: config.onCancel || null
    });
  };

  const closeDialog = () => {
    setModalDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Real-time Notifications state
  const [notifications, rawSetNotifications] = useState([
    { id: 1, title: 'Thông báo hệ thống', description: 'Chào mừng bạn đến với hệ thống HRM GENX PKS.', time: '09:00', read: false, type: 'info' },
    { id: 2, title: 'Chấm công tự động', description: 'Đã hoàn thành đề xuất ca làm việc tự động sáng nay.', time: '07:45', read: true, type: 'success' },
  ]);

  // Sync state event listener
  useEffect(() => {
    const handleSync = (event) => {
      const { type, payload } = event.data;
      if (type === 'SYNC_ATTENDANCE') rawSetAttendanceHistory(payload);
      if (type === 'SYNC_REQUESTS') rawSetRequests(payload);
      if (type === 'SYNC_NOTIFICATIONS') rawSetNotifications(payload);
      if (type === 'SYNC_USERS') rawSetAllUsers(payload);
    };
    syncChannel.addEventListener('message', handleSync);
    return () => {
      syncChannel.removeEventListener('message', handleSync);
    };
  }, []);

  // State synchronization wrappers that broadcast to other tabs
  const updateAttendanceHistory = (val) => {
    rawSetAttendanceHistory(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_ATTENDANCE', payload: next });
      return next;
    });
  };

  const updateRequests = (val) => {
    rawSetRequests(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_REQUESTS', payload: next });
      return next;
    });
  };

  const updateAllUsers = (val) => {
    rawSetAllUsers(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_USERS', payload: next });
      return next;
    });
  };

  const updateNotifications = (val) => {
    rawSetNotifications(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_NOTIFICATIONS', payload: next });
      return next;
    });
  };

  // Push custom log simulating Firebase logger
  const pushLog = (message, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const logTypeSymbol = type === 'error' ? '❌' : type === 'success' ? '🟢' : 'ℹ️';
    setFirebaseLogs((prev) => [
      { id: Date.now() + Math.random(), text: `[${timeStr}] ${logTypeSymbol} ${message}` },
      ...prev
    ]);
  };

  // Trigger a real-time notification
  const addNotification = (title, description, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newNotif = {
      id: Date.now(),
      title,
      description,
      time: timeStr,
      read: false,
      type
    };
    updateNotifications(prev => [newNotif, ...prev]);
    pushLog(`[Thông báo Real-time] ${title}: ${description}`, 'info');
  };

  // Simulate background activities from other users for real-time vibe
  useEffect(() => {
    const interval = setInterval(() => {
      const otherUsers = allUsers.filter(u => u.employeeId !== currentUser.employeeId);
      if (otherUsers.length === 0) return;
      const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];

      const events = [
        { title: 'Chấm công nhân viên', desc: `Nhân viên ${randomUser.fullName} vừa Check-in thành công ca làm việc.`, type: 'success' },
        { title: 'Yêu cầu đơn từ mới', desc: `Nhân viên ${randomUser.fullName} vừa gửi đơn yêu cầu chờ duyệt.`, type: 'info' },
        { title: 'Hệ thống vận hành', desc: 'Đồng bộ dữ liệu chấm công sang Firestore thành công.', type: 'success' }
      ];
      const selectedEvent = events[Math.floor(Math.random() * events.length)];
      addNotification(selectedEvent.title, selectedEvent.desc, selectedEvent.type);
    }, 45000); // Every 45s

    return () => clearInterval(interval);
  }, [allUsers, currentUser]);

  // Change current simulated user & synchronize profile complete overlay
  const changeUserRole = (roleKey) => {
    const user = presetUsers[roleKey] || presetUsers.NhanVien;
    setCurrentUser(user);
    setIsCheckedIn(false);
    pushLog(`Chuyển sang tài khoản: ${user.fullName} (${user.role})`, 'success');
  };

  // Synchronize path and verify route guards
  const navigateTo = (path) => {
    pushLog(`Điều hướng tới: ${path}`);
    
    // Router Guard check
    const allowed = checkRoutePermission(currentUser.role, path);
    if (!allowed) {
      pushLog(`Chặn truy cập: Route ${path} sai thẩm quyền cho vai trò ${currentUser.role}. Chuyển hướng về /dashboard`, 'error');
      setCurrentPath('/dashboard');
    } else {
      setCurrentPath(path);
    }
  };

  // Core authorization checker
  const checkRoutePermission = (role, path) => {
    if (path === '/dashboard' || path === '/profile' || path === '/history' || path === '/requests') {
      return true; // All roles can access standard pages
    }
    if (path === '/hr' && (role === 'HR' || role === 'KeToan' || role === 'Admin')) {
      return true;
    }
    if (path === '/accounting' && (role === 'KeToan' || role === 'HR' || role === 'Admin')) {
      return true;
    }
    if (path === '/admin' && role === 'Admin') {
      return true;
    }
    return false;
  };

  // Effect to sync user complete state inside allUsers list
  useEffect(() => {
    if (currentUser) {
      updateAllUsers((prev) =>
        prev.map((u) => (u.employeeId === currentUser.employeeId ? currentUser : u))
      );
    }
  }, [currentUser]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoggedIn,
        setIsLoggedIn,
        departments,
        setDepartments,
        positions,
        setPositions,
        attendanceHistory,
        setAttendanceHistory: updateAttendanceHistory,
        requests,
        setRequests: updateRequests,
        documents,
        setDocuments,
        allUsers,
        setAllUsers: updateAllUsers,
        officeWifi,
        setOfficeWifi,
        gpsWithinRange,
        setGpsWithinRange,
        systemTimeOffset,
        setSystemTimeOffset,
        firebaseLogs,
        setFirebaseLogs,
        pushLog,
        isCheckedIn,
        setIsCheckedIn,
        currentShift,
        setCurrentShift,
        checkInTime,
        setCheckInTime,
        currentPath,
        navigateTo,
        changeUserRole,
        checkRoutePermission,
        notifications,
        setNotifications: updateNotifications,
        addNotification,
        modalDialog,
        showDialog,
        closeDialog,
        undoToast,
        setUndoToast,
        triggerUndo
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

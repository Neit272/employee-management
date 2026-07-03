import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ToggleLeft, ToggleRight, User, Shield, Wifi, MapPin, Clock, FileText, Trash2, Sliders } from 'lucide-react';

export default function SimulationPanel() {
  const {
    currentUser,
    setCurrentUser,
    changeUserRole,
    officeWifi,
    setOfficeWifi,
    gpsWithinRange,
    setGpsWithinRange,
    systemTimeOffset,
    setSystemTimeOffset,
    firebaseLogs,
    setFirebaseLogs,
    pushLog,
    allUsers,
    isCheckedIn
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);

  const handleUserChange = (e) => {
    const selectedId = e.target.value;
    const targetUser = allUsers.find(u => u.employeeId === selectedId);
    if (targetUser) {
      setCurrentUser({ ...targetUser });
      pushLog(`Simulate: Đăng nhập với tư cách ${targetUser.fullName} (Mã: ${targetUser.employeeId}, Vai trò: ${targetUser.role})`, 'success');
    }
  };

  const adjustTime = (minutes) => {
    setSystemTimeOffset(prev => prev + minutes);
    const mockTime = new Date();
    mockTime.setMinutes(mockTime.getMinutes() + systemTimeOffset + minutes);
    pushLog(`Simulate: Đã chỉnh thời gian hệ thống sang ${mockTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`, 'info');
  };

  const resetTime = () => {
    setSystemTimeOffset(0);
    pushLog(`Simulate: Đặt lại thời gian hệ thống theo thời gian thực`, 'success');
  };

  const clearLogs = () => {
    setFirebaseLogs([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold px-4 py-3 rounded-full shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Sliders className="w-5 h-5 animate-pulse" />
        <span className="text-sm">Bộ mô phỏng (Sim Panel)</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[85vh] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-950 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-teal-400" />
          <h3 className="font-bold text-slate-100">Bảng điều khiển mô phỏng</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
        >
          Đóng
        </button>
      </div>

      {/* Panel Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-5 text-sm">
        {/* User Account Override */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-semibold text-teal-400">
            <User className="w-4 h-4" />
            Tài khoản Đăng nhập:
          </label>
          <select
            value={currentUser ? currentUser.employeeId : ''}
            onChange={handleUserChange}
            className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500 transition"
          >
            {allUsers.map((user) => (
              <option key={user.employeeId} value={user.employeeId}>
                {user.fullName} ({user.role}) - {user.isProfileComplete ? 'Đầy đủ TT' : 'Thiếu thông tin'}
              </option>
            ))}
          </select>
        </div>

        {/* Network & Location Simulators */}
        <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <h4 className="font-semibold text-slate-400 text-xs tracking-wider uppercase">Cài đặt Mạng & Định vị</h4>
          
          {/* IP Sim */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-slate-400" />
              Kết nối WiFi văn phòng:
            </span>
            <button
              onClick={() => {
                setOfficeWifi(!officeWifi);
                pushLog(`Simulate: Đổi trạng thái WiFi thành ${!officeWifi ? 'IP Hợp lệ' : 'Sai IP'}`, !officeWifi ? 'success' : 'error');
              }}
              className="text-teal-400 hover:text-teal-300 transition"
            >
              {officeWifi ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="text-xs">Đúng IP Công ty</span>
                  <ToggleRight className="w-8 h-8" />
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400">
                  <span className="text-xs">Sai IP Mạng</span>
                  <ToggleLeft className="w-8 h-8" />
                </div>
              )}
            </button>
          </div>

          {/* GPS Sim */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Tọa độ GPS (&lt;100 mét):
            </span>
            <button
              onClick={() => {
                setGpsWithinRange(!gpsWithinRange);
                pushLog(`Simulate: Đổi tọa độ GPS thành ${!gpsWithinRange ? 'Trong phạm vi 100m' : 'Ngoài phạm vi (>100m)'}`, !gpsWithinRange ? 'success' : 'error');
              }}
              className="text-teal-400 hover:text-teal-300 transition"
            >
              {gpsWithinRange ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="text-xs">Trong phạm vi</span>
                  <ToggleRight className="w-8 h-8" />
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400">
                  <span className="text-xs">Ngoài phạm vi</span>
                  <ToggleLeft className="w-8 h-8" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Time Simulator */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-semibold text-teal-400">
            <Clock className="w-4 h-4" />
            Giả lập thời gian hệ thống:
          </label>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => adjustTime(-60)}
              className="bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded transition text-slate-300"
            >
              -1 giờ
            </button>
            <button
              onClick={() => adjustTime(-15)}
              className="bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded transition text-slate-300"
            >
              -15 phút
            </button>
            <button
              onClick={() => adjustTime(15)}
              className="bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded transition text-slate-300"
            >
              +15 phút
            </button>
            <button
              onClick={() => adjustTime(60)}
              className="bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded transition text-slate-300"
            >
              +1 giờ
            </button>
          </div>
          <button
            onClick={resetTime}
            className="w-full bg-slate-850 hover:bg-slate-800 text-xs py-1.5 rounded transition text-teal-400 font-semibold border border-teal-500/20"
          >
            Khôi phục thời gian thực
          </button>
        </div>

        {/* Firebase Live Database Logs */}
        <div className="space-y-2 flex flex-col flex-1">
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-1.5 font-semibold text-teal-400">
              <FileText className="w-4 h-4" />
              Nhật ký Firebase Push Logs:
            </label>
            <button
              onClick={clearLogs}
              title="Xóa nhật ký log"
              className="text-slate-400 hover:text-rose-400 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] h-36 overflow-y-auto space-y-1.5 border border-slate-800">
            {firebaseLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-10 italic">Không có giao dịch nào được ghi nhận.</div>
            ) : (
              firebaseLogs.map((log) => (
                <div key={log.id} className="text-slate-300 border-b border-slate-900/50 pb-1 leading-relaxed break-words">
                  {log.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

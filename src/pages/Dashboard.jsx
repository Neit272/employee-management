import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, CheckCircle2, AlertTriangle, Play, Square, Award, Calendar, AlertCircle, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';

const shifts = [
  { id: 'morning', name: 'Ca Sáng (08:00 - 12:00)', startHour: 8, endHour: 12 },
  { id: 'afternoon', name: 'Ca Chiều (13:30 - 17:30)', startHour: 13.5, endHour: 17.5 },
  { id: 'split', name: 'Ca Gãy (08:00 - 17:30)', startHour: 8, endHour: 17.5 },
  { id: 'ot', name: 'Tăng ca (18:00 - 21:00)', startHour: 18, endHour: 21 }
];

export default function Dashboard() {
  const {
    currentUser,
    officeWifi,
    gpsWithinRange,
    systemTimeOffset,
    pushLog,
    isCheckedIn,
    setIsCheckedIn,
    currentShift,
    setCurrentShift,
    attendanceHistory,
    setAttendanceHistory,
    addNotification,
    checkInTime,
    setCheckInTime,
    apiCall,
    syncFromBackend
  } = useApp();

  const [time, setTime] = useState(new Date());
  const [punchLoading, setPunchLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Real-time tick effect (accounting for simulator offset)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + systemTimeOffset);
      setTime(now);
    }, 1000);

    return () => clearInterval(timer);
  }, [systemTimeOffset]);

  // Automatic Shift Recommendation based on current simulated time
  useEffect(() => {
    if (!isCheckedIn) {
      const hr = time.getHours();
      const mins = time.getMinutes();
      const currentDecimalTime = hr + mins / 60;

      let recommendedShift = shifts[0].name; // Default morning
      if (currentDecimalTime >= 6 && currentDecimalTime < 12) {
        recommendedShift = 'Ca Sáng (08:00 - 12:00)';
      } else if (currentDecimalTime >= 12 && currentDecimalTime < 17.5) {
        recommendedShift = 'Ca Chiều (13:30 - 17:30)';
      } else if (currentDecimalTime >= 17.5 && currentDecimalTime < 24) {
        recommendedShift = 'Tăng ca (18:00 - 21:00)';
      }
      
      setCurrentShift(recommendedShift);
    }
  }, [time, isCheckedIn, setCurrentShift]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePunch = async () => {
    // 1. Check IP and Geofencing coordinates prior to executing API
    if (!officeWifi) {
      showToast('Sai địa chỉ IP mạng văn phòng! Bạn cần kết nối đúng WiFi công ty.', 'error');
      pushLog(`Chấm công thất bại: Thiết bị kết nối sai IP mạng công ty.`, 'error');
      return;
    }

    if (!gpsWithinRange && !currentShift.toLowerCase().includes('online')) {
      showToast('Bạn đang ở ngoài phạm vi công ty! Khoảng cách GPS thực tế > 100m.', 'error');
      pushLog(`Chấm công thất bại: Tọa độ thiết bị nằm ngoài geofence (>100m).`, 'error');
      return;
    }

    // Debounce/Throttle constraint: immediate lock & loading spin
    setPunchLoading(true);
    const punchType = isCheckedIn ? 'Check-out' : 'Check-in';
    pushLog(`Bắt đầu xử lý gửi yêu cầu ${punchType} lên Backend...`);

    try {
      if (!isCheckedIn) {
        // Call backend check-in
        const res = await apiCall('/attendance/check-in', 'POST', {
          lat: gpsWithinRange ? 21.028511 : 21.05,
          lng: gpsWithinRange ? 105.854167 : 105.9,
          wifiIp: officeWifi ? '127.0.0.1' : '192.168.9.9',
          shiftName: currentShift,
          checkInTimeStr: time.toISOString()
        });

        setIsCheckedIn(true);
        setCheckInTime(new Date(time));
        pushLog(`Chấm công vào (Check-in) thành công ca: ${currentShift}. Trạng thái WiFi: OK, GPS: OK.`, 'success');
        showToast('Check-in thành công!', 'success');
        addNotification('Chấm công thành công', `${currentUser.fullName} đã Check-in ca: ${currentShift}`, 'success');

        // Micro animation
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        // Call backend check-out
        await apiCall('/attendance/check-out', 'POST', {
          checkOutTimeStr: time.toISOString()
        });

        setIsCheckedIn(false);
        setCheckInTime(null);
        pushLog(`Chấm công ra (Check-out) thành công ca: ${currentShift}.`, 'success');
        showToast('Check-out thành công!', 'success');
        addNotification('Chấm công thành công', `${currentUser.fullName} đã Check-out ca: ${currentShift}`, 'success');
      }

      await syncFromBackend();
    } catch (err) {
      showToast(err.message, 'error');
      pushLog(`Lỗi chấm công: ${err.message}`, 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  // Determine if it is overtime based on simulated hours
  const isOvertimePeriod = () => {
    return time.getHours() >= 18;
  };

  // Summary statistics widgets calculation
  const totalWorkedDays = attendanceHistory.filter(h => h.status === 'Hợp lệ').length + 15.5; // Offset mock
  const totalLateDays = attendanceHistory.filter(h => h.status === 'Đi muộn').length + 1;
  const remainingLeave = 11.5;
  const totalOT = 6.5;

  return (
    <div className="space-y-6">
      
      {/* Absolute Toast */}
      {toast && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all duration-300 animate-in slide-in-from-top-4 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Greeting Ban */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Xin chào, {currentUser.fullName}!</h1>
          <p className="text-slate-400 text-sm mt-1">Chúc bạn một ngày làm việc hiệu quả và an toàn.</p>
        </div>
        <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-medium text-slate-300">
            {time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Clock Card */}
        <div className="lg:col-span-1 bg-slate-900/30 border border-slate-855 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-xl">
          <div className="p-3 bg-teal-500/10 rounded-full text-teal-400 mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <span className="text-xs font-semibold text-slate-500 tracking-widest uppercase">Giờ Hệ Thống Thực Tế</span>
          <span className="text-5xl font-extrabold text-slate-100 tracking-tight my-3 tabular-nums font-mono drop-shadow-[0_0_15px_rgba(20,184,166,0.1)]">
            {time.toLocaleTimeString('vi-VN')}
          </span>
          <span className="text-xs text-slate-400">
            Hệ thống chấm công được tự động đồng bộ hóa
          </span>
        </div>

        {/* Punch Button & Shift Dropdown Card */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-855 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8 shadow-xl">
          
          {/* Shift Selection Block */}
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Ca Làm Việc Đăng Ký *
              </label>
              <select
                disabled={isCheckedIn}
                value={currentShift}
                onChange={(e) => setCurrentShift(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 text-slate-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {shifts.map(shift => (
                  <option key={shift.id} value={shift.name}>{shift.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2.5 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs">
              <AlertCircle className="w-4.5 h-4.5 text-teal-400 shrink-0 mt-0.5" />
              <p className="text-slate-400 leading-relaxed">
                {isCheckedIn 
                  ? 'Đã khóa chọn ca. Bạn không thể đổi ca làm việc giữa chừng sau khi đã Check-in.' 
                  : 'Hệ thống tự động đề xuất ca gần nhất theo giờ hệ thống. Hãy xác nhận đúng ca trước khi Check-in.'
                }
              </p>
            </div>
          </div>

          {/* Punch Round Button */}
          <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
            <button
              onClick={handlePunch}
              disabled={punchLoading || (!officeWifi && !gpsWithinRange)}
              className={`w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2.5 font-bold transition-all duration-300 transform active:scale-95 border-4 focus:outline-none select-none relative ${
                punchLoading 
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  : !officeWifi || !gpsWithinRange
                    ? 'bg-slate-850 border-slate-800 text-slate-500 cursor-not-allowed'
                    : isCheckedIn
                      ? 'bg-gradient-to-br from-rose-500 to-orange-600 hover:from-rose-600 hover:to-orange-700 border-rose-400 text-slate-950 glow-red'
                      : 'bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 border-emerald-300 text-slate-950 glow-green'
              }`}
            >
              {punchLoading ? (
                <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
              ) : !officeWifi || !gpsWithinRange ? (
                <>
                  <Compass className="w-8 h-8 text-slate-500" />
                  <span className="text-sm tracking-wide">Bị khóa do IP/GPS</span>
                </>
              ) : isCheckedIn ? (
                <>
                  <Square className="w-8 h-8 stroke-[3]" />
                  <span className="text-base tracking-wide uppercase">
                    {isOvertimePeriod() ? 'Checkout OT' : 'Check-out'}
                  </span>
                  {isOvertimePeriod() && (
                    <span className="text-[9px] font-black tracking-widest px-2 py-0.5 bg-slate-950/80 rounded text-amber-400 border border-amber-500/20">
                      $$Check-out Tăng Ca$$
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Play className="w-8 h-8 fill-slate-950 stroke-none" />
                  <span className="text-base tracking-wide uppercase">Check-in</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Summary Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Accumulative Days */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Công tích lũy</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{totalWorkedDays}</span>
          </div>
        </div>

        {/* Late days */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Số lần đi muộn</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{totalLateDays}</span>
          </div>
        </div>

        {/* Leave remaining */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Nghỉ phép còn lại</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{remainingLeave} ngày</span>
          </div>
        </div>

        {/* Overtime Hours */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Giờ tăng ca (OT)</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{totalOT} giờ</span>
          </div>
        </div>

      </div>

    </div>
  );
}

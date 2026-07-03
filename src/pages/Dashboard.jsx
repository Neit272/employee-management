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
    isSyncing,
    currentShift,
    setCurrentShift,
    attendanceHistory,
    setAttendanceHistory,
    addNotification,
    checkInTime,
    setCheckInTime,
    apiCall,
    syncFromBackend,
    allowedWifiIp,
    allowedDistance,
    gracePeriod,
    setCurrentUser,
    setAllUsers,
    requests
  } = useApp();

  const formatDate = (dateInput) => {
    if (!dateInput || dateInput === 'Vô thời hạn' || dateInput === '—') return dateInput;
    try {
      if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
        return dateInput;
      }
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return dateInput;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateInput;
    }
  };

  const validateVietnamesePhone = (phone) => {
    if (!phone) return true;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return /^(0|84|\+84)(3|5|7|8|9)([0-9]{8})$/.test(cleanPhone);
  };

  const validateVietnameseCccd = (cccd, gender, dob) => {
    if (!cccd) return true;
    const cleanCccd = cccd.trim();
    if (!/^[0-9]{12}$/.test(cleanCccd)) return false;

    // If gender or dob is missing, we can only validate the 12 digits format
    if (!gender || !dob) return true;

    // Extract year of birth from dob (expected format: YYYY-MM-DD)
    const dobParts = dob.split('-');
    if (dobParts.length < 1) return false;
    const birthYear = parseInt(dobParts[0], 10);
    if (isNaN(birthYear)) return false;

    // Extract century and year code
    const century = Math.floor(birthYear / 100) + 1; // e.g. 1990 -> 20, 2005 -> 21
    const yearCode = String(birthYear).substring(2, 4); // e.g. "90" or "05"

    // Determine gender digit rules
    let expectedGenderDigit = -1;
    const isMale = gender === 'Nam';

    if (century === 20) {
      expectedGenderDigit = isMale ? 0 : 1;
    } else if (century === 21) {
      expectedGenderDigit = isMale ? 2 : 3;
    } else if (century === 22) {
      expectedGenderDigit = isMale ? 4 : 5;
    } else if (century === 23) {
      expectedGenderDigit = isMale ? 6 : 7;
    } else if (century === 24) {
      expectedGenderDigit = isMale ? 8 : 9;
    }

    // Validate gender/century digit (4th digit, index 3)
    const actualGenderDigit = parseInt(cleanCccd[3], 10);
    if (actualGenderDigit !== expectedGenderDigit) return false;

    // Validate year code digits (5th and 6th digits, index 4, 5)
    const actualYearCode = cleanCccd.substring(4, 6);
    if (actualYearCode !== yearCode) return false;

    return true;
  };

  const [time, setTime] = useState(new Date());
  const [punchLoading, setPunchLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    cccd: '',
    dob: '',
    gender: 'Nam',
    address: ''
  });

  // Real-time tick effect (accounting for simulator offset)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + systemTimeOffset);
      setTime(now);
    }, 1000);

    return () => clearInterval(timer);
  }, [systemTimeOffset]);

  // Automatic Shift Recommendation based on current simulated time (runs on mount/checkout, not on clock ticks)
  useEffect(() => {
    if (!isCheckedIn) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + systemTimeOffset);
      const hr = now.getHours();
      const mins = now.getMinutes();
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
  }, [isCheckedIn, systemTimeOffset, setCurrentShift]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper to determine if a check-in is late based on grace period configuration
  const isLateCheckIn = (checkInDateObj) => {
    if (!currentShift) return false;
    const match = currentShift.match(/\((\d{2}):(\d{2})/);
    if (!match) return false;
    const startHour = parseInt(match[1], 10);
    const startMin = parseInt(match[2], 10);
    
    const checkInHour = checkInDateObj.getHours();
    const checkInMin = checkInDateObj.getMinutes();
    
    const checkInTotalMins = checkInHour * 60 + checkInMin;
    const shiftStartTotalMins = startHour * 60 + startMin;
    
    return checkInTotalMins > (shiftStartTotalMins + gracePeriod);
  };

  const hasCheckedOutCurrentShiftToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return attendanceHistory.some(
      h => h.date === todayStr && h.shift === currentShift && h.clockOut !== '-'
    );
  };

  const handlePunch = async () => {
    // 1. Check IP and Geofencing coordinates prior to executing API
    if (!officeWifi) {
      showToast(`Sai địa chỉ IP mạng văn phòng! Bạn cần kết nối đúng WiFi công ty (IP cho phép: ${allowedWifiIp}).`, 'error');
      pushLog(`Chấm công thất bại: Thiết bị kết nối sai IP mạng công ty (IP: ${allowedWifiIp}).`, 'error');
      return;
    }

    if (!gpsWithinRange && !currentShift.toLowerCase().includes('online')) {
      showToast(`Bạn đang ở ngoài phạm vi công ty! Khoảng cách GPS thực tế > ${allowedDistance}m.`, 'error');
      pushLog(`Chấm công thất bại: Tọa độ thiết bị nằm ngoài geofence (>${allowedDistance}m).`, 'error');
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

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profileForm.fullName.trim() || !profileForm.email.trim()) {
      showToast('Vui lòng điền đầy đủ Họ và tên và Email.', 'error');
      return;
    }

    if (profileForm.phone && !validateVietnamesePhone(profileForm.phone)) {
      showToast('Số điện thoại không đúng định dạng Việt Nam (phải gồm 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09).', 'error');
      return;
    }

    if (profileForm.cccd && !validateVietnameseCccd(profileForm.cccd, profileForm.gender, profileForm.dob)) {
      showToast('Số CCCD không hợp lệ hoặc không khớp với thông tin Giới tính / Ngày sinh.', 'error');
      return;
    }

    try {
      const res = await apiCall('/auth/profile', 'PUT', {
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        cccd: profileForm.cccd.trim(),
        dob: profileForm.dob,
        gender: profileForm.gender,
        address: profileForm.address.trim()
      });

      setCurrentUser(res.user);
      setIsEditingProfile(false);
      pushLog(`Nhân viên tự cập nhật thông tin cá nhân thành công.`, 'success');
      showToast('Cập nhật thông tin cá nhân thành công!', 'success');
      confetti({ particleCount: 30, spread: 25 });
      await syncFromBackend();
    } catch (err) {
      showToast(err.message, 'error');
      pushLog(`Lỗi tự cập nhật hồ sơ: ${err.message}`, 'error');
    }
  };

  // Summary statistics widgets calculation
  const myAttendance = attendanceHistory.filter(h => h.employeeId === currentUser.employeeId);
  const totalWorkedDays = myAttendance.filter(h => h.status === 'Hợp lệ' || h.status === 'Đi muộn' || h.status === 'Về sớm').length;
  const totalLateDays = myAttendance.filter(h => h.status === 'Đi muộn').length;
  
  // Calculate remaining leave: start with 12 days default, subtract days from approved "Xin nghỉ phép" requests
  const approvedLeaves = requests.filter(r => r.employeeId === currentUser.employeeId && r.type === 'Xin nghỉ phép' && r.status === 'Approved');
  let leaveDaysUsed = 0;
  approvedLeaves.forEach(r => {
    const start = new Date(r.fromDate);
    const end = new Date(r.toDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      leaveDaysUsed += diffDays;
    }
  });
  const remainingLeave = Math.max(0, 12 - leaveDaysUsed);

  // Calculate OT hours: sum from approved "Đăng ký tăng ca" requests, assuming each request is e.g. 4 hours
  const approvedOT = requests.filter(r => r.employeeId === currentUser.employeeId && r.type === 'Đăng ký tăng ca' && r.status === 'Approved');
  let totalOT = 0;
  approvedOT.forEach(r => {
    totalOT += 4; // default 4 hours per OT shift
  });

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
              disabled={punchLoading || isSyncing || (!officeWifi && !gpsWithinRange) || (!isCheckedIn && hasCheckedOutCurrentShiftToday())}
              className={`w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2.5 font-bold transition-all duration-300 transform active:scale-95 border-4 focus:outline-none select-none relative ${
                punchLoading || isSyncing
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  : !officeWifi || !gpsWithinRange
                    ? 'bg-slate-850 border-slate-800 text-slate-500 cursor-not-allowed'
                    : !isCheckedIn && hasCheckedOutCurrentShiftToday()
                      ? 'punch-btn-disabled-completed text-slate-500 cursor-not-allowed'
                      : isCheckedIn
                        ? 'bg-gradient-to-br from-rose-500 to-orange-600 hover:from-rose-600 hover:to-orange-700 border-rose-400 text-slate-950 glow-red'
                        : 'bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 border-emerald-300 text-slate-950 glow-green'
              }`}
            >
              {punchLoading || isSyncing ? (
                <>
                  <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wider mt-1">
                    {isSyncing ? 'Đang đồng bộ...' : 'Đang xử lý...'}
                  </span>
                </>
              ) : !officeWifi || !gpsWithinRange ? (
                <>
                  <Compass className="w-8 h-8 text-slate-500" />
                  <span className="text-sm tracking-wide">Bị khóa do IP/GPS</span>
                </>
              ) : !isCheckedIn && hasCheckedOutCurrentShiftToday() ? (
                <>
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#64748b' }} />
                  <span className="text-sm tracking-wide text-center px-3" style={{ color: '#64748b' }}>Ca này đã hoàn thành</span>
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
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4 hover-card-premium">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Công tích lũy</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{totalWorkedDays}</span>
          </div>
        </div>

        {/* Late days */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4 hover-card-premium">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Số lần đi muộn</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{totalLateDays}</span>
          </div>
        </div>

        {/* Leave remaining */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4 hover-card-premium">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Nghỉ phép còn lại</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{remainingLeave} ngày</span>
          </div>
        </div>

        {/* Overtime Hours */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-2xl p-5 shadow flex items-center gap-4 hover-card-premium">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400">Giờ tăng ca (OT)</span>
            <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{totalOT} giờ</span>
          </div>
        </div>

      </div>

      {/* 4. Personal Profile Card */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-200">Thông tin Hồ sơ Cá nhân</h3>
            <p className="text-slate-500 text-xs mt-0.5">Xem và tự điều chỉnh thông tin liên hệ, lý lịch cá nhân của bạn.</p>
          </div>
          {!isEditingProfile ? (
            <button
              onClick={() => {
                setIsEditingProfile(true);
                setProfileForm({
                  fullName: currentUser.fullName,
                  email: currentUser.email,
                  phone: currentUser.phone || '',
                  cccd: currentUser.cccd || '',
                  dob: currentUser.dob || '',
                  gender: currentUser.gender || 'Nam',
                  address: currentUser.address || ''
                });
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/80 transition"
            >
              📝 Chỉnh sửa thông tin
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 rounded-xl text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition"
              >
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>
        <div className="p-6">
          {!isEditingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Họ và tên</span>
                <span className="text-slate-200 font-semibold">{currentUser.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Địa chỉ Email</span>
                <span className="text-slate-200 font-semibold text-wrap break-all">{currentUser.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Số điện thoại</span>
                <span className="text-slate-200 font-semibold">{currentUser.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Số CCCD / Hộ chiếu</span>
                <span className="text-slate-200 font-semibold">{currentUser.cccd || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Ngày sinh</span>
                <span className="text-slate-200 font-semibold">{formatDate(currentUser.dob) || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Giới tính</span>
                <span className="text-slate-200 font-semibold">{currentUser.gender || '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block mb-0.5">Địa chỉ thường trú</span>
                <span className="text-slate-200 font-semibold">{currentUser.address || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">Phòng ban</span>
                <span className="text-slate-400 font-semibold">{currentUser.department || 'Chưa phân bổ'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">Chức vụ</span>
                <span className="text-slate-400 font-semibold">{currentUser.position || 'Nhân sự chính thức'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">Quyền hạn hệ thống</span>
                <span className="text-teal-400 font-bold uppercase">{currentUser.role}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">Thời hạn hợp đồng</span>
                <span className="text-emerald-400 font-bold">{formatDate(currentUser.contractExpiry) || 'Vô thời hạn'}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Họ và tên *</label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Địa chỉ Email *</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Số điện thoại</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Số CCCD / Hộ chiếu</label>
                <input
                  type="text"
                  value={profileForm.cccd}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, cccd: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Ngày sinh</label>
                <input
                  type="date"
                  value={profileForm.dob}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Giới tính</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Địa chỉ thường trú</label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

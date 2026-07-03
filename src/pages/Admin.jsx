import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Folder, FileCheck, FileX, Download, Plus, Trash2, Edit2, AlertCircle, UserPlus, Lock, Unlock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Admin() {
  const {
    currentUser,
    setCurrentUser,
    departments,
    setDepartments,
    positions,
    setPositions,
    requests,
    setRequests,
    allUsers,
    setAllUsers,
    attendanceHistory,
    setAttendanceHistory,
    pushLog,
    addNotification,
    showDialog,
    triggerUndo,
    allowedWifiIp,
    setAllowedWifiIp,
    allowedDistance,
    setAllowedDistance,
    gracePeriod,
    setGracePeriod
  } = useApp();

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'Vô thời hạn' || dateStr === '—') return dateStr;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  // Account Locking Reason States
  const [lockingUser, setLockingUser] = useState(null);
  const [lockReasonType, setLockReasonType] = useState('Nghỉ việc');
  const [customLockReason, setCustomLockReason] = useState('');

  // User Account Management States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null); // if null, we are adding new account
  const [accountForm, setAccountForm] = useState({
    fullName: '',
    email: '',
    employeeId: '',
    role: 'NhanVien',
    department: '',
    position: ''
  });

  const openAddAccountModal = () => {
    // Generate next Employee ID
    const maxIdNum = allUsers.reduce((max, u) => {
      const num = parseInt(u.employeeId.replace('NV', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextId = `NV${String(maxIdNum + 1).padStart(3, '0')}`;

    setEditingAccount(null);
    setAccountForm({
      fullName: '',
      email: '',
      employeeId: nextId,
      role: 'NhanVien',
      department: departments[0] || '',
      position: positions[0] || ''
    });
    setIsAccountModalOpen(true);
  };

  const openEditAccountModal = (user) => {
    setEditingAccount(user);
    setAccountForm({
      fullName: user.fullName,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department || '',
      position: user.position || ''
    });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!accountForm.fullName.trim() || !accountForm.email.trim() || !accountForm.employeeId.trim()) {
      showDialog({ title: 'Lỗi nhập liệu', message: 'Vui lòng điền đầy đủ thông tin bắt buộc.', type: 'warning' });
      return;
    }

    if (editingAccount) {
      // 1. Admin cannot self-demote
      if (editingAccount.employeeId === currentUser.employeeId && accountForm.role !== 'Admin') {
        showDialog({
          title: 'Từ chối thao tác',
          message: 'Lỗi quyền hạn: Bạn không thể tự hạ cấp vai trò Admin của chính mình để tránh mất quyền quản trị.',
          type: 'warning'
        });
        return;
      }

      // 2. Admin cannot demote another Admin
      if (editingAccount.role === 'Admin' && accountForm.role !== 'Admin') {
        showDialog({
          title: 'Từ chối thao tác',
          message: 'Lỗi quyền hạn: Bạn chỉ có thể sửa đổi phân quyền của các nhân sự dưới quyền Admin. Không thể hạ cấp một tài khoản Admin khác.',
          type: 'warning'
        });
        return;
      }

      // Editing existing
      setAllUsers(prev => prev.map(u => {
        if (u.employeeId === editingAccount.employeeId) {
          return {
            ...u,
            fullName: accountForm.fullName.trim(),
            email: accountForm.email.trim(),
            role: accountForm.role,
            department: accountForm.department,
            position: accountForm.position
          };
        }
        return u;
      }));
      pushLog(`Admin cập nhật tài khoản: ${accountForm.fullName} (${accountForm.employeeId})`, 'success');
      showDialog({ title: 'Thành công', message: `Đã cập nhật tài khoản ${accountForm.fullName} thành công.`, type: 'success' });
    } else {
      // Adding new
      if (allUsers.some(u => u.employeeId === accountForm.employeeId)) {
        showDialog({ title: 'Trùng mã nhân viên', message: 'Mã nhân viên này đã tồn tại trong hệ thống.', type: 'error' });
        return;
      }
      const newAcc = {
        fullName: accountForm.fullName.trim(),
        email: accountForm.email.trim(),
        role: accountForm.role,
        employeeId: accountForm.employeeId.trim(),
        cccd: '',
        phone: '',
        address: '',
        startDate: new Date().toISOString().slice(0, 10),
        department: accountForm.department,
        position: accountForm.position,
        gender: '',
        dob: '',
        isProfileComplete: false
      };
      setAllUsers(prev => [...prev, newAcc]);
      pushLog(`Admin tạo mới tài khoản: ${newAcc.fullName} (${newAcc.employeeId})`, 'success');
      showDialog({ title: 'Thành công', message: `Đã tạo tài khoản ${newAcc.fullName} thành công. Nhân sự cần hoàn thiện thông tin khi đăng nhập.`, type: 'success' });
    }

    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = (user) => {
    if (user.employeeId === currentUser.employeeId) {
      showDialog({
        title: 'Bảo mật chặn',
        message: 'Lỗi an toàn: Bạn không thể tự xóa tài khoản Admin đang đăng nhập của chính mình!',
        type: 'error'
      });
      return;
    }

    const originalUsers = [...allUsers];
    setAllUsers(prev => prev.filter(u => u.employeeId !== user.employeeId));
    pushLog(`Yêu cầu xóa tài khoản: ${user.fullName} (${user.employeeId})`, 'warning');

    triggerUndo(
      `Đã xóa tài khoản "${user.fullName}" (${user.employeeId})`,
      () => {
        pushLog(`Admin xóa vĩnh viễn tài khoản nhân viên: ${user.fullName} (${user.employeeId})`, 'error');
        addNotification('Xóa tài khoản', `Tài khoản của ${user.fullName} đã bị loại bỏ khỏi hệ thống.`, 'error');
      },
      () => {
        setAllUsers(originalUsers);
        pushLog(`Hoàn tác xóa tài khoản nhân viên: ${user.fullName} (${user.employeeId})`, 'success');
      }
    );
  };

  const handleToggleLockAccount = (user) => {
    if (user.employeeId === currentUser.employeeId) {
      showDialog({
        title: 'Bảo mật chặn',
        message: 'Lỗi an toàn: Bạn không thể tự khóa tài khoản Admin của chính mình!',
        type: 'error'
      });
      return;
    }

    if (user.isLocked) {
      // Direct unlock
      setAllUsers(prev => prev.map(u => {
        if (u.employeeId === user.employeeId) {
          return { ...u, isLocked: false, lockReason: null };
        }
        return u;
      }));
      pushLog(`Admin mở khóa tài khoản: ${user.fullName} (${user.employeeId})`, 'success');
      showDialog({
        title: 'Thành công',
        message: `Đã mở khóa tài khoản ${user.fullName} thành công.`,
        type: 'success'
      });
    } else {
      // Trigger Lock Reason Modal
      setLockingUser(user);
      setLockReasonType('Nghỉ việc');
      setCustomLockReason('');
    }
  };

  const handleConfirmLock = () => {
    if (!lockingUser) return;
    
    const finalReason = lockReasonType === 'Khác' ? customLockReason.trim() : lockReasonType;
    if (lockReasonType === 'Khác' && !finalReason) {
      showDialog({
        title: 'Lỗi nhập liệu',
        message: 'Vui lòng nhập lý do khóa tài khoản chi tiết.',
        type: 'warning'
      });
      return;
    }

    setAllUsers(prev => prev.map(u => {
      if (u.employeeId === lockingUser.employeeId) {
        return { ...u, isLocked: true, lockReason: finalReason };
      }
      return u;
    }));

    pushLog(`Admin khóa tài khoản: ${lockingUser.fullName} (${lockingUser.employeeId}). Lý do: ${finalReason}`, 'error');
    showDialog({
      title: 'Đã khóa tài khoản',
      message: `Tài khoản của ${lockingUser.fullName} đã bị khóa thành công. Lý do: ${finalReason}`,
      type: 'success'
    });

    setLockingUser(null);
  };

  // Manual Attendance Edit States
  const [editingLog, setEditingLog] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editStatus, setEditStatus] = useState('Hợp lệ');

  const startEditLog = (log) => {
    setEditingLog(log);
    setEditClockIn(log.clockIn === '-' ? '' : log.clockIn.slice(0, 5));
    setEditClockOut(log.clockOut === '-' ? '' : log.clockOut.slice(0, 5));
    setEditStatus(log.status);
  };

  const handleSaveEditedLog = (e) => {
    e.preventDefault();
    if (!editingLog) return;

    const clockInVal = editClockIn ? `${editClockIn}:00` : '-';
    const clockOutVal = editClockOut ? `${editClockOut}:00` : '-';
    
    let hoursVal = 0;
    if (clockInVal !== '-' && clockOutVal !== '-') {
      const [inH, inM] = editClockIn.split(':').map(Number);
      const [outH, outM] = editClockOut.split(':').map(Number);
      hoursVal = parseFloat(Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60).toFixed(1));
    }

    setAttendanceHistory(prev => prev.map(log => {
      if (log.id === editingLog.id) {
        return {
          ...log,
          clockIn: clockInVal,
          clockOut: clockOutVal,
          actualHours: hoursVal,
          status: editStatus
        };
      }
      return log;
    }));

    const empName = allUsers.find(u => u.employeeId === editingLog.employeeId)?.fullName || editingLog.employeeId;
    pushLog(`Admin sửa thủ công chấm công nhân sự ${empName} ngày ${editingLog.date} thành [In: ${clockInVal}, Out: ${clockOutVal}, TT: ${editStatus}]`, 'success');
    
    showDialog({
      title: 'Đã cập nhật giờ công',
      message: `Đã cập nhật lịch sử chấm công ngày ${editingLog.date} cho nhân sự thành công.`,
      type: 'success'
    });

    setEditingLog(null);
  };

  // Dynamic CRUD state
  const [newDept, setNewDept] = useState('');
  const [newPos, setNewPos] = useState('');
  
  // Rejection modal state
  const [rejectingReqId, setRejectingReqId] = useState(null);
  const [rejectComment, setRejectComment] = useState('');

  // Timesheet grid simulation states
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [timesheetSearch, setTimesheetSearch] = useState('');

  // Manual attendance edit filter states
  const [manualSearch, setManualSearch] = useState('');
  const [manualMonthVal, setManualMonthVal] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualStatus, setManualStatus] = useState('');

  // Request approval filter states
  const [reqSearch, setReqSearch] = useState('');
  const [reqType, setReqType] = useState('');
  const [reqStatus, setReqStatus] = useState('');

  // Account manager filter state
  const [accountSearch, setAccountSearch] = useState('');

  // 1. Dynamic CRUD executions (No hardcoded references)
  const handleAddDept = (e) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    if (departments.includes(newDept.trim())) {
      showDialog({
        title: 'Trùng lặp tên',
        message: 'Tên phòng ban này đã tồn tại trong hệ thống.',
        type: 'warning'
      });
      return;
    }
    setDepartments(prev => [...prev, newDept.trim()]);
    pushLog(`Admin tạo phòng ban mới: ${newDept.trim()}`, 'success');
    setNewDept('');
  };

  const handleDeleteDept = (deptName) => {
    // Safety check: verify if any user belongs to this department
    const isDeptOccupied = allUsers.some(u => u.department === deptName);
    if (isDeptOccupied) {
      showDialog({
        title: 'Không thể xoá phòng ban',
        message: `Không thể xoá phòng ban "${deptName}" vì đang có nhân sự thuộc phòng ban này. Vui lòng điều chuyển các nhân sự sang phòng ban khác trước!`,
        type: 'error'
      });
      pushLog(`Xoá phòng ban bị từ chối: Phòng "${deptName}" vẫn còn nhân sự hoạt động.`, 'error');
      return;
    }

    const originalDepts = [...departments];
    setDepartments(prev => prev.filter(d => d !== deptName));
    pushLog(`Yêu cầu xóa phòng ban: ${deptName}`, 'warning');

    triggerUndo(
      `Đã xóa phòng ban "${deptName}"`,
      () => {
        pushLog(`Admin xóa vĩnh viễn phòng ban: ${deptName}`, 'error');
      },
      () => {
        setDepartments(originalDepts);
        pushLog(`Hoàn tác xóa phòng ban: ${deptName}`, 'success');
      }
    );
  };

  const handleAddPos = (e) => {
    e.preventDefault();
    if (!newPos.trim()) return;
    if (positions.includes(newPos.trim())) {
      showDialog({
        title: 'Trùng lặp tên',
        message: 'Tên chức vụ này đã tồn tại trong hệ thống.',
        type: 'warning'
      });
      return;
    }
    setPositions(prev => [...prev, newPos.trim()]);
    pushLog(`Admin tạo chức vụ mới: ${newPos.trim()}`, 'success');
    setNewPos('');
  };

  const handleDeletePos = (posName) => {
    // Safety check: verify if any user holds this position
    const isPosOccupied = allUsers.some(u => u.position === posName);
    if (isPosOccupied) {
      showDialog({
        title: 'Không thể xoá chức vụ',
        message: `Không thể xoá chức vụ "${posName}" vì đang có nhân sự giữ chức vụ này. Vui lòng điều chuyển các nhân sự sang chức vụ khác trước!`,
        type: 'error'
      });
      pushLog(`Xoá chức vụ bị từ chối: Chức vụ "${posName}" vẫn còn nhân sự hoạt động.`, 'error');
      return;
    }

    const originalPositions = [...positions];
    setPositions(prev => prev.filter(p => p !== posName));
    pushLog(`Yêu cầu xóa chức vụ: ${posName}`, 'warning');

    triggerUndo(
      `Đã xóa chức vụ "${posName}"`,
      () => {
        pushLog(`Admin xóa vĩnh viễn chức vụ: ${posName}`, 'error');
      },
      () => {
        setPositions(originalPositions);
        pushLog(`Hoàn tác xóa chức vụ: ${posName}`, 'success');
      }
    );
  };

  // 2. Approval Center click triggers
  const handleApproveRequest = (reqId) => {
    // Quick action: instantly updates state & replaces buttons with status text
    pushLog(`Admin phê duyệt nhanh đơn số REQ${reqId.toString().slice(-4)}`);
    const targetReq = requests.find(r => r.id === reqId);
    
    // Update request status to Approved
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        return { ...req, status: 'Approved' };
      }
      return req;
    }));
    
    // If it is a punch correction request, automatically apply it to the attendance logs!
    if (targetReq && targetReq.type.includes('Giải trình')) {
      const isCheckInCorrection = targetReq.type.includes('check-in');
      const targetDate = targetReq.fromDate; // format YYYY-MM-DD
      const targetTime = targetReq.correctedTime ? `${targetReq.correctedTime}:00` : '08:00:00';
      const employeeId = targetReq.employeeId;
      
      setAttendanceHistory(prev => {
        // Look up if a record for this date & employee exists
        const logIndex = prev.findIndex(log => log.date === targetDate && log.employeeId === employeeId);
        
        if (logIndex !== -1) {
          // Record exists, let's update it!
          return prev.map((log, idx) => {
            if (idx === logIndex) {
              const updatedLog = { ...log };
              if (isCheckInCorrection) {
                updatedLog.clockIn = targetTime;
                if (updatedLog.clockOut === '-' || updatedLog.clockOut === '') {
                  updatedLog.clockOut = '12:00:00'; // default morning ca
                }
              } else {
                updatedLog.clockOut = targetTime;
                if (updatedLog.clockIn === '-' || updatedLog.clockIn === '') {
                  updatedLog.clockIn = '08:00:00';
                }
              }
              
              // Recalculate hours
              if (updatedLog.clockIn !== '-' && updatedLog.clockOut !== '-') {
                const [inH, inM] = updatedLog.clockIn.split(':').map(Number);
                const [outH, outM] = updatedLog.clockOut.split(':').map(Number);
                
                const timeInMin = inH * 60 + inM;
                const timeOutMin = outH * 60 + outM;
                
                const diffHours = Math.max(0, (timeOutMin - timeInMin) / 60).toFixed(1);
                updatedLog.actualHours = parseFloat(diffHours);
              }
              
              updatedLog.status = 'Hợp lệ'; // Marked valid after correction approval
              return updatedLog;
            }
            return log;
          });
        } else {
          // Record does not exist, create a new one!
          const clockInStr = isCheckInCorrection ? targetTime : '08:00:00';
          const clockOutStr = isCheckInCorrection ? '12:00:00' : targetTime;
          
          const [inH, inM] = clockInStr.split(':').map(Number);
          const [outH, outM] = clockOutStr.split(':').map(Number);
          const diffHours = Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60).toFixed(1);
          
          const newLog = {
            id: Date.now(),
            date: targetDate,
            employeeId: employeeId,
            shift: isCheckInCorrection ? 'Ca Sáng (08:00 - 12:00)' : 'Ca Chiều (13:30 - 17:30)',
            clockIn: clockInStr,
            clockOut: clockOutStr,
            actualHours: parseFloat(diffHours),
            status: 'Hợp lệ'
          };
          return [newLog, ...prev];
        }
      });
      
      pushLog(`Đã tự động điều chỉnh lịch sử chấm công ngày ${targetDate} cho nhân sự ${targetReq.employeeName}. Giờ mới: ${targetTime}.`, 'success');
    }

    pushLog(`Đơn REQ${reqId.toString().slice(-4)} đã được chuyển trạng thái: ĐÃ DUYỆT`, 'success');
    addNotification('Phê duyệt đơn từ', `Đơn ${targetReq?.type || 'yêu cầu'} của ${targetReq?.employeeName || 'nhân viên'} đã được ĐỒNG Ý.`, 'success');
    confetti({ particleCount: 50, spread: 40 });
  };

  const handleRejectClick = (reqId) => {
    setRejectingReqId(reqId);
    setRejectComment('');
  };

  const submitReject = (e) => {
    e.preventDefault();
    if (!rejectComment.trim()) return;

    const reqId = rejectingReqId;
    const targetReq = requests.find(r => r.id === reqId);
    pushLog(`Admin từ chối đơn số REQ${reqId.toString().slice(-4)} với lý do: ${rejectComment.trim()}`);
    
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        return { ...req, status: 'Rejected', comment: rejectComment.trim() };
      }
      return req;
    }));

    setRejectingReqId(null);
    pushLog(`Đơn REQ${reqId.toString().slice(-4)} đã được chuyển trạng thái: TỪ CHỐI`, 'error');
    addNotification('Từ chối đơn từ', `Đơn ${targetReq?.type || 'yêu cầu'} của ${targetReq?.employeeName || 'nhân viên'} đã bị TỪ CHỐI. Lý do: ${rejectComment.trim()}`, 'error');
  };

  // 3. Admin self-demotion protection rule
  const handleAdminRoleChange = (userId, newRole) => {
    // Safeguard constraint: check if the admin is trying to demote their own account
    if (userId === currentUser.employeeId && newRole !== 'Admin') {
      showDialog({
        title: 'Bảo mật tối cao chặn',
        message: 'Hệ thống bảo mật tối cao ngăn chặn tài khoản Admin tự tước quyền hoặc hạ vai trò của chính mình.',
        type: 'error'
      });
      pushLog('Bảo mật chặn: Admin không được tự hạ quyền bản thân.', 'error');
      return;
    }

    pushLog(`Admin thay đổi vai trò của nhân sự ID: ${userId} thành ${newRole}`);
    setAllUsers(prev => prev.map(u => {
      if (u.employeeId === userId) {
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  // 4. Matrix Timesheet grid calculations
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  
  // Simulated matrix grid mapping for users
  const mockTimesheetGrid = allUsers.map(user => {
    const row = { employeeId: user.employeeId, fullName: user.fullName };
    let worked = 0;
    let paidLeave = 0;
    let unpaidLeave = 0;
    
    daysInMonth.forEach(d => {
      // Simulate random statuses for grid
      let val = 'X'; // Default worked
      if (d % 10 === 0) {
        val = 'P'; // paid leave
        paidLeave++;
      } else if (d % 15 === 0) {
        val = 'Ro'; // unpaid leave
        unpaidLeave++;
      } else {
        worked++;
      }
      row[`day_${d}`] = val;
    });
    
    row.worked = worked;
    row.paidLeave = paidLeave;
    row.unpaidLeave = unpaidLeave;
    return row;
  });

  // Filtered rows for empty state checks
  const filteredTimesheet = mockTimesheetGrid.filter(row => {
    const q = timesheetSearch.toLowerCase();
    return (
      row.fullName.toLowerCase().includes(q) ||
      row.employeeId.toLowerCase().includes(q)
    );
  });

  // 5. Filtered manual attendance edit log
  const filteredManualLogs = attendanceHistory.filter(log => {
    const emp = allUsers.find(u => u.employeeId === log.employeeId);
    const empName = emp?.fullName || '';
    const matchSearch = !manualSearch ||
      empName.toLowerCase().includes(manualSearch.toLowerCase()) ||
      log.employeeId.toLowerCase().includes(manualSearch.toLowerCase());
    const matchMonth = !manualMonthVal || new Date(log.date).getMonth() + 1 === Number(manualMonthVal);
    const matchYear  = !manualYear  || new Date(log.date).getFullYear() === Number(manualYear);
    const matchStatus = !manualStatus || log.status === manualStatus;
    return matchSearch && matchMonth && matchYear && matchStatus;
  });

  // 6. Filtered requests for approval center
  const filteredRequests = requests.filter(req => {
    const matchSearch = !reqSearch ||
      req.employeeName.toLowerCase().includes(reqSearch.toLowerCase()) ||
      req.employeeId.toLowerCase().includes(reqSearch.toLowerCase());
    const matchType   = !reqType   || req.type === reqType;
    const matchStatus = !reqStatus || req.status === reqStatus;
    return matchSearch && matchType && matchStatus;
  });

  // 7. Filtered accounts for account manager
  const filteredAccounts = allUsers.filter(user => {
    if (!accountSearch) return true;
    const q = accountSearch.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(q) ||
      user.employeeId.toLowerCase().includes(q) ||
      (user.department || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    if (filteredTimesheet.length === 0) {
      showDialog({
        title: 'Lỗi xuất tệp',
        message: 'Không thể xuất tệp: Bảng công hiện tại đang trống.',
        type: 'error'
      });
      return;
    }
    pushLog('Admin kết xuất thành công bảng công tổng hợp CSV/Excel.', 'success');
    showDialog({
      title: 'Xuất file thành công',
      message: 'Hệ thống đã kết xuất thành công bảng công tổng hợp và đang tải xuống thiết bị của bạn.',
      type: 'success'
    });
  };

  return (
    <div className="space-y-8">
      
      {/* 2. Approval Center */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-200">Trung tâm Phê duyệt Đơn từ tập trung</h3>
              <p className="text-slate-500 text-xs mt-0.5">Duyệt hoặc từ chối các đơn nghỉ/tăng ca/giải trình của nhân viên.</p>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{filteredRequests.length} / {requests.length} đơn</span>
          </div>
          {/* Filter bar */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <input
                type="text"
                placeholder="Tìm tên / mã NV..."
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {reqSearch && <button onClick={() => setReqSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">✕</button>}
            </div>
            <select value={reqType} onChange={(e) => setReqType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="">Tất cả loại đơn</option>
              <option value="Xin nghỉ phép">Xin nghỉ phép</option>
              <option value="Đăng ký tăng ca">Đăng ký tăng ca</option>
              <option value="Giải trình quên check-in">Giải trình quên check-in</option>
              <option value="Giải trình quên check-out">Giải trình quên check-out</option>
            </select>
            <select value={reqStatus} onChange={(e) => setReqStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ duyệt</option>
              <option value="Approved">Đã duyệt</option>
              <option value="Rejected">Đã từ chối</option>
            </select>
            {(reqSearch || reqType || reqStatus) && (
              <button onClick={() => { setReqSearch(''); setReqType(''); setReqStatus(''); }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-750">
                ↺ Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="px-6 py-4">Nhân viên</th>
                  <th className="px-6 py-4">Loại Yêu Cầu</th>
                  <th className="px-6 py-4">Ngày Yêu Cầu</th>
                  <th className="px-6 py-4">Lý Do Đề Xuất</th>
                  <th className="px-6 py-4 text-center">Hành Động Phê Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/80">
                {filteredRequests.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">
                    {requests.length === 0 ? 'Chưa có đơn từ nào.' : 'Không tìm thấy đơn từ phù hợp bộ lọc.'}
                  </td></tr>
                ) : filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-900/10 transition duration-150">
                    <td className="px-6 py-4 font-medium text-slate-200">{req.employeeName} <span className="text-slate-500 block text-xs">Mã: {req.employeeId}</span></td>
                    <td className="px-6 py-4 font-semibold text-slate-350">{req.type}</td>
                    <td className="px-6 py-4 text-slate-400">{req.fromDate === req.toDate ? formatDate(req.fromDate) : `${formatDate(req.fromDate)} - ${formatDate(req.toDate)}`}</td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="px-6 py-4 text-center">
                      {req.status === 'Pending' ? (
                        <div className="inline-flex gap-2">
                          <button onClick={() => handleApproveRequest(req.id)}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition">Duyệt nhanh</button>
                          <button onClick={() => handleRejectClick(req.id)}
                            className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-lg text-xs transition">Từ chối</button>
                        </div>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          req.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {req.status === 'Approved' ? 'Đã duyệt' : 'Đã từ chối'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 1. Dynamic CRUD Rooms & Titles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Dynamic Departments CRUD */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-slate-200">Quản lý Phòng Ban (CRUD Động)</h3>
          
          <form onSubmit={handleAddDept} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Tên phòng ban mới..."
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 rounded-xl text-xs flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> Thêm
            </button>
          </form>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 max-h-48 overflow-y-auto space-y-1.5">
            {departments.map((dept) => (
              <div key={dept} className="flex justify-between items-center bg-slate-900/40 px-3.5 py-2.5 rounded-lg border border-slate-800 text-xs">
                <span className="font-medium text-slate-300">{dept}</span>
                <button
                  onClick={() => handleDeleteDept(dept)}
                  className="text-slate-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Positions CRUD */}
        <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-slate-200">Quản lý Chức Vụ (CRUD Động)</h3>
          
          <form onSubmit={handleAddPos} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Tên chức vụ mới..."
              value={newPos}
              onChange={(e) => setNewPos(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 rounded-xl text-xs flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> Thêm
            </button>
          </form>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-855 max-h-48 overflow-y-auto space-y-1.5">
            {positions.map((pos) => (
              <div key={pos} className="flex justify-between items-center bg-slate-900/40 px-3.5 py-2.5 rounded-lg border border-slate-800 text-xs">
                <span className="font-medium text-slate-300">{pos}</span>
                <button
                  onClick={() => handleDeletePos(pos)}
                  className="text-slate-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 2.5 User Account Manager Grid */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-200">Quản lý Tài khoản Hệ thống</h3>
              <p className="text-slate-500 text-xs mt-0.5">Thêm mới, sửa đổi thông tin và phân quyền truy cập cho nhân sự trong doanh nghiệp.</p>
            </div>
            <button
              onClick={openAddAccountModal}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Tạo tài khoản mới
            </button>
          </div>
          {/* Search bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Tìm tên, mã NV, phòng ban, vai trò..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {accountSearch && <button onClick={() => setAccountSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">✕</button>}
            </div>
            <span className="text-xs text-slate-500 shrink-0">{filteredAccounts.length} / {allUsers.length} tài khoản</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900">
                <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-850">
                  <th className="px-6 py-3.5">Mã NV / Họ Tên</th>
                  <th className="px-6 py-3.5">Email liên hệ</th>
                  <th className="px-6 py-3.5">Phòng ban</th>
                  <th className="px-6 py-3.5">Chức vụ</th>
                  <th className="px-6 py-3.5 text-center">Vai trò (Role)</th>
                  <th className="px-6 py-3.5 text-center">Trạng thái hồ sơ</th>
                  <th className="px-6 py-3.5 text-center">Trạng thái</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-slate-300">
                {filteredAccounts.length === 0 ? (
                  <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500 italic">Không tìm thấy tài khoản phù hợp.</td></tr>
                ) : filteredAccounts.map((user) => (
                  <tr key={user.employeeId} className="hover:bg-slate-900/10 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.fullName.split(' ').pop().substring(0, 2)}
                        </div>
                        <div>
                          <span className="block text-slate-200">{user.fullName}</span>
                          <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{user.employeeId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-350">{user.email}</td>
                    <td className="px-6 py-3.5 text-slate-400">{user.department || <span className="text-slate-600 italic">Chưa xếp</span>}</td>
                    <td className="px-6 py-3.5 text-slate-400">{user.position || <span className="text-slate-600 italic">Chưa xếp</span>}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        user.role === 'Admin' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                        user.role === 'HR' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' :
                        user.role === 'KeToan' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        user.isProfileComplete
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      }`}>
                        {user.isProfileComplete ? 'Đã hoàn thiện' : 'Chờ hoàn thiện'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        user.isLocked
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {user.isLocked ? 'Bị khóa' : 'Hoạt động'}
                      </span>
                      {user.isLocked && user.lockReason && (
                        <span className="block text-[9px] text-slate-500 mt-1 max-w-[120px] mx-auto truncate" title={user.lockReason}>
                          Lý do: {user.lockReason}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button onClick={() => handleToggleLockAccount(user)}
                          className={`p-1.5 rounded-lg transition border ${
                            user.isLocked
                              ? 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 text-rose-400 border-rose-500/30'
                          }`} title={user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}>
                          {user.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => openEditAccountModal(user)}
                          className="p-1.5 bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-400 rounded-lg transition border border-slate-700" title="Chỉnh sửa tài khoản">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteAccount(user)}
                          className="p-1.5 bg-slate-850 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 rounded-lg transition border border-slate-800" title="Xóa tài khoản">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Timesheet Matrix Grid */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-200">Bảng Công Tổng Hợp Tháng</h3>
            <p className="text-slate-500 text-xs mt-0.5">Ký hiệu mã hoá: X (Đi làm), P (Nghỉ phép hưởng lương), Ro (Nghỉ không lương)</p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={timesheetSearch}
              onChange={(e) => setTimesheetSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 w-44"
            />
            {/* Export excel validator constraints */}
            {currentUser.role === 'Admin' && (
              <button
                disabled={filteredTimesheet.length === 0}
                onClick={handleExport}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                Xuất file
              </button>
            )}
          </div>
        </div>

        <div className="overflow-auto max-w-full min-h-[320px] max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-850">
                <th className="px-4 py-3 shrink-0 min-w-[120px] sticky left-0 top-0 bg-slate-950 border-r border-slate-800 z-40">Nhân viên</th>
                <th className="px-3 py-3 text-center min-w-[50px] text-emerald-400 font-bold border-r border-slate-800 bg-slate-950/80 sticky top-0 z-20">Công</th>
                <th className="px-3 py-3 text-center min-w-[50px] text-blue-400 font-bold border-r border-slate-800 bg-slate-950/80 sticky top-0 z-20">Phép</th>
                <th className="px-3 py-3 text-center min-w-[50px] text-rose-400 font-bold border-r border-slate-800 bg-slate-950/80 sticky top-0 z-20">Nghỉ</th>
                {daysInMonth.map((d) => (
                  <th key={d} className="px-2 py-3 text-center min-w-[30px] bg-slate-950 sticky top-0 z-10">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60">
              {filteredTimesheet.length === 0 ? (
                <tr>
                  <td colSpan="35" className="px-6 py-10 text-center text-slate-500 italic">
                    Không tìm thấy nhân viên nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTimesheet.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-900/10">
                    <td className="px-4 py-2.5 font-medium text-slate-250 sticky left-0 bg-slate-900 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                      {row.fullName}
                      <span className="block text-[10px] text-slate-500">ID: {row.employeeId}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-400 bg-slate-900/60 border-r border-slate-800">{row.worked}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-400 bg-slate-900/40 border-r border-slate-800">{row.paidLeave}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-rose-400 bg-slate-900/40 border-r border-slate-800">{row.unpaidLeave}</td>
                    {daysInMonth.map((d) => {
                      const code = row[`day_${d}`];
                      return (
                        <td key={d} className="px-1.5 py-2.5 text-center">
                          <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-bold w-6 ${
                            code === 'X' ? 'bg-emerald-500/15 text-emerald-400' :
                            code === 'P' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-rose-500/15 text-rose-400'
                          }`}>
                            {code}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attendance Editor Section */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-200">Bảng Chỉnh Sửa Giờ Công Thủ Công</h3>
              <p className="text-slate-500 text-xs mt-0.5">Admin trực tiếp can thiệp, ghi đè giờ check-in, check-out và trạng thái công cho từng nhân sự.</p>
            </div>
            <span className="text-xs text-slate-500 shrink-0 mt-1">
              {filteredManualLogs.length} / {attendanceHistory.length} bản ghi
            </span>
          </div>

          {/* Filter bar */}
          <div className="mt-4 flex flex-wrap gap-2.5">
            {/* Name/ID search */}
            <div className="relative flex-1 min-w-[160px]">
              <input
                type="text"
                placeholder="Tìm tên nhân viên hoặc mã NV..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {manualSearch && (
                <button
                  onClick={() => setManualSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >✕</button>
              )}
            </div>

            {/* Month filter */}
            <select
              value={manualMonthVal}
              onChange={(e) => setManualMonthVal(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>

            {/* Year filter */}
            <select
              value={manualYear}
              onChange={(e) => setManualYear(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Tất cả năm</option>
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={manualStatus}
              onChange={(e) => setManualStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Hợp lệ">Hợp lệ</option>
              <option value="Đi muộn">Đi muộn</option>
              <option value="Về sớm">Về sớm</option>
              <option value="Nghỉ phép">Nghỉ phép</option>
              <option value="Vắng mặt">Vắng mặt</option>
              <option value="Nghỉ không phép">Nghỉ không phép</option>
            </select>

            {/* Reset button — only show when filters are active */}
            {(manualSearch || manualMonthVal || manualYear || manualStatus) && (
              <button
                onClick={() => { setManualSearch(''); setManualMonth(''); setManualStatus(''); }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-750"
              >
                ↺ Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Scrollable table */}
        <div className="overflow-x-auto">
          <div className="h-[480px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-850">
                  <th className="px-4 py-3">Nhân sự</th>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3">Ca làm</th>
                  <th className="px-4 py-3 text-center">Check-in</th>
                  <th className="px-4 py-3 text-center">Check-out</th>
                  <th className="px-4 py-3 text-center">Số giờ</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-slate-300">
                {filteredManualLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <span className="text-2xl">&#128269;</span>
                        <span className="italic text-xs">
                          {attendanceHistory.length === 0
                            ? 'Chưa có bản ghi lịch sử chấm công nào trong hệ thống.'
                            : 'Không tìm thấy bản ghi nào phù hợp bộ lọc đã chọn.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredManualLogs.map((log) => {
                    const emp = allUsers.find(u => u.employeeId === log.employeeId) || { fullName: 'Không rõ', employeeId: log.employeeId };
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/10">
                        <td className="px-4 py-3 font-semibold text-slate-200">
                          {emp.fullName}
                          <span className="block text-[10px] text-slate-500">ID: {log.employeeId}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-350">{log.date}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate" title={log.shift}>{log.shift}</td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-400">{log.clockIn}</td>
                        <td className="px-4 py-3 text-center font-mono text-rose-400">{log.clockOut}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-200">{log.actualHours}h</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            log.status === 'Hợp lệ' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            log.status === 'Đi muộn' || log.status === 'Về sớm' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => startEditLog(log)}
                            className="bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-400 px-3 py-1.5 rounded-xl border border-slate-750 font-bold text-[10px] transition flex items-center gap-1 ml-auto"
                          >
                            <Edit2 className="w-3 h-3" />
                            Sửa giờ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Edit Overlay Modal Popup */}
      {editingLog && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-[4px] flex items-center justify-center z-[9998] p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-teal-500/10 blur-2xl rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/5">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">Điều chỉnh Giờ Công</h4>
                <p className="text-[10px] text-slate-500 font-medium">Nhân viên: {allUsers.find(u => u.employeeId === editingLog.employeeId)?.fullName || editingLog.employeeId} - Ngày {editingLog.date}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditedLog} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Giờ Check-in (Clock In)</label>
                <input
                  type="time"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Giờ Check-out (Clock Out)</label>
                <input
                  type="time"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Trạng thái chấm công</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Hợp lệ">Hợp lệ</option>
                  <option value="Đi muộn">Đi muộn</option>
                  <option value="Về sớm">Về sớm</option>
                  <option value="Vắng mặt">Vắng mặt</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl transition border border-slate-750 font-bold text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/15 transition text-xs"
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Safety self-demote constraints check */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="font-bold text-slate-200">Cấu hình bảo vệ tài khoản Admin</h3>
          <p className="text-slate-400 text-xs mt-1">Hệ thống an toànGENX PKS chặn không cho tài khoản Admin đang đăng nhập tự thay đổi hạ cấp quyền của bản thân.</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center font-bold text-rose-400 uppercase">
              AD
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">{currentUser.fullName}</h4>
              <span className="text-slate-500 text-xs block">Tài khoản Admin hiện hành ({currentUser.employeeId})</span>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="text-xs font-semibold text-slate-400 self-center">Vai trò hiện tại:</span>
            <select
              value={currentUser.role}
              onChange={(e) => handleAdminRoleChange(currentUser.employeeId, e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 focus:outline-none"
            >
              <option value="Admin">Admin (Không thể đổi)</option>
              <option value="NhanVien">NhanVien (Nhân viên)</option>
              <option value="KeToan">KeToan (Kế toán)</option>
              <option value="HR">HR (Nhân sự)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Attendance Parameters Configuration */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-400" />
            Cấu hình Tham số Chấm công (WiFi / GPS / Đi muộn)
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">Cấu hình các điều kiện kỹ thuật của thiết bị để chấm công hợp lệ.</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             {/* Allowed IP Wifi */}
            <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-855 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Địa chỉ IP Wifi cho phép</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Các địa chỉ IP tĩnh (chi nhánh) được phép chấm công. Nhập IP và nhấn Thêm.
                </p>
              </div>
              
              {/* Chip list of current IPs */}
              <div className="flex flex-wrap gap-1.5 mt-3.5 min-h-[38px] max-h-24 overflow-y-auto bg-slate-900/40 p-1.5 rounded-xl border border-slate-800/60">
                {allowedWifiIp.split(',').map(ip => ip.trim()).filter(Boolean).length === 0 ? (
                  <span className="text-[10px] text-slate-600 italic px-1.5 py-0.5">Chưa cấu hình IP</span>
                ) : (
                  allowedWifiIp.split(',').map(ip => ip.trim()).filter(Boolean).map(ip => (
                    <span key={ip} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-semibold">
                      {ip}
                      <button 
                        type="button"
                        onClick={() => {
                          const nextIps = allowedWifiIp.split(',').map(item => item.trim()).filter(item => item && item !== ip).join(', ');
                          setAllowedWifiIp(nextIps);
                        }}
                        className="hover:text-rose-400 ml-0.5 text-xs font-bold transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add IP input field */}
              <div className="flex gap-1.5 mt-3">
                <input
                  type="text"
                  id="new-ip-input"
                  placeholder="Thêm IP mới..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-teal-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.target.value.trim();
                      if (val) {
                        const currentList = allowedWifiIp.split(',').map(item => item.trim()).filter(Boolean);
                        if (!currentList.includes(val)) {
                          currentList.push(val);
                          setAllowedWifiIp(currentList.join(', '));
                          e.target.value = '';
                        }
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('new-ip-input');
                    const val = input ? input.value.trim() : '';
                    if (val) {
                      const currentList = allowedWifiIp.split(',').map(item => item.trim()).filter(Boolean);
                      if (!currentList.includes(val)) {
                        currentList.push(val);
                        setAllowedWifiIp(currentList.join(', '));
                        if (input) input.value = '';
                      }
                    }
                  }}
                  className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-3 rounded-xl text-[10px] transition"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* Allowed GPS distance range */}
            <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-855 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Bán kính GPS cho phép (mét)</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Khoảng cách sai số tối đa so với tọa độ văn phòng cho phép.
                </p>
              </div>
              <div className="relative mt-3.5">
                <input
                  type="number"
                  value={allowedDistance}
                  onChange={(e) => setAllowedDistance(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  placeholder="Ví dụ: 100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">m</span>
              </div>
            </div>

            {/* Grace Period */}
            <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-855 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Thời gian cho phép đi muộn (phút)</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Thời gian đi làm trễ tối đa so với ca làm việc mà không bị tính đi muộn.
                </p>
              </div>
              <div className="relative mt-3.5">
                <input
                  type="number"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-12 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  placeholder="Ví dụ: 10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">phút</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                pushLog(`Cập nhật cấu hình chấm công: IP Wifi=${allowedWifiIp}, GPS Radius=${allowedDistance}m, GracePeriod=${gracePeriod} phút.`, 'success');
                showDialog({
                  title: 'Cập nhật cấu hình',
                  message: 'Các tham số chấm công đã được áp dụng thành công trên toàn hệ thống.',
                  type: 'success'
                });
                confetti({ particleCount: 40, spread: 30 });
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition"
            >
              Lưu cấu hình hệ thống
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Reason Input Modal */}
      {rejectingReqId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3.5 bg-rose-500/10 rounded-full text-rose-500">
                <FileX className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">Lý do từ chối yêu cầu</h4>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Nhập lý do từ chối cụ thể cho đơn yêu cầu này.
                </p>
              </div>

              <form onSubmit={submitReject} className="w-full space-y-3.5">
                <textarea
                  required
                  rows={3}
                  placeholder="Nhập lý do từ chối..."
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
                />
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingReqId(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-semibold rounded-xl text-slate-355 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={rejectComment.trim() === ''}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-550 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Xác nhận từ chối
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Account Add/Edit Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-[4px] flex items-center justify-center z-[9998] p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-teal-500/10 blur-2xl rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/5">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">{editingAccount ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{editingAccount ? `Mã nhân sự: ${accountForm.employeeId}` : 'Nhập thông tin ban đầu cấp phát tài khoản'}</p>
              </div>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Mã nhân viên (ID) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingAccount}
                    value={accountForm.employeeId}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn X"
                    value={accountForm.fullName}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Địa chỉ Email *</label>
                <input
                  type="email"
                  required
                  placeholder="nvx@genxpks.com"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Phòng ban phân bổ</label>
                  <select
                    value={accountForm.department}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Chức vụ chuyên môn</label>
                  <select
                    value={accountForm.position}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Chọn chức vụ --</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Vai trò phân quyền hệ thống</label>
                <select
                  value={accountForm.role}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="NhanVien">NhanVien (Nhân viên)</option>
                  <option value="KeToan">KeToan (Kế toán)</option>
                  <option value="HR">HR (Nhân sự)</option>
                  <option value="Admin">Admin (Quản trị hệ thống)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl transition border border-slate-750 font-bold text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/15 transition text-xs"
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Locking Reason Input Modal */}
      {lockingUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-950 p-6 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-slate-100">Yêu cầu khóa tài khoản</h3>
              </div>
              <button 
                onClick={() => setLockingUser(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Bạn đang yêu cầu khóa tài khoản của nhân viên <strong className="text-slate-250 font-semibold">{lockingUser.fullName}</strong> (Mã NV: <strong className="text-slate-250 font-mono">{lockingUser.employeeId}</strong>). 
                Vui lòng cung cấp lý do khóa tài khoản này:
              </p>

              <div className="space-y-1.5">
                <label className="text-slate-500 block font-bold uppercase text-[10px] tracking-wider">Lý do khóa tài khoản *</label>
                <select
                  value={lockReasonType}
                  onChange={(e) => setLockReasonType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="Nghỉ việc">Nghỉ việc (Chấm dứt hợp đồng lao động)</option>
                  <option value="Vi phạm nội quy">Vi phạm nghiêm trọng nội quy công ty</option>
                  <option value="Tạm ngưng hoạt động">Tạm ngưng công tác / Nghỉ thai sản</option>
                  <option value="Khác">Khác (Nhập lý do chi tiết dưới đây)</option>
                </select>
              </div>

              {lockReasonType === 'Khác' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-slate-500 block font-bold uppercase text-[10px] tracking-wider">Chi tiết lý do khóa khác *</label>
                  <textarea
                    required
                    rows={3}
                    maxLength={150}
                    placeholder="Vui lòng nhập lý do khóa chi tiết..."
                    value={customLockReason}
                    onChange={(e) => setCustomLockReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLockingUser(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl transition border border-slate-750 font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLock}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-rose-500/15 transition"
                >
                  Khóa tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


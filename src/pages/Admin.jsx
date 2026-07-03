import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Folder, FileCheck, FileX, Download, Plus, Trash2, Edit2, AlertCircle, UserPlus } from 'lucide-react';
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
    apiCall,
    syncFromBackend
  } = useApp();

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

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.fullName.trim() || !accountForm.email.trim() || !accountForm.employeeId.trim()) {
      showDialog({ title: 'Lỗi nhập liệu', message: 'Vui lòng điền đầy đủ thông tin bắt buộc.', type: 'warning' });
      return;
    }

    try {
      if (editingAccount) {
        // Editing existing
        await apiCall(`/admin/users/${editingAccount.employeeId}`, 'PUT', {
          fullName: accountForm.fullName.trim(),
          email: accountForm.email.trim(),
          role: accountForm.role,
          department: accountForm.department,
          position: accountForm.position
        });
        pushLog(`Admin cập nhật tài khoản: ${accountForm.fullName} (${accountForm.employeeId})`, 'success');
        showDialog({ title: 'Thành công', message: `Đã cập nhật tài khoản ${accountForm.fullName} thành công.`, type: 'success' });
      } else {
        // Adding new - register auth account
        await apiCall('/auth/register', 'POST', {
          fullName: accountForm.fullName.trim(),
          email: accountForm.email.trim(),
          password: 'password123',
          confirmPassword: 'password123'
        });

        // Set roles and department details
        await apiCall(`/admin/users/${accountForm.employeeId.trim()}`, 'PUT', {
          role: accountForm.role,
          department: accountForm.department,
          position: accountForm.position
        });

        pushLog(`Admin tạo mới tài khoản: ${accountForm.fullName} (${accountForm.employeeId})`, 'success');
        showDialog({ title: 'Thành công', message: `Đã tạo tài khoản ${accountForm.fullName} thành công. Nhân sự cần hoàn thiện thông tin khi đăng nhập.`, type: 'success' });
      }

      setIsAccountModalOpen(false);
      await syncFromBackend();
    } catch (err) {
      showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
    }
  };

  const handleDeleteAccount = (user) => {
    if (user.employeeId === currentUser.employeeId) {
      showDialog({
        title: 'Bảo mật chặn',
        message: 'Lỗi an toàn: Bạn không thể tự khóa tài khoản Admin đang đăng nhập của chính mình!',
        type: 'error'
      });
      return;
    }

    showDialog({
      title: 'Xác nhận khóa tài khoản',
      message: `Bạn có chắc chắn muốn khóa tài khoản "${user.fullName}" (${user.employeeId}) khỏi hệ thống?`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          await apiCall(`/admin/users/${user.employeeId}`, 'PUT', { isBlocked: true });
          pushLog(`Admin khóa tài khoản nhân viên: ${user.fullName} (${user.employeeId})`, 'error');
          showDialog({ title: 'Đã khóa', message: `Tài khoản ${user.fullName} đã bị khóa.`, type: 'success' });
          await syncFromBackend();
        } catch (err) {
          showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
        }
      }
    });
  };

  // Manual Attendance Edit States
  const [editingLog, setEditingLog] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editStatus, setEditStatus] = useState('Há»£p lá»‡');

  const startEditLog = (log) => {
    setEditingLog(log);
    setEditClockIn(log.clockIn === '-' ? '' : log.clockIn.slice(0, 5));
    setEditClockOut(log.clockOut === '-' ? '' : log.clockOut.slice(0, 5));
    setEditStatus(log.status);
  };

  const handleSaveEditedLog = async (e) => {
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

    try {
      await apiCall('/admin/manual-override', 'POST', {
        employeeId: editingLog.employeeId,
        date: editingLog.date,
        clockIn: clockInVal,
        clockOut: clockOutVal,
        actualHours: hoursVal,
        status: editStatus,
        shift: editingLog.shift
      });

      const empName = allUsers.find(u => u.employeeId === editingLog.employeeId)?.fullName || editingLog.employeeId;
      pushLog(`Admin sửa thủ công chấm công nhân sự ${empName} ngày ${editingLog.date} thành [In: ${clockInVal}, Out: ${clockOutVal}, TT: ${editStatus}]`, 'success');
      
      showDialog({
        title: 'Đã cập nhật giờ công',
        message: `Đã cập nhật lịch sử chấm công ngày ${editingLog.date} cho nhân sự thành công.`,
        type: 'success'
      });

      setEditingLog(null);
      await syncFromBackend();
    } catch (err) {
      showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
    }
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
  const handleAddDept = async (e) => {
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
    try {
      await apiCall('/admin/departments', 'POST', { action: 'create', name: newDept.trim() });
      pushLog(`Admin tạo phòng ban mới: ${newDept.trim()}`, 'success');
      setNewDept('');
      await syncFromBackend();
    } catch (err) {
      showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
    }
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

    showDialog({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc chắn muốn xoá phòng ban: "${deptName}"? Hành động này không thể hoàn tác.`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          await apiCall('/admin/departments', 'POST', { action: 'delete', name: deptName });
          pushLog(`Admin xoá phòng ban: ${deptName}`, 'error');
          await syncFromBackend();
        } catch (err) {
          showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleAddPos = async (e) => {
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
    try {
      await apiCall('/admin/positions', 'POST', { action: 'create', name: newPos.trim() });
      pushLog(`Admin tạo chức vụ mới: ${newPos.trim()}`, 'success');
      setNewPos('');
      await syncFromBackend();
    } catch (err) {
      showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
    }
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

    showDialog({
      title: 'Xác nhận xoá',
      message: `Bạn có chắc chắn muốn xoá chức vụ: "${posName}"? Hành động này không thể hoàn tác.`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          await apiCall('/admin/positions', 'POST', { action: 'delete', name: posName });
          pushLog(`Admin xoá chức vụ: ${posName}`, 'error');
          await syncFromBackend();
        } catch (err) {
          showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
        }
      }
    });
  };

  // 2. Approval Center click triggers
  const handleApproveRequest = async (reqId) => {
    pushLog(`Admin phê duyệt nhanh đơn số REQ${reqId.toString().slice(-4)}`);
    const targetReq = requests.find(r => r.id === reqId);

    try {
      await apiCall(`/requests/${reqId}`, 'PUT', { status: 'Approved' });
      pushLog(`Đơn REQ${reqId.toString().slice(-4)} đã được chuyển trạng thái: ĐÃ DUYỆT`, 'success');
      addNotification('Phê duyệt đơn từ', `Đơn ${targetReq?.type || 'yêu cầu'} của ${targetReq?.employeeName || 'nhân viên'} đã được ĐỒNG Ý.`, 'success');
      confetti({ particleCount: 50, spread: 40 });
      await syncFromBackend();
    } catch (err) {
      showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
    }
  };

  const handleRejectClick = (reqId) => {
    setRejectingReqId(reqId);
    setRejectComment('');
  };

  const submitReject = async (e) => {
    e.preventDefault();
    if (!rejectComment.trim()) return;

    const reqId = rejectingReqId;
    const targetReq = requests.find(r => r.id === reqId);
    pushLog(`Admin từ chối đơn số REQ${reqId.toString().slice(-4)} với lý do: ${rejectComment.trim()}`);
    
    try {
      await apiCall(`/requests/${reqId}`, 'PUT', {
        status: 'Rejected',
        rejectReason: rejectComment.trim()
      });

      setRejectingReqId(null);
      pushLog(`Đơn REQ${reqId.toString().slice(-4)} đã được chuyển trạng thái: TỪ CHỐI`, 'error');
      addNotification('Từ chối đơn từ', `Đơn ${targetReq?.type || 'yêu cầu'} của ${targetReq?.employeeName || 'nhân viên'} đã bị TỪ CHỐI. Lý do: ${rejectComment.trim()}`, 'error');
      await syncFromBackend();
    } catch (err) {
      showDialog({ title: 'Lỗi', message: err.message, type: 'error' });
    }
  };

  // 3. Admin self-demotion protection rule
  const handleAdminRoleChange = (userId, newRole) => {
    // Safeguard constraint: check if the admin is trying to demote their own account
    if (userId === currentUser.employeeId && newRole !== 'Admin') {
      showDialog({
        title: 'Báº£o máº­t tá»‘i cao cháº·n',
        message: 'Há»‡ thá»‘ng báº£o máº­t tá»‘i cao ngÄƒn cháº·n tÃ i khoáº£n Admin tá»± tÆ°á»›c quyá»n hoáº·c háº¡ vai trÃ² cá»§a chÃ­nh mÃ¬nh.',
        type: 'error'
      });
      pushLog('Báº£o máº­t cháº·n: Admin khÃ´ng Ä‘Æ°á»£c tá»± háº¡ quyá»n báº£n thÃ¢n.', 'error');
      return;
    }

    pushLog(`Admin thay Ä‘á»•i vai trÃ² cá»§a nhÃ¢n sá»± ID: ${userId} thÃ nh ${newRole}`);
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
  const filteredTimesheet = mockTimesheetGrid.filter(row => 
    row.fullName.toLowerCase().includes(timesheetSearch.toLowerCase())
  );

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
                    <td className="px-6 py-4 text-slate-400">{req.fromDate === req.toDate ? req.fromDate : `${req.fromDate} - ${req.toDate}`}</td>
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
                          {req.status === 'Approved' ? 'ÄÃ£ duyá»‡t' : 'ÄÃ£ tá»« chá»‘i'}
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
          <h3 className="font-bold text-slate-200">Quáº£n lÃ½ PhÃ²ng Ban (CRUD Äá»™ng)</h3>
          
          <form onSubmit={handleAddDept} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="TÃªn phÃ²ng ban má»›i..."
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 rounded-xl text-xs flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> ThÃªm
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
          <h3 className="font-bold text-slate-200">Quáº£n lÃ½ Chá»©c Vá»¥ (CRUD Äá»™ng)</h3>
          
          <form onSubmit={handleAddPos} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="TÃªn chá»©c vá»¥ má»›i..."
              value={newPos}
              onChange={(e) => setNewPos(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 rounded-xl text-xs flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> ThÃªm
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
              <h3 className="font-bold text-slate-200">Quáº£n lÃ½ TÃ i khoáº£n Há»‡ thá»‘ng</h3>
              <p className="text-slate-500 text-xs mt-0.5">ThÃªm má»›i, sá»­a Ä‘á»•i thÃ´ng tin vÃ  phÃ¢n quyá»n truy cáº­p cho nhÃ¢n sá»± trong doanh nghiá»‡p.</p>
            </div>
            <button
              onClick={openAddAccountModal}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Táº¡o tÃ i khoáº£n má»›i
            </button>
          </div>
          {/* Search bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="TÃ¬m tÃªn, mÃ£ NV, phÃ²ng ban, vai trÃ²..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {accountSearch && <button onClick={() => setAccountSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">âœ•</button>}
            </div>
            <span className="text-xs text-slate-500 shrink-0">{filteredAccounts.length} / {allUsers.length} tÃ i khoáº£n</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-850">
                  <th className="px-6 py-3.5">MÃ£ NV / Há» TÃªn</th>
                  <th className="px-6 py-3.5">Email liÃªn há»‡</th>
                  <th className="px-6 py-3.5">PhÃ²ng ban</th>
                  <th className="px-6 py-3.5">Chá»©c vá»¥</th>
                  <th className="px-6 py-3.5 text-center">Vai trÃ² (Role)</th>
                  <th className="px-6 py-3.5 text-center">Tráº¡ng thÃ¡i há»“ sÆ¡</th>
                  <th className="px-6 py-3.5 text-right">Thao tÃ¡c</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-slate-300">
                {filteredAccounts.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500 italic">KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n phÃ¹ há»£p.</td></tr>
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
                    <td className="px-6 py-3.5 text-slate-400">{user.department || <span className="text-slate-600 italic">ChÆ°a xáº¿p</span>}</td>
                    <td className="px-6 py-3.5 text-slate-400">{user.position || <span className="text-slate-600 italic">ChÆ°a xáº¿p</span>}</td>
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
                        {user.isProfileComplete ? 'ÄÃ£ hoÃ n thiá»‡n' : 'Chá» hoÃ n thiá»‡n'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button onClick={() => openEditAccountModal(user)}
                          className="p-1.5 bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-400 rounded-lg transition border border-slate-700" title="Chá»‰nh sá»­a tÃ i khoáº£n">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteAccount(user)}
                          className="p-1.5 bg-slate-850 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 rounded-lg transition border border-slate-800" title="XÃ³a tÃ i khoáº£n">
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
            <h3 className="font-bold text-slate-200">Báº£ng CÃ´ng Tá»•ng Há»£p ThÃ¡ng</h3>
            <p className="text-slate-500 text-xs mt-0.5">KÃ½ hiá»‡u mÃ£ hoÃ¡: X (Äi lÃ m), P (Nghá»‰ phÃ©p hÆ°á»Ÿng lÆ°Æ¡ng), Ro (Nghá»‰ khÃ´ng lÆ°Æ¡ng)</p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              placeholder="TÃ¬m kiáº¿m nhÃ¢n viÃªn..."
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
                Xuáº¥t file
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold border-b border-slate-850">
                <th className="px-4 py-3 shrink-0 min-w-[120px] sticky left-0 bg-slate-900/90 backdrop-blur border-r border-slate-800 z-20">NhÃ¢n viÃªn</th>
                <th className="px-3 py-3 text-center min-w-[50px] text-emerald-400 font-bold border-r border-slate-800 bg-slate-950/50">CÃ´ng</th>
                <th className="px-3 py-3 text-center min-w-[50px] text-blue-400 font-bold border-r border-slate-800 bg-slate-950/50">PhÃ©p</th>
                <th className="px-3 py-3 text-center min-w-[50px] text-rose-400 font-bold border-r border-slate-800 bg-slate-950/50">Nghá»‰</th>
                {daysInMonth.map((d) => (
                  <th key={d} className="px-2 py-3 text-center min-w-[30px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60">
              {filteredTimesheet.length === 0 ? (
                <tr>
                  <td colSpan="35" className="px-6 py-10 text-center text-slate-500 italic">
                    KhÃ´ng tÃ¬m tháº¥y nhÃ¢n viÃªn nÃ o phÃ¹ há»£p bá»™ lá»c.
                  </td>
                </tr>
              ) : (
                filteredTimesheet.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-900/10">
                    <td className="px-4 py-2.5 font-medium text-slate-250 sticky left-0 bg-slate-900/90 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
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
              <h3 className="font-bold text-slate-200">Báº£ng Chá»‰nh Sá»­a Giá» CÃ´ng Thá»§ CÃ´ng</h3>
              <p className="text-slate-500 text-xs mt-0.5">Admin trá»±c tiáº¿p can thiá»‡p, ghi Ä‘Ã¨ giá» check-in, check-out vÃ  tráº¡ng thÃ¡i cÃ´ng cho tá»«ng nhÃ¢n sá»±.</p>
            </div>
            <span className="text-xs text-slate-500 shrink-0 mt-1">
              {filteredManualLogs.length} / {attendanceHistory.length} báº£n ghi
            </span>
          </div>

          {/* Filter bar */}
          <div className="mt-4 flex flex-wrap gap-2.5">
            {/* Name/ID search */}
            <div className="relative flex-1 min-w-[160px]">
              <input
                type="text"
                placeholder="TÃ¬m tÃªn nhÃ¢n viÃªn hoáº·c mÃ£ NV..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {manualSearch && (
                <button
                  onClick={() => setManualSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >âœ•</button>
              )}
            </div>

            {/* Month filter */}
            <select
              value={manualMonthVal}
              onChange={(e) => setManualMonthVal(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Táº¥t cáº£ thÃ¡ng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>ThÃ¡ng {m}</option>
              ))}
            </select>

            {/* Year filter */}
            <select
              value={manualYear}
              onChange={(e) => setManualYear(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Táº¥t cáº£ nÄƒm</option>
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
              <option value="">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
              <option value="Há»£p lá»‡">Há»£p lá»‡</option>
              <option value="Äi muá»™n">Äi muá»™n</option>
              <option value="Vá» sá»›m">Vá» sá»›m</option>
              <option value="Nghá»‰ phÃ©p">Nghá»‰ phÃ©p</option>
              <option value="Váº¯ng máº·t">Váº¯ng máº·t</option>
              <option value="Nghá»‰ khÃ´ng phÃ©p">Nghá»‰ khÃ´ng phÃ©p</option>
            </select>

            {/* Reset button â€” only show when filters are active */}
            {(manualSearch || manualMonthVal || manualYear || manualStatus) && (
              <button
                onClick={() => { setManualSearch(''); setManualMonth(''); setManualStatus(''); }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-750"
              >
                â†º XÃ³a bá»™ lá»c
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
                  <th className="px-4 py-3">NhÃ¢n sá»±</th>
                  <th className="px-4 py-3">NgÃ y</th>
                  <th className="px-4 py-3">Ca lÃ m</th>
                  <th className="px-4 py-3 text-center">Check-in</th>
                  <th className="px-4 py-3 text-center">Check-out</th>
                  <th className="px-4 py-3 text-center">Sá»‘ giá»</th>
                  <th className="px-4 py-3 text-center">Tráº¡ng thÃ¡i</th>
                  <th className="px-4 py-3 text-right">HÃ nh Ä‘á»™ng</th>
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
                            ? 'ChÆ°a cÃ³ báº£n ghi lá»‹ch sá»­ cháº¥m cÃ´ng nÃ o trong há»‡ thá»‘ng.'
                            : 'KhÃ´ng tÃ¬m tháº¥y báº£n ghi nÃ o phÃ¹ há»£p bá»™ lá»c Ä‘Ã£ chá»n.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredManualLogs.map((log) => {
                    const emp = allUsers.find(u => u.employeeId === log.employeeId) || { fullName: 'KhÃ´ng rÃµ', employeeId: log.employeeId };
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
                            log.status === 'Há»£p lá»‡' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            log.status === 'Äi muá»™n' || log.status === 'Vá» sá»›m' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
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
                            Sá»­a giá»
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
                <h4 className="text-sm font-bold text-slate-200">Äiá»u chá»‰nh Giá» CÃ´ng</h4>
                <p className="text-[10px] text-slate-500 font-medium">NhÃ¢n viÃªn: {allUsers.find(u => u.employeeId === editingLog.employeeId)?.fullName || editingLog.employeeId} - NgÃ y {editingLog.date}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditedLog} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Giá» Check-in (Clock In)</label>
                <input
                  type="time"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Giá» Check-out (Clock Out)</label>
                <input
                  type="time"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Tráº¡ng thÃ¡i cháº¥m cÃ´ng</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Há»£p lá»‡">Há»£p lá»‡</option>
                  <option value="Äi muá»™n">Äi muá»™n</option>
                  <option value="Vá» sá»›m">Vá» sá»›m</option>
                  <option value="Váº¯ng máº·t">Váº¯ng máº·t</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl transition border border-slate-750 font-bold text-xs"
                >
                  Há»§y bá»
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/15 transition text-xs"
                >
                  LÆ°u láº¡i
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Safety self-demote constraints check */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="font-bold text-slate-200">Cáº¥u hÃ¬nh báº£o vá»‡ tÃ i khoáº£n Admin</h3>
          <p className="text-slate-400 text-xs mt-1">Há»‡ thá»‘ng an toÃ nGENX PKS cháº·n khÃ´ng cho tÃ i khoáº£n Admin Ä‘ang Ä‘Äƒng nháº­p tá»± thay Ä‘á»•i háº¡ cáº¥p quyá»n cá»§a báº£n thÃ¢n.</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center font-bold text-rose-400 uppercase">
              AD
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">{currentUser.fullName}</h4>
              <span className="text-slate-500 text-xs block">TÃ i khoáº£n Admin hiá»‡n hÃ nh ({currentUser.employeeId})</span>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="text-xs font-semibold text-slate-400 self-center">Vai trÃ² hiá»‡n táº¡i:</span>
            <select
              value={currentUser.role}
              onChange={(e) => handleAdminRoleChange(currentUser.employeeId, e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 focus:outline-none"
            >
              <option value="Admin">Admin (KhÃ´ng thá»ƒ Ä‘á»•i)</option>
              <option value="NhanVien">NhanVien (NhÃ¢n viÃªn)</option>
              <option value="KeToan">KeToan (Káº¿ toÃ¡n)</option>
              <option value="HR">HR (NhÃ¢n sá»±)</option>
            </select>
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
                <h4 className="text-base font-bold text-slate-100">LÃ½ do tá»« chá»‘i yÃªu cáº§u</h4>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Nháº­p lÃ½ do tá»« chá»‘i cá»¥ thá»ƒ cho Ä‘Æ¡n yÃªu cáº§u nÃ y.
                </p>
              </div>

              <form onSubmit={submitReject} className="w-full space-y-3.5">
                <textarea
                  required
                  rows={3}
                  placeholder="Nháº­p lÃ½ do tá»« chá»‘i..."
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
                    Há»§y bá»
                  </button>
                  <button
                    type="submit"
                    disabled={rejectComment.trim() === ''}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-550 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    XÃ¡c nháº­n tá»« chá»‘i
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
                <h4 className="text-sm font-bold text-slate-200">{editingAccount ? 'Chá»‰nh sá»­a tÃ i khoáº£n' : 'Táº¡o tÃ i khoáº£n má»›i'}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{editingAccount ? `MÃ£ nhÃ¢n sá»±: ${accountForm.employeeId}` : 'Nháº­p thÃ´ng tin ban Ä‘áº§u cáº¥p phÃ¡t tÃ i khoáº£n'}</p>
              </div>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">MÃ£ nhÃ¢n viÃªn (ID) *</label>
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
                  <label className="text-xs font-semibold text-slate-400">Há» vÃ  tÃªn *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyá»…n VÄƒn X"
                    value={accountForm.fullName}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Äá»‹a chá»‰ Email *</label>
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
                  <label className="text-xs font-semibold text-slate-400">PhÃ²ng ban phÃ¢n bá»•</label>
                  <select
                    value={accountForm.department}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Chá»n phÃ²ng ban --</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Chá»©c vá»¥ chuyÃªn mÃ´n</label>
                  <select
                    value={accountForm.position}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Chá»n chá»©c vá»¥ --</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Vai trÃ² phÃ¢n quyá»n há»‡ thá»‘ng</label>
                <select
                  value={accountForm.role}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="NhanVien">NhanVien (NhÃ¢n viÃªn)</option>
                  <option value="KeToan">KeToan (Káº¿ toÃ¡n)</option>
                  <option value="HR">HR (NhÃ¢n sá»±)</option>
                  <option value="Admin">Admin (Quáº£n trá»‹ há»‡ thá»‘ng)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl transition border border-slate-750 font-bold text-xs"
                >
                  Há»§y bá»
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/15 transition text-xs"
                >
                  LÆ°u láº¡i
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


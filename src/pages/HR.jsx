import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, ShieldCheck, Mail, AlertTriangle, Users, BookOpen, Eye, Upload, Calendar, Download } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HR() {
  const { currentUser, allUsers, setAllUsers, departments, positions, pushLog, apiCall, syncFromBackend } = useApp();

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

  const validateVietnamesePhone = (phone) => {
    if (!phone) return true;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return /^(0|84|\+84)(3|5|7|8|9)([0-9]{8})$/.test(cleanPhone);
  };

  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Details Modal and Contract Renewal States
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [isRenewMode, setIsRenewMode] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [uploadedContractName, setUploadedContractName] = useState('');
  const [isEditingProfileByHR, setIsEditingProfileByHR] = useState(false);
  const [hrEditForm, setHrEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    cccd: '',
    dob: '',
    gender: 'Nam',
    address: '',
    startDate: ''
  });

  // HR Filters State
  const [hrSearch, setHrSearch] = useState('');
  const [hrDept, setHrDept] = useState('');
  const [hrRole, setHrRole] = useState('');
  const [hrContractStatus, setHrContractStatus] = useState('');

  // Helper to calculate contract status relative to simulated current date 2026-07-02
  const getContractStatus = (expiryDate) => {
    if (expiryDate === 'Vô thời hạn' || !expiryDate) {
      return { label: 'Vô thời hạn', class: 'text-slate-400 bg-slate-800/40 border border-slate-700/50', key: 'indefinite' };
    }
    
    const today = new Date('2026-07-02');
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: `Hết hạn (${formatDate(expiryDate)})`, class: 'text-rose-400 bg-rose-500/10 border border-rose-500/20', key: 'expired' };
    } else if (diffDays <= 60) {
      return { label: `Sắp hết hạn (${formatDate(expiryDate)})`, class: 'text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse', key: 'near_expiry' };
    } else {
      return { label: formatDate(expiryDate), class: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20', key: 'active' };
    }
  };

  // Filtered users for HR Table
  const filteredHRUsers = allUsers.filter(user => {
    const q = hrSearch.toLowerCase();
    const matchSearch = !hrSearch ||
      user.fullName.toLowerCase().includes(q) ||
      user.employeeId.toLowerCase().includes(q);
    const matchDept = !hrDept || user.department === hrDept;
    const matchRole = !hrRole || user.role === hrRole;
    
    let matchContract = true;
    if (hrContractStatus) {
      const status = getContractStatus(user.contractExpiry);
      if (hrContractStatus === 'het_han' && status.key !== 'expired') matchContract = false;
      if (hrContractStatus === 'sap_het_han' && status.key !== 'near_expiry') matchContract = false;
      if (hrContractStatus === 'con_han' && (status.key !== 'active' && status.key !== 'indefinite')) matchContract = false;
    }
    
    return matchSearch && matchDept && matchRole && matchContract;
  });

  const handleEditClick = (user) => {
    setEditingUserId(user.employeeId);
    setSelectedRole(user.role);
    setSelectedDept(user.department);
    setSelectedPos(user.position || '');
    setErrorMsg('');
  };

  const handleSave = async (userId) => {
    setErrorMsg('');
    const editingUser = allUsers.find(u => u.employeeId === userId);

    const getRoleLevel = (r) => {
      if (r === 'Admin') return 3;
      if (r === 'HR' || r === 'KeToan') return 2;
      return 1;
    };

    // 1. HR cannot edit Admin accounts
    if (currentUser.role === 'HR' && editingUser.role === 'Admin') {
      setErrorMsg('Thẩm quyền thất bại: Nhân sự (HR) không được phép thay đổi thông tin hay vai trò của Admin.');
      pushLog(`HR ${currentUser.fullName} cố gắng chỉnh sửa tài khoản Admin ${editingUser.fullName} bị chặn.`, 'error');
      return;
    }

    // 2. HR cannot assign Admin role to others
    if (currentUser.role === 'HR' && selectedRole === 'Admin') {
      setErrorMsg('Thẩm quyền thất bại: Nhân sự (HR) không có quyền cấp vai trò Quản trị viên (Admin).');
      pushLog(`HR ${currentUser.fullName} cố gắng phân bổ vai trò Admin cho ${editingUser.fullName} bị chặn.`, 'error');
      return;
    }

    // 3. HR cannot downgrade another HR or KeToan (level 2) to NhanVien (level 1)
    if (currentUser.role === 'HR' && getRoleLevel(editingUser.role) === 2 && getRoleLevel(selectedRole) < 2) {
      setErrorMsg('Thẩm quyền thất bại: Nhân sự (HR) không được phép hạ cấp vai trò của nhân sự quản lý ngang hàng (HR/Kế toán) xuống cấp Nhân viên.');
      pushLog(`HR ${currentUser.fullName} cố gắng hạ cấp vai trò của ${editingUser.fullName} (${editingUser.role}) xuống ${selectedRole} bị chặn.`, 'error');
      return;
    }

    pushLog(`Đang cập nhật vai trò và phòng ban cho nhân sự mã: ${userId}...`);

    try {
      await apiCall(`/admin/users/${userId}`, 'PUT', {
        role: currentUser.role === 'HR' ? editingUser.role : selectedRole,
        department: selectedDept,
        position: selectedPos
      });

      setEditingUserId(null);
      if (currentUser.role === 'HR') {
        pushLog(`HR cập nhật thành công nhân sự ${editingUser.fullName}: Phòng ban -> ${selectedDept || 'Chưa chọn'}, Chức vụ -> ${selectedPos || 'Chưa chọn'}`, 'success');
      } else {
        pushLog(`Cập nhật thành công nhân sự ${editingUser.fullName}: Phòng ban -> ${selectedDept}, Vai trò -> ${selectedRole}`, 'success');
      }
      confetti({ particleCount: 50, spread: 40 });
      await syncFromBackend();
    } catch (err) {
      setErrorMsg(err.message);
      pushLog(`Lỗi cập nhật nhân sự: ${err.message}`, 'error');
    }
  };

  const handleApproveProfile = async (user) => {
    pushLog(`Phê duyệt xác nhận thông tin hồ sơ của nhân sự: ${user.fullName} (${user.employeeId}).`);
    
    try {
      await apiCall(`/admin/users/${user.employeeId}`, 'PUT', {
        isProfileComplete: true
      });

      pushLog(`[Bảo mật] Tài khoản ${user.fullName} đã được kích hoạt. Đã gửi email chứa: Mã NV (${user.employeeId}), Họ tên, Email đăng ký và Mật khẩu tạm thời được mã hóa bảo mật đến hòm thư nhân viên.`, 'success');
      confetti({ particleCount: 70, spread: 50 });
      
      await syncFromBackend();
    } catch (err) {
      pushLog(`Lỗi phê duyệt hồ sơ: ${err.message}`, 'error');
    }
  };

  const handleSaveProfileByHR = () => {
    if (!hrEditForm.fullName.trim() || !hrEditForm.email.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ và tên và Email.');
      return;
    }

    if (hrEditForm.phone && !validateVietnamesePhone(hrEditForm.phone)) {
      setErrorMsg('Số điện thoại không đúng định dạng Việt Nam (phải gồm 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }

    setAllUsers(prev => prev.map(u => {
      if (u.employeeId === selectedUserForDetails.employeeId) {
        const updated = {
          ...u,
          fullName: hrEditForm.fullName.trim(),
          email: hrEditForm.email.trim(),
          phone: hrEditForm.phone.trim(),
          cccd: hrEditForm.cccd.trim(),
          dob: hrEditForm.dob,
          gender: hrEditForm.gender,
          address: hrEditForm.address.trim(),
          startDate: hrEditForm.startDate
        };
        // Update details modal state immediately
        setSelectedUserForDetails(updated);
        return updated;
      }
      return u;
    }));

    setIsEditingProfileByHR(false);
    setErrorMsg('');
    pushLog(`HR đã cập nhật thông tin chi tiết nhân sự ${selectedUserForDetails.fullName} (${selectedUserForDetails.employeeId}) thành công.`, 'success');
    confetti({ particleCount: 30, spread: 25 });
  };

  return (
    <div className="space-y-6">
      
      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500">Tổng nhân viên</span>
              <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{allUsers.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500">Chờ duyệt hồ sơ</span>
              <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
                {allUsers.filter(u => !u.isProfileComplete).length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500">Vai trò quản trị (HR/Admin)</span>
              <span className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
                {allUsers.filter(u => u.role === 'HR' || u.role === 'Admin').length}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Main HR Management Table */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-200">Danh sách & Phân quyền Nhân sự</h3>
              <p className="text-slate-500 text-xs mt-0.5">Quản lý chức vụ, phòng ban, phân quyền và theo dõi thời hạn hợp đồng lao động.</p>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{filteredHRUsers.length} / {allUsers.length} nhân viên</span>
          </div>
          {/* Filters Bar */}
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <input
                type="text"
                placeholder="Tìm tên / mã NV..."
                value={hrSearch}
                onChange={(e) => setHrSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {hrSearch && <button onClick={() => setHrSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">✕</button>}
            </div>
            <select value={hrDept} onChange={(e) => setHrDept(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="">Tất cả phòng ban</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={hrRole} onChange={(e) => setHrRole(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="">Tất cả vai trò</option>
              <option value="NhanVien">Nhân viên</option>
              <option value="KeToan">Kế toán</option>
              <option value="HR">Nhân sự (HR)</option>
              <option value="Admin">Admin</option>
            </select>
            <select value={hrContractStatus} onChange={(e) => setHrContractStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="">Tất cả thời hạn HĐ</option>
              <option value="con_han">Còn thời hạn</option>
              <option value="sap_het_han">Sắp hết hạn (≤ 60 ngày)</option>
              <option value="het_han">Đã hết hạn</option>
            </select>
            {(hrSearch || hrDept || hrRole || hrContractStatus) && (
              <button onClick={() => { setHrSearch(''); setHrDept(''); setHrRole(''); setHrContractStatus(''); }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-750">
                ↺ Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="m-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-auto min-h-[300px] max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-900">
              <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4">Phòng ban</th>
                <th className="px-6 py-4">Chức vụ (Position)</th>
                <th className="px-6 py-4">Vai trò (Role)</th>
                <th className="px-6 py-4">Liên hệ (SĐT / Email)</th>
                <th className="px-6 py-4 text-center">Trạng thái hồ sơ</th>
                <th className="px-6 py-4 text-center">Thời hạn HĐ</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/80 text-slate-300">
              {filteredHRUsers.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-10 text-center text-slate-500 italic">Không tìm thấy nhân sự phù hợp.</td></tr>
              ) : filteredHRUsers.map((user) => (
                <tr key={user.employeeId} className="hover:bg-slate-900/10 transition duration-150">
                  {/* Employee Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-350">
                        {user.fullName.split(' ').pop().substring(0,2)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200">{user.fullName}</h4>
                        <span className="text-slate-500 text-xs block mt-0.5">ID: {user.employeeId}</span>
                      </div>
                    </div>
                  </td>

                  {/* Department (Editable Inline) */}
                  <td className="px-6 py-4 text-slate-300">
                    {editingUserId === user.employeeId ? (
                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    ) : (
                      user.department || <span className="text-slate-600 italic">Chưa sắp xếp</span>
                    )}
                  </td>

                  {/* Position (Editable Inline) */}
                  <td className="px-6 py-4 text-slate-350 text-xs">
                    {editingUserId === user.employeeId ? (
                      <select
                        value={selectedPos}
                        onChange={(e) => setSelectedPos(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 w-36"
                      >
                        <option value="">-- Chưa chọn --</option>
                        {positions.map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    ) : (
                      user.position || <span className="text-slate-600 italic text-[11px]">Chưa cập nhật</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {editingUserId === user.employeeId && currentUser.role !== 'HR' ? (
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        <option value="NhanVien">NhanVien (Nhân viên)</option>
                        <option value="KeToan">KeToan (Kế toán)</option>
                        <option value="HR">HR (Nhân sự)</option>
                        <option value="Admin">Admin (Quản trị hệ thống)</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        user.role === 'Admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        user.role === 'HR' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        user.role === 'KeToan' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4 text-xs space-y-0.5 text-slate-400">
                    <span className="block">{user.email}</span>
                    <span className="block font-mono">{user.phone || 'Chưa cung cấp'}</span>
                  </td>

                  {/* Profile completeness status */}
                  <td className="px-6 py-4 text-center">
                    {user.isProfileComplete ? (
                      <span className="text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1">
                        <UserCheck className="w-4 h-4" /> Đã hoàn thiện
                      </span>
                    ) : (
                      <span className="text-amber-500 text-xs font-semibold flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4 animate-pulse" /> Thiếu thông tin
                      </span>
                    )}
                  </td>

                  {/* Contract Expiry Status */}
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${getContractStatus(user.contractExpiry).class}`}>
                      {getContractStatus(user.contractExpiry).label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right space-x-2 text-nowrap">
                    {!user.isProfileComplete && (
                      <button
                        onClick={() => handleApproveProfile(user)}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-lg text-xs font-bold transition border border-emerald-500/20 hover:border-transparent animate-pulse"
                      >
                        Kích hoạt
                      </button>
                    )}

                    {editingUserId === user.employeeId ? (
                      <>
                        <button
                          onClick={() => handleSave(user.employeeId)}
                          className="px-2.5 py-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-lg text-xs font-bold transition"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedUserForDetails(user);
                            setIsRenewMode(false);
                            setNewExpiryDate(user.contractExpiry === 'Vô thời hạn' ? '' : user.contractExpiry || '');
                            setUploadedContractName('');
                            setIsEditingProfileByHR(false);
                            setErrorMsg('');
                          }}
                          className="px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-slate-955 rounded-lg text-xs font-bold transition border border-teal-500/20 hover:border-transparent"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleEditClick(user)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition border border-slate-700/80"
                        >
                          Điều chuyển
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & Contract Renewal Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-[4px] flex items-center justify-center z-[9998] p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-850 rounded-3xl shadow-2xl p-6 max-w-2xl w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-teal-500/10 blur-2xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm uppercase">
                  {selectedUserForDetails.fullName.split(' ').pop().substring(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{selectedUserForDetails.fullName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Mã nhân sự: {selectedUserForDetails.employeeId} | {selectedUserForDetails.department || 'Chưa xếp phòng'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="text-slate-500 hover:text-slate-350 transition text-sm font-bold bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-855"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Profile Grid */}
            {isEditingProfileByHR ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs col-span-2">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={hrEditForm.fullName}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Địa chỉ Email *</label>
                  <input
                    type="email"
                    required
                    value={hrEditForm.email}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Số điện thoại</label>
                  <input
                    type="text"
                    value={hrEditForm.phone}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Số CCCD / Hộ chiếu</label>
                  <input
                    type="text"
                    value={hrEditForm.cccd}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, cccd: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Ngày sinh</label>
                  <input
                    type="date"
                    value={hrEditForm.dob}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Giới tính</label>
                  <select
                    value={hrEditForm.gender}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Ngày nhận việc</label>
                  <input
                    type="date"
                    value={hrEditForm.startDate}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Địa chỉ liên hệ</label>
                  <input
                    type="text"
                    value={hrEditForm.address}
                    onChange={(e) => setHrEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Địa chỉ Email</span>
                  <span className="text-slate-250 font-semibold">{selectedUserForDetails.email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Số điện thoại</span>
                  <span className="text-slate-250 font-semibold">{selectedUserForDetails.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Số CCCD / Hộ chiếu</span>
                  <span className="text-slate-250 font-semibold">{selectedUserForDetails.cccd || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Ngày sinh</span>
                  <span className="text-slate-250 font-semibold">{formatDate(selectedUserForDetails.dob) || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Giới tính</span>
                  <span className="text-slate-250 font-semibold">{selectedUserForDetails.gender || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Địa chỉ liên hệ</span>
                  <span className="text-slate-250 font-semibold">{selectedUserForDetails.address || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Ngày nhận việc</span>
                  <span className="text-slate-250 font-semibold">{formatDate(selectedUserForDetails.startDate) || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Vai trò quyền hạn</span>
                  <span className="text-teal-400 font-bold uppercase">{selectedUserForDetails.role}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5">Thời hạn hợp đồng hiện tại</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold mt-1 text-[11px] ${getContractStatus(selectedUserForDetails.contractExpiry).class}`}>
                    {getContractStatus(selectedUserForDetails.contractExpiry).label}
                  </span>
                </div>

                {/* Uploaded Contract File if any */}
                <div className="col-span-2 bg-slate-950/40 p-3 rounded-xl border border-slate-855 mt-2">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-2">Tài liệu hợp đồng đính kèm</span>
                  {selectedUserForDetails.contractFile ? (
                    <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-250 font-mono text-xs flex items-center gap-1.5">
                        📄 {selectedUserForDetails.contractFile}
                      </span>
                      <button
                        onClick={() => {
                          pushLog(`HR tải xuống hợp đồng của ${selectedUserForDetails.fullName}`, 'success');
                        }}
                        className="text-[10px] text-teal-450 hover:underline font-bold"
                      >
                        Tải xuống
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-550 italic">Chưa tải lên file hợp đồng ký kết.</span>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons (Renew & Upload File) */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col gap-4">
              {isRenewMode ? (
                // Renew Contract Interface
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-855 space-y-4 animate-in slide-in-from-bottom-2">
                  <h5 className="text-xs font-bold text-teal-400">Gia hạn hợp đồng nhân sự</h5>
                  {errorMsg && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl text-[10px] flex items-center gap-1.5 animate-in shake duration-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-455 block font-bold uppercase">Ngày hết hạn hợp đồng mới</label>
                      <input
                        type="date"
                        min="2026-07-02"
                        value={newExpiryDate}
                        onChange={(e) => {
                          setErrorMsg('');
                          setNewExpiryDate(e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-455 block font-bold uppercase">Tải lên tệp hợp đồng mới (PDF)</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) setUploadedContractName(file.name);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-800 file:text-teal-400 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setErrorMsg('');
                        setIsRenewMode(false);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg border border-slate-800 transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={() => {
                        if (!newExpiryDate) {
                          setErrorMsg('Vui lòng chọn ngày hết hạn hợp đồng mới.');
                          return;
                        }
                        const selectedDate = new Date(newExpiryDate);
                        const todayDate = new Date('2026-07-02');
                        if (selectedDate < todayDate) {
                          setErrorMsg('Lỗi: Ngày hết hạn mới không được nhỏ hơn ngày hiện tại (2026-07-02).');
                          return;
                        }
                        setErrorMsg('');
                        // Update in Context
                        setAllUsers(prev => prev.map(u => {
                          if (u.employeeId === selectedUserForDetails.employeeId) {
                            return {
                              ...u,
                              contractExpiry: newExpiryDate,
                              contractFile: uploadedContractName || u.contractFile || `HopDong_LaoDong_${u.fullName.replace(/\s+/g, '_')}_GiaHan.pdf`
                            };
                          }
                          return u;
                        }));
                        pushLog(`Gia hạn hợp đồng nhân sự ${selectedUserForDetails.fullName} thành công đến ${newExpiryDate}.`, 'success');
                        setSelectedUserForDetails(null);
                        setIsRenewMode(false);
                        confetti({ particleCount: 50, spread: 35 });
                      }}
                      className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition"
                    >
                      Lưu gia hạn
                    </button>
                  </div>
                </div>
              ) : isEditingProfileByHR ? (
                // Profile Edit mode actions for HR
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingProfileByHR(false);
                      setErrorMsg('');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl text-xs font-semibold border border-slate-700/80 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleSaveProfileByHR}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shadow-teal-500/10"
                  >
                    Lưu hồ sơ
                  </button>
                </div>
              ) : (
                // Actions selection
                <div className="flex gap-3 justify-end flex-wrap">
                  <button
                    onClick={() => {
                      setIsEditingProfileByHR(true);
                      setHrEditForm({
                        fullName: selectedUserForDetails.fullName,
                        email: selectedUserForDetails.email,
                        phone: selectedUserForDetails.phone || '',
                        cccd: selectedUserForDetails.cccd || '',
                        dob: selectedUserForDetails.dob || '',
                        gender: selectedUserForDetails.gender || 'Nam',
                        address: selectedUserForDetails.address || '',
                        startDate: selectedUserForDetails.startDate || ''
                      });
                      setErrorMsg('');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl text-xs font-semibold border border-slate-700/80 transition flex items-center gap-1.5"
                  >
                    ✏️ Sửa hồ sơ
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      id="contract-upload-direct"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setAllUsers(prev => prev.map(u => {
                            if (u.employeeId === selectedUserForDetails.employeeId) {
                              return { ...u, contractFile: file.name };
                            }
                            return u;
                          }));
                          pushLog(`Đã tải lên tệp hợp đồng "${file.name}" cho nhân sự ${selectedUserForDetails.fullName}`, 'success');
                          setSelectedUserForDetails(prev => ({ ...prev, contractFile: file.name }));
                          confetti({ particleCount: 20, spread: 20 });
                        }
                      }}
                    />
                    <label
                      htmlFor="contract-upload-direct"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/80 cursor-pointer flex items-center gap-1.5 transition select-none"
                    >
                      <Upload className="w-3.5 h-3.5 text-teal-400" /> Upload Hợp đồng (PDF)
                    </label>
                  </div>
                  <button
                    onClick={() => setIsRenewMode(true)}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Gia hạn hợp đồng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

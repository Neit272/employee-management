import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, ShieldCheck, Mail, AlertTriangle, Users, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HR() {
  const { currentUser, allUsers, setAllUsers, departments, positions, pushLog } = useApp();

  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
      return { label: `Hết hạn (${expiryDate})`, class: 'text-rose-400 bg-rose-500/10 border border-rose-500/20', key: 'expired' };
    } else if (diffDays <= 60) {
      return { label: `Sắp hết hạn (${expiryDate})`, class: 'text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse', key: 'near_expiry' };
    } else {
      return { label: expiryDate, class: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20', key: 'active' };
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

  const handleSave = (userId) => {
    setErrorMsg('');
    const editingUser = allUsers.find(u => u.employeeId === userId);

    // Safeguard Constraint check: HR cannot assign Admin role to others
    if (currentUser.role === 'HR' && selectedRole === 'Admin') {
      setErrorMsg('Thẩm quyền thất bại: Nhân sự (HR) không có quyền cấp vai trò Quản trị viên (Admin).');
      pushLog(`HR ${currentUser.fullName} cố gắng phân bổ vai trò Admin cho ${editingUser.fullName} bị chặn.`, 'error');
      return;
    }

    pushLog(`Đang cập nhật vai trò và phòng ban cho nhân sự mã: ${userId}...`);

    setAllUsers(prev => prev.map(u => {
      if (u.employeeId === userId) {
        return { ...u, role: selectedRole, department: selectedDept, position: selectedPos };
      }
      return u;
    }));

    setEditingUserId(null);
    pushLog(`Cập nhật thành công nhân sự ${editingUser.fullName}: Phòng ban -> ${selectedDept}, Vai trò -> ${selectedRole}`, 'success');
    confetti({ particleCount: 50, spread: 40 });
  };

  const handleApproveProfile = (user) => {
    // Approve incomplete user profile details (completed via update modal)
    pushLog(`Phê duyệt xác nhận thông tin hồ sơ của nhân sự: ${user.fullName} (${user.employeeId}).`);
    
    setAllUsers(prev => prev.map(u => {
      if (u.employeeId === user.employeeId) {
        return { ...u, isProfileComplete: true };
      }
      return u;
    }));

    // Trigger mock email credential dispatch (no plain-text password)
    pushLog(`[Bảo mật] Tài khoản ${user.fullName} đã được kích hoạt. Đã gửi email chứa: Mã NV (${user.employeeId}), Họ tên, Email đăng ký và Mật khẩu tạm thời được mã hóa bảo mật đến hòm thư nhân viên.`, 'success');
    
    confetti({ particleCount: 70, spread: 50 });
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

                  {/* Role (Editable Inline) */}
                  <td className="px-6 py-4">
                    {editingUserId === user.employeeId ? (
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
                  <td className="px-6 py-4 text-right space-x-2">
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
                      <button
                        onClick={() => handleEditClick(user)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition border border-slate-700/80"
                      >
                        Điều chuyển
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

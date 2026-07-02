import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, ShieldCheck, Mail, AlertTriangle, Users, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HR() {
  const { currentUser, allUsers, setAllUsers, departments, positions, pushLog, apiCall, syncFromBackend } = useApp();

  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

    // Safeguard Constraint check: HR cannot assign Admin role to others
    if (currentUser.role === 'HR' && selectedRole === 'Admin') {
      setErrorMsg('Thẩm quyền thất bại: Nhân sự (HR) không có quyền cấp vai trò Quản trị viên (Admin).');
      pushLog(`HR ${currentUser.fullName} cố gắng phân bổ vai trò Admin cho ${editingUser.fullName} bị chặn.`, 'error');
      return;
    }

    pushLog(`Đang cập nhật vai trò và phòng ban cho nhân sự mã: ${userId}...`);

    try {
      await apiCall(`/admin/users/${userId}`, 'PUT', {
        role: selectedRole,
        department: selectedDept,
        position: selectedPos
      });

      setEditingUserId(null);
      pushLog(`Cập nhật thành công nhân sự ${editingUser.fullName}: Phòng ban -> ${selectedDept}, Vai trò -> ${selectedRole}`, 'success');
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
          <h3 className="font-bold text-slate-200">Danh sách & Phân quyền Nhân sự</h3>
        </div>

        {errorMsg && (
          <div className="m-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold border-b border-slate-800">
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4">Phòng ban</th>
                <th className="px-6 py-4">Chức vụ (Position)</th>
                <th className="px-6 py-4">Vai trò (Role)</th>
                <th className="px-6 py-4">Liên hệ (SĐT / Email)</th>
                <th className="px-6 py-4">Trạng thái hồ sơ</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/80">
              {allUsers.map((user) => (
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
                  <td className="px-6 py-4">
                    {user.isProfileComplete ? (
                      <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                        <UserCheck className="w-4 h-4" /> Đã hoàn thiện
                      </span>
                    ) : (
                      <span className="text-amber-500 text-xs font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Thiếu thông tin
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right space-x-2">
                    {!user.isProfileComplete && (
                      <button
                        onClick={() => handleApproveProfile(user)}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-lg text-xs font-bold transition border border-emerald-500/20 hover:border-transparent"
                      >
                        Kích hoạt tài khoản
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

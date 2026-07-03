import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MandatoryUpdateModal() {
  const { currentUser, setCurrentUser, departments, positions, pushLog, apiCall } = useApp();

  // Only render if logged in and profile is NOT complete
  if (!currentUser || currentUser.isProfileComplete) {
    return null;
  }

  // Pre-fill states from database to avoid forcing re-entry and allow selective update of missing fields
  const [cccd, setCccd] = useState(currentUser.cccd || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [startDate, setStartDate] = useState(currentUser.startDate || '');
  const [department, setDepartment] = useState(currentUser.department || '');
  const [position, setPosition] = useState(currentUser.position || '');
  const [gender, setGender] = useState(currentUser.gender || 'Nam');
  const [dob, setDob] = useState(currentUser.dob || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field verification
    if (!cccd || !phone || !address || !startDate || !department || !position || !gender || !dob) {
      setError('Vui lòng điền đầy đủ tất cả các trường thông tin bắt buộc.');
      return;
    }

    if (cccd.length < 9 || cccd.length > 12) {
      setError('Căn cước công dân (CCCD) phải chứa 9 hoặc 12 chữ số.');
      return;
    }

    if (phone.length < 10 || phone.length > 11) {
      setError('Số điện thoại liên hệ phải chứa 10 hoặc 11 chữ số.');
      return;
    }

    setLoading(true);
    pushLog(`Đang gửi biểu mẫu cập nhật thông tin bắt buộc cho mã NV: ${currentUser.employeeId}...`);

    try {
      const res = await apiCall('/auth/profile', 'PUT', {
        cccd,
        phone,
        address,
        startDate,
        department,
        position,
        gender,
        dob
      });

      setCurrentUser(res.user);
      pushLog(`Cập nhật thông tin hồ sơ cá nhân thành công cho mã NV: ${currentUser.employeeId}`, 'success');
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      setError(err.message || 'Lỗi hệ thống khi cập nhật hồ sơ.');
      pushLog(`Cập nhật hồ sơ bắt buộc thất bại: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md overflow-y-auto py-8 px-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header Alert Ban */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-slate-800 p-6 flex gap-4 items-start">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
            <ShieldAlert className="w-8 h-8 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Bắt buộc cập nhật thông tin</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Theo quy định nội bộ GENX PKS, tài khoản mới khởi tạo phải hoàn thiện thông tin hồ sơ trước khi truy cập bất kỳ tính năng nào khác của hệ thống.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* CCCD */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Số CCCD *</label>
              <input
                type="text"
                required
                placeholder="Nhập 9 hoặc 12 số"
                value={cccd}
                onChange={(e) => setCccd(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Số điện thoại *</label>
              <input
                type="text"
                required
                placeholder="0987xxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Birth Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Ngày sinh *</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
              />
            </div>

            {/* Department Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Phòng ban *</label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
              >
                <option value="">Chọn phòng ban...</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Position Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Chức vụ chuyên môn *</label>
            <select
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
            >
              <option value="">Chọn chức vụ...</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Gender Radios */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Giới tính *</label>
            <div className="flex gap-6 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="gender"
                  required
                  value="Nam"
                  checked={gender === 'Nam'}
                  onChange={(e) => setGender(e.target.value)}
                  className="accent-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-300">Nam</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="gender"
                  value="Nữ"
                  checked={gender === 'Nữ'}
                  onChange={(e) => setGender(e.target.value)}
                  className="accent-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-300">Nữ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="gender"
                  value="Khác"
                  checked={gender === 'Khác'}
                  onChange={(e) => setGender(e.target.value)}
                  className="accent-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-300">Khác</span>
              </label>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Ngày bắt đầu làm việc chính thức *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
            />
          </div>

          {/* Full Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Địa chỉ thường trú / Tạm trú *</label>
            <textarea
              required
              rows={2}
              placeholder="Nhập địa chỉ đầy đủ (Số nhà, đường, phường/xã, quận/huyện...)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200 resize-none"
            />
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-95 transition-all duration-250 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Gửi và hoàn tất thiết lập hồ sơ
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

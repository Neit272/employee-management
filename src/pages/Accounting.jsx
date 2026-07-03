import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FolderLock, FileText, Upload, ShieldAlert, KeyRound, Clock, ShieldCheck, Download, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Accounting() {
  const { 
    currentUser, 
    documents, 
    setDocuments, 
    allUsers, 
    attendanceHistory, 
    pushLog, 
    showDialog,
    departments,
    positions,
    apiCall,
    syncFromBackend
  } = useApp();

  // Month/Year filter for attendance summary
  const now = new Date();
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [accountantSearch, setAccountantSearch] = useState('');
  const [summaryDept, setSummaryDept] = useState('');
  const [summaryPos, setSummaryPos] = useState('');

  // Document filters state
  const [docSearch, setDocSearch] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('');
  const [coreSearch, setCoreSearch] = useState('');
  const [coreCategoryFilter, setCoreCategoryFilter] = useState('');

  // Filtered core folder contracts
  const filteredCoreContracts = documents.filter(doc => {
    if (!doc.isCore) return false;
    const q = coreSearch.toLowerCase().trim();
    const matchSearch = !coreSearch || doc.name.toLowerCase().includes(q) || doc.employeeId.toLowerCase().includes(q);
    const matchCategory = !coreCategoryFilter || doc.type === coreCategoryFilter;
    return matchSearch && matchCategory;
  });

  // Filtered users for accountant search
  const filteredUsers = allUsers.filter(user => {
    const q = accountantSearch.toLowerCase().trim();
    const matchSearch = !accountantSearch ||
      user.fullName.toLowerCase().includes(q) ||
      user.employeeId.toLowerCase().includes(q);
    const matchDept = !summaryDept || user.department === summaryDept;
    const matchPos = !summaryPos || user.position === summaryPos;
    return matchSearch && matchDept && matchPos;
  });

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

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr || dateTimeStr === '—') return dateTimeStr;
    try {
      const d = new Date(dateTimeStr);
      if (isNaN(d.getTime())) return dateTimeStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateTimeStr;
    }
  };

  // Helper to calculate contract status relative to simulated current date 2026-07-02
  const getContractStatus = (expiryDate) => {
    if (expiryDate === 'Vô thời hạn' || !expiryDate) {
      return { label: 'Vô thời hạn', class: 'text-slate-400 bg-slate-800/40 border border-slate-700/50' };
    }
    const today = new Date('2026-07-02');
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: `Hết hạn (${formatDate(expiryDate)})`, class: 'text-rose-400 bg-rose-500/10 border border-rose-500/20' };
    } else if (diffDays <= 60) {
      return { label: `Sắp hết hạn (${formatDate(expiryDate)})`, class: 'text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse' };
    } else {
      return { label: formatDate(expiryDate), class: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' };
    }
  };

  // Filtered documents for accountant view (excluding core documents)
  const filteredDocuments = documents.filter(doc => {
    if (doc.isCore) return false;
    const q = docSearch.toLowerCase();
    const matchSearch = !docSearch ||
      doc.name.toLowerCase().includes(q) ||
      doc.employeeId.toLowerCase().includes(q);
    const matchCategory = !docCategoryFilter || doc.type === docCategoryFilter;
    return matchSearch && matchCategory;
  });

  // Compute attendance summary for each user for the selected month/year
  const getAttendanceSummary = (employeeId) => {
    const logs = attendanceHistory.filter(log => {
      if (log.employeeId !== employeeId) return false;
      const d = new Date(log.date);
      return d.getMonth() + 1 === summaryMonth && d.getFullYear() === summaryYear;
    });

    const workedDays  = logs.filter(l => l.status === 'Hợp lệ').length;
    const lateDays    = logs.filter(l => l.status === 'Đi muộn').length;
    const earlyDays   = logs.filter(l => l.status === 'Về sớm').length;
    const absentDays  = logs.filter(l => l.status === 'Vắng mặt' || l.status === 'Nghỉ không phép').length;
    const leaveDays   = logs.filter(l => l.status === 'Nghỉ phép').length;
    const totalHours  = logs
      .map(l => parseFloat(l.actualHours) || 0)
      .reduce((a, b) => a + b, 0)
      .toFixed(1);

    let lateMinutes = 0;
    let earlyMinutes = 0;

    logs.forEach(l => {
      // Calculate late minutes
      if (l.clockIn && l.clockIn !== '-' && l.status === 'Đi muộn') {
        const match = l.shift.match(/\((\d{2}):(\d{2})/);
        if (match) {
          const shiftStartMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
          const [inH, inM] = l.clockIn.split(':').map(Number);
          const clockInMins = inH * 60 + inM;
          if (clockInMins > shiftStartMins) {
            lateMinutes += (clockInMins - shiftStartMins);
          }
        }
      }

      // Calculate early minutes
      if (l.clockOut && l.clockOut !== '-' && l.status === 'Về sớm') {
        const match = l.shift.match(/-\s*(\d{2}):(\d{2})\)/);
        if (match) {
          const shiftEndMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
          const [outH, outM] = l.clockOut.split(':').map(Number);
          const clockOutMins = outH * 60 + outM;
          if (clockOutMins < shiftEndMins) {
            earlyMinutes += (shiftEndMins - clockOutMins);
          }
        }
      }
    });

    return { workedDays, lateDays, earlyDays, absentDays, leaveDays, totalHours, lateMinutes, earlyMinutes };
  };

  const handleExportExcel = async () => {
    try {
      pushLog('Kế toán đang kết xuất bảng công CSV/Excel từ hệ thống...');
      const res = await fetch(
        `${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : ''}/api/admin/export-payroll?month=${summaryMonth}&year=${summaryYear}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Lỗi xuất bảng công.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BangCong_KeToan_${summaryMonth}_${summaryYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      pushLog('Kế toán kết xuất thành công bảng công tổng hợp CSV/Excel.', 'success');
      showDialog({
        title: 'Xuất file thành công',
        message: `Bảng tổng hợp công tháng ${summaryMonth}/${summaryYear} đã được xuất thành công và tải xuống thiết bị.`,
        type: 'success'
      });
    } catch (err) {
      pushLog(`Lỗi xuất bảng công: ${err.message}`, 'error');
      showDialog({ title: 'Lỗi xuất file', message: err.message, type: 'error' });
    }
  };

  // PDF Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [docCategory, setDocCategory] = useState('Chứng từ thanh toán');
  const [uploadError, setUploadError] = useState('');

  // 2FA Security states
  const [is2FAPhase, setIs2FAPhase] = useState('none'); // 'none' | 'password' | 'otp' | 'verified'
  const [selectedCoreDocId, setSelectedCoreDocId] = useState(null); // Track which doc to download
  const [corePassword, setCorePassword] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 mins
  const [timerActive, setTimerActive] = useState(false);
  const [securityError, setSecurityError] = useState('');

  // OTP Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (timerActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && timerActive) {
      setTimerActive(false);
      pushLog('Mã xác minh OTP 2FA đã hết hiệu lực. Vui lòng bấm Gửi lại mã.', 'error');
    }
    return () => clearInterval(interval);
  }, [timerActive, countdown]);

  const handleFileUpload = (e) => {
    setUploadError('');
    const file = e.target.files[0];
    if (!file) return;

    // Validate PDF extension only
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Định dạng tệp không hợp lệ! Hệ thống kế toán chỉ tiếp nhận tệp tin PDF (.pdf).');
      pushLog(`Từ chối upload: Tệp ${file.name} sai định dạng.`, 'error');
      e.target.value = null;
      return;
    }

    // Check size limit: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Dung lượng tệp vượt quá giới hạn cho phép (5MB).');
      pushLog(`Từ chối upload: Tệp ${file.name} quá lớn (${(file.size/1024/1024).toFixed(1)} MB).`, 'error');
      e.target.value = null;
      return;
    }

    setUploadedFile(file);
    pushLog(`Đã chuẩn bị tải lên tệp tin: ${file.name}`);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!uploadedFile) return;

    pushLog(`Đang gửi tài liệu lên hệ thống chứng từ kế toán...`);

    try {
      const base64Str = await fileToBase64(uploadedFile);

      await apiCall('/documents/upload', 'POST', {
        name: uploadedFile.name,
        employeeId: currentUser.employeeId,
        category: docCategory,
        isCore: docCategory.includes('Báo cáo tài chính') || docCategory.includes('Hợp đồng'),
        fileBase64: base64Str
      });

      setUploadedFile(null);
      pushLog(`Tải lên tài liệu thành công. Loại: ${docCategory}`, 'success');
      confetti({ particleCount: 50, spread: 40 });
      
      await syncFromBackend();
    } catch (err) {
      setUploadError(err.message);
      pushLog(`Lỗi tải lên tài liệu: ${err.message}`, 'error');
    }
  };

  // 2FA Flow Executions
  const trigger2FA = (docId) => {
    setSelectedCoreDocId(docId || null);
    setIs2FAPhase('password');
    setCorePassword('');
    setSecurityError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSecurityError('');

    try {
      pushLog(`Đang gửi yêu cầu Pass Core xác thực lớp 1...`);
      const docIdToUse = selectedCoreDocId || 'core';
      await apiCall(`/documents/${docIdToUse}/otp-request`, 'POST', { passCore: corePassword });
      
      pushLog('Xác thực lớp 1 (Pass Core) thành công.', 'success');
      setCountdown(300);
      setTimerActive(true);
      setIs2FAPhase('otp');
      setOtpInput('');
      
      // Provide dummy visual indicator of OTP code for mock testing ease
      const visualOtp = '123456'; 
      setSimulatedOtp(visualOtp);
      pushLog(`Mã OTP đã được gửi về email. Nhập mã OTP từ email phòng Kế toán để tải file.`, 'success');
    } catch (err) {
      setSecurityError(err.message);
      pushLog(`Xác thực lớp 1 thất bại: ${err.message}`, 'error');
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setSecurityError('');

    if (countdown === 0) {
      setSecurityError('Mã OTP đã hết hiệu lực. Vui lòng bấm gửi lại mã để nhận mã mới.');
      return;
    }

    try {
      pushLog('Đang xác nhận mã OTP lớp thứ 2...');
      const docIdToUse = selectedCoreDocId || 'core';
      const res = await apiCall(`/documents/${docIdToUse}/download`, 'POST', { otp: otpInput });
      
      pushLog('Xác thực lớp 2 (OTP 6 số) thành công. Mở khóa thư mục Hợp đồng Core.', 'success');
      setIs2FAPhase('verified');
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

      // Automatically trigger secure document stream download or Base64 download
      if (res.downloadUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = res.downloadUrl;
        link.download = 'HopDong_Core.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5000'
          : '';
        window.open(`${base}${res.downloadUrl}`, '_blank');
      }
    } catch (err) {
      setSecurityError(err.message);
      pushLog(`Xác thực lớp 2 thất bại: ${err.message}`, 'error');
    }
  };

  const handleResendOtp = async () => {
    setSecurityError('');
    try {
      const docIdToUse = selectedCoreDocId || 'core';
      await apiCall(`/documents/${docIdToUse}/otp-request`, 'POST', { passCore: corePassword });
      setCountdown(300);
      setTimerActive(true);
      setOtpInput('');
      pushLog(`Hệ thống đã gửi lại mã OTP 2FA mới về email phòng Kế toán.`, 'success');
    } catch (err) {
      setSecurityError(err.message);
    }
  };



  return (
    <div className="space-y-6">
      
      {/* Upload Form - Visible ONLY for KeToan */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-1">
            <Upload className="w-5 h-5 text-teal-400" />
            Tải lên Chứng từ Kế toán
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Số hóa hóa đơn hoặc chứng từ chi tiêu. Chỉ chấp nhận tệp tin định dạng PDF với dung lượng dưới 5MB.
          </p>
        </div>

        {currentUser.role === 'KeToan' || currentUser.role === 'Admin' ? (
          <form onSubmit={submitUpload} className="mt-4 space-y-4">
            {uploadError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs">
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Phân loại chứng từ</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Chứng từ thanh toán">Chứng từ thanh toán / Hoá đơn</option>
                  <option value="Báo cáo tài chính">Báo cáo tài chính nội bộ</option>
                  <option value="Hợp đồng lao động">Hợp đồng lao động / NDA</option>
                  <option value="Cam kết bảo mật">Cam kết bảo mật</option>
                </select>
              </div>

              {/* File picker */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tệp tin PDF đính kèm *</label>
                <input
                  type="file"
                  required
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-850 file:text-teal-400 file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!uploadedFile}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition"
            >
              Tải chứng từ lên hệ thống
            </button>
          </form>
        ) : (
          <div className="mt-4 p-5 bg-slate-950 border border-slate-850 rounded-2xl flex items-center gap-3 text-amber-500/80">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <p className="text-xs leading-relaxed">
              <span className="font-semibold block text-slate-350">Tính năng bị ẩn (UI Level Truncation)</span>
              Chỉ người dùng có vai trò Kế toán viên (KeToan) mới được quyền nhìn thấy và thực hiện tải lên tài liệu chứng từ kế toán.
            </p>
          </div>
        )}
      </div>

      {/* Contract Core card: locked or unlocked table */}
      <div className="bg-slate-900/30 border border-rose-500/20 rounded-3xl overflow-hidden shadow-xl">
        {is2FAPhase === 'verified' ? (
          // Unlocked Table view
          <>
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="font-bold text-rose-400 flex items-center gap-2">
                    <FolderLock className="w-5 h-5 animate-pulse" />
                    Tài liệu Hợp đồng Thư mục Core (Đang mở khóa)
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">Truy cập dữ liệu tuyệt mật phòng kế toán (Đã xác minh 2FA).</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-44">
                    <input
                      type="text"
                      placeholder="Tìm tên tài liệu, mã NV..."
                      value={coreSearch}
                      onChange={(e) => setCoreSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                    {coreSearch && <button onClick={() => setCoreSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">✕</button>}
                  </div>
                  <select
                    value={coreCategoryFilter}
                    onChange={(e) => setCoreCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Tất cả danh mục</option>
                    <option value="Hợp đồng lao động">Hợp đồng lao động</option>
                    <option value="Báo cáo tài chính">Báo cáo tài chính</option>
                  </select>
                  <button
                    onClick={() => setIs2FAPhase('none')}
                    className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl text-rose-400 font-bold transition border border-rose-900/20"
                  >
                    🔒 Khóa thư mục
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-auto min-h-[200px] max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900">
                  <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="px-6 py-3.5">Tên tài liệu chứng từ</th>
                    <th className="px-6 py-3.5 text-center">Mã NV Upload</th>
                    <th className="px-6 py-3.5">Ngày giờ Upload</th>
                    <th className="px-6 py-3.5">Phân loại danh mục</th>
                    <th className="px-6 py-3.5 text-center">Dung lượng</th>
                    <th className="px-6 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 text-slate-300">
                  {filteredCoreContracts.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500 italic">Không tìm thấy tài liệu phù hợp.</td></tr>
                  ) : filteredCoreContracts.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-900/10 transition">
                      <td className="px-6 py-3.5 font-medium text-slate-200 flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                        {doc.name}
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono text-slate-400">{doc.employeeId}</td>
                      <td className="px-6 py-3.5 text-slate-400">{formatDateTime(doc.uploadDate)}</td>
                      <td className="px-6 py-3.5 text-slate-350 font-semibold">{doc.type}</td>
                      <td className="px-6 py-3.5 text-center font-mono text-slate-400">{doc.size || '2.4 MB'}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => trigger2FA(doc.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 text-rose-400 rounded-xl text-xs font-bold transition border border-rose-500/20"
                        >
                          <Download className="w-3.5 h-3.5" /> Tải về
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          // Locked Security View
          <div className="p-8 flex flex-col items-center text-center space-y-4 border-rose-500/10">
            <div className="p-4 bg-rose-500/10 rounded-full text-rose-500 w-16 h-16 flex items-center justify-center animate-pulse">
              <FolderLock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">Thư mục Hợp đồng Core (Đang khóa)</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed max-w-xl mx-auto">
                Khu vực lưu trữ hồ sơ tuyệt mật gồm Hợp đồng lao động cốt cán và các thỏa thuận kinh tế thương mại đặc biệt của GENX. 
                Yêu cầu xác thực 2 yếu tố nghiêm ngặt (Mật khẩu và OTP Email) để truy cập.
              </p>
            </div>
            <button
              onClick={trigger2FA}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Mở khóa Thư mục Core
            </button>
          </div>
        )}
      </div>

      {/* Attendance Summary Table for Accountants */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-200">Bảng Tổng Hợp Công Nhân Viên</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Tổng hợp dữ liệu chấm công thực tế theo tháng. Kế toán xuất file Excel và tự tính lương thủ công.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="relative w-44">
              <input
                type="text"
                placeholder="Tìm kiếm nhân viên..."
                value={accountantSearch}
                onChange={(e) => setAccountantSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {accountantSearch && (
                <button
                  onClick={() => setAccountantSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Department Filter */}
            <select
              value={summaryDept}
              onChange={(e) => setSummaryDept(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Tất cả Phòng ban</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            {/* Position Filter */}
            <select
              value={summaryPos}
              onChange={(e) => setSummaryPos(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Tất cả Chức vụ</option>
              {positions.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>

            {/* Month picker */}
            <select
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            {/* Year picker */}
            <select
              value={summaryYear}
              onChange={(e) => setSummaryYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={handleExportExcel}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel
            </button>
          </div>
        </div>
        {/* Table */}
        <div className="overflow-auto min-h-[300px] max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950">
              <tr className="bg-slate-950/40 text-slate-400 font-semibold border-b border-slate-850">
                <th className="px-5 py-3.5 min-w-[180px]">Nhân viên</th>
                <th className="px-5 py-3.5">Phòng ban / Chức vụ</th>
                <th className="px-5 py-3.5 text-center text-emerald-400">Ngày công</th>
                <th className="px-5 py-3.5 text-center text-amber-400">Đi trễ</th>
                <th className="px-5 py-3.5 text-center text-orange-400">Về sớm</th>
                <th className="px-5 py-3.5 text-center text-blue-400">Nghỉ phép</th>
                <th className="px-5 py-3.5 text-center text-rose-400">Nghỉ không phép</th>
                <th className="px-5 py-3.5 text-center text-slate-300">Tổng giờ làm</th>
                <th className="px-5 py-3.5 text-center">Thời hạn HĐ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-10 text-center text-slate-500 italic">
                    Không tìm thấy nhân viên nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const s = getAttendanceSummary(user.employeeId);
                  const hasData = Number(s.workedDays) + Number(s.lateDays) + Number(s.earlyDays) + Number(s.absentDays) + Number(s.leaveDays) > 0;

                  return (
                    <tr key={user.employeeId} className="hover:bg-slate-900/10 transition">
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {user.fullName.split(' ').pop().substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block">{user.fullName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{user.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      {/* Dept / Position */}
                      <td className="px-5 py-3.5">
                        <span className="block text-slate-300">{user.department || <span className="text-slate-600 italic">Chưa xếp</span>}</span>
                        <span className="text-[10px] text-slate-500">{user.position || ''}</span>
                      </td>
                      {/* Worked */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px]">
                          {hasData ? s.workedDays : '—'}
                        </span>
                      </td>
                      {/* Late */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          hasData && s.lateDays > 0
                            ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                            : 'text-slate-600'
                        }`}>
                          {hasData ? (s.lateDays > 0 ? `${s.lateDays} ngày (${s.lateMinutes} phút)` : '0 ngày') : '—'}
                        </span>
                      </td>
                      {/* Early */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          hasData && s.earlyDays > 0
                            ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                            : 'text-slate-600'
                        }`}>
                          {hasData ? (s.earlyDays > 0 ? `${s.earlyDays} ngày (${s.earlyMinutes} phút)` : '0 ngày') : '—'}
                        </span>
                      </td>
                      {/* Paid leave */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          hasData && s.leaveDays > 0
                            ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                            : 'text-slate-600'
                        }`}>
                          {hasData ? s.leaveDays : '—'}
                        </span>
                      </td>
                      {/* Absent */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          hasData && s.absentDays > 0
                            ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                            : 'text-slate-600'
                        }`}>
                          {hasData ? s.absentDays : '—'}
                        </span>
                      </td>
                      {/* Total hours */}
                      <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-200">
                        {hasData ? `${s.totalHours}h` : <span className="text-slate-600 italic text-[10px]">Chưa có dữ liệu</span>}
                      </td>
                      {/* Contract Expiry Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getContractStatus(user.contractExpiry).class}`}>
                          {getContractStatus(user.contractExpiry).label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document table list */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-200">Danh sách tài liệu đã tải lên</h3>
              <p className="text-slate-500 text-xs mt-0.5">Tìm kiếm hồ sơ nhân sự, báo cáo tài chính và chứng từ phòng kế toán.</p>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{filteredDocuments.length} / {documents.length} tài liệu</span>
          </div>
          {/* Filters Bar */}
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <input
                type="text"
                placeholder="Tìm tên tài liệu, mã NV..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              {docSearch && <button onClick={() => setDocSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">✕</button>}
            </div>
            <select value={docCategoryFilter} onChange={(e) => setDocCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="">Tất cả danh mục</option>
              <option value="Hợp đồng lao động">Hợp đồng lao động</option>
              <option value="Báo cáo tài chính">Báo cáo tài chính</option>
              <option value="Cam kết bảo mật">Cam kết bảo mật</option>
              <option value="Chứng từ thanh toán">Chứng từ thanh toán</option>
            </select>
            {(docSearch || docCategoryFilter) && (
              <button onClick={() => { setDocSearch(''); setDocCategoryFilter(''); }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-750">
                ↺ Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        <div className="overflow-auto min-h-[250px] max-h-[400px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-900">
              <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <th className="px-6 py-4">Tên tài liệu chứng từ</th>
                <th className="px-6 py-4">Mã NV Upload</th>
                <th className="px-6 py-4">Ngày giờ Upload</th>
                <th className="px-6 py-4">Phân loại danh mục</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/80 text-slate-300">
              {filteredDocuments.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500 italic">Không tìm thấy tài liệu phù hợp.</td></tr>
              ) : filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-900/10 transition duration-150">
                  <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                    {doc.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">{doc.employeeId}</td>
                  <td className="px-6 py-4 text-slate-400">{formatDateTime(doc.uploadDate)}</td>
                  <td className="px-6 py-4 text-slate-350 font-semibold">{doc.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA Password Overlay Modal */}
      {is2FAPhase === 'password' && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3.5 bg-rose-500/10 rounded-full text-rose-500">
                <FolderLock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">Bảo mật Folder Core (Lớp 1)</h4>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Nhập mật khẩu nội bộ phòng Kế toán để bắt đầu tiến trình xác thực.
                </p>
              </div>

              {securityError && (
                <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl text-xs">
                  {securityError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="w-full space-y-3.5">
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu (Mẹo: core123)"
                  value={corePassword}
                  onChange={(e) => { setCorePassword(e.target.value); setSecurityError(''); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 text-center font-mono text-slate-200"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIs2FAPhase('none')}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-semibold rounded-xl text-slate-350 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2FA OTP Countdown Overlay Modal */}
      {is2FAPhase === 'otp' && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3.5 bg-rose-500/10 rounded-full text-rose-500">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">Xác thực OTP 2FA (Lớp 2)</h4>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Nhập mã xác thực 6 chữ số vừa được gửi về email phòng Kế toán.
                </p>
                <span className="text-sm text-teal-400 mt-2 block font-extrabold bg-slate-950 py-2 px-4 rounded-xl border border-teal-500/20">
                  Mã OTP thử nghiệm (2FA): {simulatedOtp}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  (Mẹo: Mã này cũng được ghi nhận tại Bảng log mô phỏng góc dưới phải)
                </span>
              </div>

              {securityError && (
                <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl text-xs">
                  {securityError}
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="w-full space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="X X X X X X"
                    value={otpInput}
                    onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, '')); setSecurityError(''); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-rose-500 text-center font-mono font-bold tracking-[0.4em] text-slate-200"
                  />
                  
                  {/* Countdown display */}
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {countdown > 0 ? (
                      <span className="text-teal-400">Thời gian hiệu lực: {countdown} giây</span>
                    ) : (
                      <span className="text-rose-500">Mã xác thực đã hết hạn!</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setIs2FAPhase('none'); setTimerActive(false); }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-semibold rounded-xl text-slate-350 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={countdown === 0}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-550 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>

              {/* Resend button */}
              <button
                type="button"
                disabled={timerActive && countdown > 0}
                onClick={handleResendOtp}
                className="text-xs text-teal-400 font-bold hover:underline disabled:text-slate-550 disabled:no-underline transition"
              >
                Gửi lại mã OTP
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

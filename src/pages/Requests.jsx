import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Plus, X, Calendar, FileDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Requests() {
  const { currentUser, requests, setRequests, pushLog, addNotification, apiCall, syncFromBackend } = useApp();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields State
  const [requestType, setRequestType] = useState('Xin nghỉ phép');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [correctedTime, setCorrectedTime] = useState('08:00');
  
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get current date string in YYYY-MM-DD
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Get yesterday date string in YYYY-MM-DD
  const getYesterdayString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const handleFileChange = (e) => {
    setFormError('');
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check size limit: 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      setFormError('Dung lượng tệp tin đính kèm vượt quá giới hạn 5MB! Hãy chọn tệp khác nhỏ hơn.');
      setFile(null);
      pushLog(`Chặn upload tệp: ${selectedFile.name} (${(selectedFile.size/1024/1024).toFixed(2)} MB) vượt giới hạn 5MB.`, 'error');
      e.target.value = null;
      return;
    }

    setFile(selectedFile);
    pushLog(`Đã tải lên file minh chứng: ${selectedFile.name} (${(selectedFile.size/1024).toFixed(1)} KB)`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fromDate || !toDate) {
      setFormError('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) {
      setFormError('Ngày kết thúc (To Date) không được phép nhỏ hơn Ngày bắt đầu (From Date).');
      return;
    }

    if (reason.trim().length < 10) {
      setFormError('Lý do phải dài tối thiểu 10 ký tự.');
      return;
    }

    // Type-specific validations
    const todayStr = getTodayString();
    if (requestType === 'Xin nghỉ phép') {
      if (fromDate < todayStr) {
        setFormError('Đơn xin nghỉ phép chỉ được đăng ký các ngày từ hôm nay trở đi.');
        return;
      }
    } else if (requestType === 'Giải trình quên check-in') {
      if (fromDate > todayStr) {
        setFormError('Giải trình quên check-in chỉ được phép chọn ngày hôm nay hoặc các ngày trong quá khứ.');
        return;
      }
    }

    setSubmitting(true);
    pushLog(`Đang gửi đơn: ${requestType} - Nhân viên: ${currentUser.fullName}...`);

    try {
      const fileToBase64 = (f) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };

      let fileBase64 = null;
      let fileMeta = null;
      if (file) {
        fileBase64 = await fileToBase64(file);
        fileMeta = {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        };
      }

      await apiCall('/requests', 'POST', {
        type: requestType,
        fromDate,
        toDate,
        reason,
        attachmentBase64: fileBase64,
        attachmentMeta: fileMeta
      });

      setSubmitting(false);
      setIsModalOpen(false);
      addNotification('Đơn yêu cầu mới', `Nhân viên ${currentUser.fullName} đã gửi đơn ${requestType} mới đang chờ phê duyệt.`, 'info');
      
      // Clean form fields
      setFromDate('');
      setToDate('');
      setReason('');
      setFile(null);
      
      pushLog(`Tạo đơn ${requestType} thành công. Mã NV: ${currentUser.employeeId}. Trạng thái: Chờ duyệt.`, 'success');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      
      await syncFromBackend();
    } catch (err) {
      setFormError(err.message);
      pushLog(`Lỗi gửi đơn: ${err.message}`, 'error');
      setSubmitting(false);
    }
  };

  const myRequests = requests.filter(req => req.employeeId === currentUser.employeeId);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Đã duyệt</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">🔴 Từ chối</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">🟡 Chờ duyệt</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Đơn từ của bạn</h1>
          <p className="text-slate-400 text-sm mt-1">Gửi và theo dõi tiến trình phê duyệt các đơn xin nghỉ phép, chấm công bù hoặc tăng ca.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-lg shadow-teal-500/10 flex items-center gap-2 transition duration-200"
        >
          <Plus className="w-5 h-5" />
          Tạo đơn mới
        </button>
      </div>

      {/* Requests History List */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20">
          <h3 className="font-bold text-slate-200">Danh sách đơn từ đã gửi</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold border-b border-slate-800">
                <th className="px-6 py-4">Mã Đơn</th>
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4">Loại Đơn</th>
                <th className="px-6 py-4">Thời Gian Yêu Cầu</th>
                <th className="px-6 py-4">Lý Do / Minh Chứng</th>
                <th className="px-6 py-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/80">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                    Bạn chưa gửi bất kỳ yêu cầu nào.
                  </td>
                </tr>
              ) : (
                myRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-900/10 transition duration-150">
                    <td className="px-6 py-4 font-semibold text-slate-400">#REQ{req.id.toString().slice(-4)}</td>
                    <td className="px-6 py-4 text-slate-200 font-medium">{req.employeeName} <span className="text-slate-500 block text-xs">{req.employeeId}</span></td>
                    <td className="px-6 py-4 font-semibold text-slate-350">{req.type}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {req.fromDate === req.toDate ? req.fromDate : `${req.fromDate} → ${req.toDate}`}
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs">
                      <p className="truncate" title={req.reason}>{req.reason}</p>
                      {req.attachment && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-teal-400 mt-1">
                          <FileDown className="w-3 h-3" />
                          {req.attachment.name} ({req.attachment.size})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(req.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-6 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-slate-100">Khởi tạo đơn yêu cầu</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Request Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Loại đơn yêu cầu *</label>
                <select
                  value={requestType}
                  onChange={(e) => { setRequestType(e.target.value); setFormError(''); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
                >
                  <option value="Xin nghỉ phép">Xin nghỉ phép (Ví dụ: Việc cá nhân, Bệnh)</option>
                  <option value="Xin đi muộn/về sớm">Xin đi muộn / về sớm</option>
                  <option value="Giải trình quên check-in">Giải trình quên check-in (Chấm công bù)</option>
                  <option value="Giải trình quên check-out">Giải trình quên check-out (Chấm công bù)</option>
                  <option value="Đăng ký tăng ca">Đăng ký tăng ca (OT)</option>
                  <option value="Đăng ký làm online">Đăng ký làm việc từ xa (Online)</option>
                </select>
              </div>

              {/* Corrected Time input for punch corrections */}
              {requestType.includes('Giải trình') && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-xs font-semibold text-slate-400">Giờ chấm công thực tế cần điều chỉnh *</label>
                  <input
                    type="time"
                    required
                    value={correctedTime}
                    onChange={(e) => setCorrectedTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
                  />
                </div>
              )}

              {/* Conditional Notification for Punch Correction */}
              {requestType.includes('Giải trình') && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed">
                  <Info className="w-5 h-5 shrink-0 text-amber-400" />
                  <div>
                    <span className="font-semibold block mb-0.5">Quy trình nội bộ bắt buộc</span>
                    Đơn xin chấm công bù bắt buộc phải được bộ phận Nhân sự (HR) hoặc Admin xác nhận mới có hiệu lực.
                  </div>
                </div>
              )}

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-4">
                {/* From Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Từ ngày *</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    min={requestType === 'Xin nghỉ phép' ? getTodayString() : undefined}
                    max={requestType === 'Giải trình quên check-in' ? getTodayString() : undefined}
                    onChange={(e) => { setFromDate(e.target.value); setFormError(''); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
                  />
                </div>

                {/* To Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Đến ngày *</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    min={fromDate || (requestType === 'Xin nghỉ phép' ? getTodayString() : undefined)}
                    max={requestType === 'Giải trình quên check-in' ? getTodayString() : undefined}
                    onChange={(e) => { setToDate(e.target.value); setFormError(''); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
                  />
                </div>
              </div>

              {/* Reason Textarea with length validator */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400">Lý do chi tiết *</label>
                  <span className={`text-[10px] ${reason.length < 10 || reason.length > 500 ? 'text-amber-500' : 'text-teal-500'}`}>
                    {reason.length}/500 ký tự (Min: 10)
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  placeholder="Vui lòng cung cấp lý do chi tiết rõ ràng (Ví dụ: lý do xin nghỉ phép, ghi rõ ngày giờ quên checkin)..."
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setFormError(''); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200 resize-none"
                />
              </div>

              {/* File Attachment Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Đính kèm minh chứng (Không bắt buộc)</label>
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm">
                  <input
                    type="file"
                    accept=".jpg,.png,.pdf"
                    onChange={handleFileChange}
                    className="text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-teal-400 file:cursor-pointer cursor-pointer"
                  />
                </div>
                <span className="block text-[10px] text-slate-500">Định dạng hỗ trợ: .jpg, .png, .pdf. Dung lượng tối đa: 5MB.</span>
              </div>

              {/* Form Action */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/10 transition flex items-center gap-2"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  ) : 'Gửi đơn yêu cầu'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

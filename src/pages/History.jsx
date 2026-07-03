import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Calendar, AlertCircle, Filter, HelpCircle } from 'lucide-react';

export default function History() {
  const { attendanceHistory, pushLog, currentUser } = useApp();

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

  // Date helper functions for dynamic current month limits
  const getFirstDayOfCurrentMonth = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const getLastDayOfCurrentMonth = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    const monthStr = String(month).padStart(2, '0');
    return `${year}-${monthStr}-${lastDay}`;
  };

  const getCurrentMonthVal = () => {
    return String(new Date().getMonth() + 1).padStart(2, '0');
  };

  const getCurrentYearVal = () => {
    return String(new Date().getFullYear());
  };

  // Static options for month and year combo boxes
  const monthOptions = [
    { value: '01', label: 'Tháng 1' },
    { value: '02', label: 'Tháng 2' },
    { value: '03', label: 'Tháng 3' },
    { value: '04', label: 'Tháng 4' },
    { value: '05', label: 'Tháng 5' },
    { value: '06', label: 'Tháng 6' },
    { value: '07', label: 'Tháng 7' },
    { value: '08', label: 'Tháng 8' },
    { value: '09', label: 'Tháng 9' },
    { value: '10', label: 'Tháng 10' },
    { value: '11', label: 'Tháng 11' },
    { value: '12', label: 'Tháng 12' }
  ];

  const yearOptions = ['2024', '2025', '2026', '2027'];

  // Filter States
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthVal());
  const [filterYear, setFilterYear] = useState(getCurrentYearVal());
  const [fromDate, setFromDate] = useState(getFirstDayOfCurrentMonth());
  const [toDate, setToDate] = useState(getLastDayOfCurrentMonth());
  const [statusFilter, setStatusFilter] = useState('All');
  const [validationError, setValidationError] = useState('');
  
  // Displayed records state
  const [filteredLogs, setFilteredLogs] = useState([]);

  // Auto run initial query for current month on mount
  useEffect(() => {
    const start = new Date(getFirstDayOfCurrentMonth());
    const end = new Date(getLastDayOfCurrentMonth());
    const result = attendanceHistory.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= start && logDate <= end && (!log.employeeId || log.employeeId === currentUser.employeeId);
    });
    setFilteredLogs(result);
  }, [attendanceHistory, currentUser]);

  const getStatusClasses = (status) => {
    switch (status) {
      case 'Hợp lệ':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'Đi muộn':
      case 'Về sớm':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'Vắng mặt':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'Đang làm việc':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  // Updates fromDate and toDate when month or year changes
  const updateDateRange = (month, year) => {
    const firstDayStr = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    setFromDate(firstDayStr);
    setToDate(lastDayStr);
    
    pushLog(`Simulate: Chọn lọc độc lập Tháng ${month} / Năm ${year}. Tự cập nhật khoảng ngày: ${firstDayStr} đến ${lastDayStr}`);
  };

  const handleMonthChange = (e) => {
    const month = e.target.value;
    setFilterMonth(month);
    setValidationError('');
    if (month && filterYear) {
      updateDateRange(month, filterYear);
    }
  };

  const handleYearChange = (e) => {
    const year = e.target.value;
    setFilterYear(year);
    setValidationError('');
    if (filterMonth && year) {
      updateDateRange(filterMonth, year);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setValidationError('');

    if (!fromDate || !toDate) {
      setValidationError('Vui lòng chọn đầy đủ khoảng ngày tìm kiếm.');
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    if (end < start) {
      setValidationError('Ngày kết thúc không được phép nhỏ hơn ngày bắt đầu.');
      return;
    }

    // Time difference validation: Limit to 31 days
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      setValidationError('Khoảng cách tra cứu không được vượt quá 31 ngày (Mức tối đa cho phép để tránh crash hệ thống).');
      pushLog(`Tra cứu lịch sử bị chặn: Khoảng cách ${diffDays} ngày vượt quá giới hạn 31 ngày.`, 'error');
      return;
    }

    pushLog(`Tra cứu lịch sử chấm công: Tháng ${filterMonth}/${filterYear} (Từ ${fromDate} đến ${toDate}) (Trạng thái: ${statusFilter})`);

    // Filter attendance record array based on dates
    let result = attendanceHistory.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= start && logDate <= end && (!log.employeeId || log.employeeId === currentUser.employeeId);
    });

    // Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(log => {
        if (statusFilter === 'Valid') return log.status === 'Hợp lệ';
        if (statusFilter === 'LateEarly') return log.status === 'Đi muộn' || log.status === 'Về sớm';
        if (statusFilter === 'Absent') return log.status === 'Vắng mặt';
        return true;
      });
    }

    setFilteredLogs(result);
    pushLog(`Tìm thấy ${result.length} bản ghi phù hợp.`, 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Search Filter Header */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Filter className="w-5 h-5 text-teal-400" />
          Bộ lọc lịch sử chấm công nâng cao
        </h3>

        <form onSubmit={handleSearch} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
            {/* 1. Select Month */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Chọn Tháng</label>
              <select
                value={filterMonth}
                onChange={handleMonthChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200 cursor-pointer"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 2. Select Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Chọn Năm</label>
              <select
                value={filterYear}
                onChange={handleYearChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200 cursor-pointer"
              >
                {yearOptions.map(yr => (
                  <option key={yr} value={yr}>Năm {yr}</option>
                ))}
              </select>
            </div>

            {/* 3. From Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Từ ngày (Tự chọn)</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setValidationError(''); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
              />
            </div>

            {/* 4. To Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Đến ngày (Tự chọn)</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setValidationError(''); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
              />
            </div>

            {/* 5. Filter by Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Lọc theo trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="Valid">Hợp lệ (Đúng giờ)</option>
                <option value="LateEarly">Đi muộn / Về sớm</option>
                <option value="Absent">Vắng mặt không lý do</option>
              </select>
            </div>

          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-850">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              Giới hạn ngày: Khoảng cách giữa 2 ngày không được vượt quá 31 ngày.
            </span>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 transition duration-200 text-sm"
            >
              <Search className="w-4 h-4" />
              Áp dụng bộ lọc
            </button>
          </div>

        </form>

        {validationError && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex gap-2 items-center">
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Attendance History Table Card */}
      <div className="bg-slate-900/30 border border-slate-855 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/20 flex justify-between items-center">
          <h3 className="font-bold text-slate-200">Kết quả lịch sử chấm công</h3>
          <span className="text-xs font-semibold text-slate-400">Hiển thị {filteredLogs.length} kết quả</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold border-b border-slate-800">
                <th className="px-6 py-4">Ngày</th>
                <th className="px-6 py-4">Ca Làm Việc</th>
                <th className="px-6 py-4">Giờ Vào (In)</th>
                <th className="px-6 py-4">Giờ Ra (Out)</th>
                <th className="px-6 py-4">Số Giờ Thực Tế</th>
                <th className="px-6 py-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                    Không tìm thấy dữ liệu chấm công cho khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/10 transition duration-150">
                    <td className="px-6 py-4 font-medium text-slate-300">{formatDate(log.date)}</td>
                    <td className="px-6 py-4 text-slate-400">{log.shift}</td>
                    <td className="px-6 py-4 text-slate-350 font-mono">{log.clockIn}</td>
                    <td className="px-6 py-4 text-slate-350 font-mono">{log.clockOut}</td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{log.actualHours}h</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStatusClasses(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

import { query } from '../config/db.js';

const mapRequestToCamel = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    fromDate: row.from_date,
    toDate: row.to_date,
    reason: row.reason,
    correctedTime: row.corrected_time,
    attachment: {
      name: row.attachment_name,
      size: row.attachment_size,
      path: row.attachment_path
    },
    status: row.status,
    rejectReason: row.reject_reason,
    employeeName: row.employee_name,
    employeeId: row.employee_id,
    submitDate: row.submit_date
  };
};

export const submitRequest = async (req, res) => {
  try {
    const { type, fromDate, toDate, reason, attachmentBase64, attachmentMeta } = req.body;
    const employeeId = req.user.employeeId;
    const fullName = req.user.fullName;

    if (!type || !fromDate || !toDate || !reason) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin biểu mẫu đơn.' });
    }

    if (reason.length < 10 || reason.length > 500) {
      return res.status(400).json({ error: 'Lý do phải có độ dài tối thiểu từ 10 ký tự đến tối đa 500 ký tự.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (type.includes('nghỉ phép')) {
      if (fromDate < todayStr) {
        return res.status(400).json({ error: 'Ngày bắt đầu nghỉ phép tối thiểu phải từ ngày hôm nay trở đi.' });
      }
    } else if (type.includes('quên check-in') || type.includes('bù')) {
      if (fromDate > todayStr) {
        return res.status(400).json({ error: 'Không được phép giải trình quên chấm công cho tương lai.' });
      }
    }

    let attachmentName = '';
    let attachmentSize = '';
    let attachmentPath = '';

    if (attachmentBase64 && attachmentMeta) {
      attachmentName = attachmentMeta.name || 'attachment';
      attachmentSize = attachmentMeta.size || '0.1 MB';
      attachmentPath = attachmentBase64;
    }

    const result = await query(`
      INSERT INTO requests (type, from_date, to_date, reason, attachment_name, attachment_size, attachment_path, status, employee_name, employee_id, submit_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [type, fromDate, toDate, reason, attachmentName, attachmentSize, attachmentPath, 'Pending', fullName, employeeId, todayStr]);

    if (type.includes('quên check-in') || type.includes('bù')) {
      const timeStr = new Date().toLocaleTimeString('vi-VN');
      await query('INSERT INTO logs (text) VALUES ($1)', [
        `[${timeStr}] ⚠️ Yêu cầu giải trình chấm công bù mới từ ${fullName} (${employeeId}). Chờ bộ phận HR xác nhận.`
      ]).catch(() => {});
    }

    res.status(201).json({
      message: 'Gửi đơn đề xuất thành công!',
      request: mapRequestToCamel(result.rows[0])
    });

  } catch (error) {
    console.error('Lỗi gửi đơn:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi nộp đơn từ.' });
  }
};

export const getRequests = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const role = req.user.role;

    let result;
    if (role === 'HR' || role === 'Admin') {
      result = await query('SELECT * FROM requests ORDER BY id DESC');
    } else {
      result = await query('SELECT * FROM requests WHERE employee_id = $1 ORDER BY id DESC', [employeeId]);
    }
    
    res.json({ requests: result.rows.map(row => mapRequestToCamel(row)) });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn từ:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách đơn từ.' });
  }
};

export const handleApproveReject = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    if (status === 'Rejected' && (!rejectReason || rejectReason.trim() === '')) {
      return res.status(400).json({ error: 'Bắt buộc phải nhập lý do từ chối đơn.' });
    }

    const findReq = await query('SELECT * FROM requests WHERE id = $1', [id]);
    if (findReq.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn yêu cầu.' });
    }

    const reqObj = findReq.rows[0];

    const updateRes = await query(`
      UPDATE requests 
      SET status = $1, reject_reason = $2 
      WHERE id = $3 
      RETURNING *
    `, [status, status === 'Rejected' ? rejectReason : '', id]);

    const updatedRequest = mapRequestToCamel(updateRes.rows[0]);

    // Auto-update attendance records on approval
    if (status === 'Approved') {
      if (reqObj.type.includes('quên check-in') || reqObj.type.includes('bù')) {
        await query(`
          INSERT INTO attendance (employee_id, date, shift, clock_in, clock_out, actual_hours, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (employee_id, date)
          DO UPDATE SET 
            shift = EXCLUDED.shift, 
            clock_in = EXCLUDED.clock_in, 
            clock_out = EXCLUDED.clock_out, 
            actual_hours = EXCLUDED.actual_hours, 
            status = EXCLUDED.status
        `, [
          reqObj.employee_id,
          reqObj.from_date,
          'Ca hành chính (08:00 - 17:30)',
          '08:00:00',
          '17:30:00',
          8.5,
          'Hợp lệ'
        ]);
      } else if (reqObj.type.includes('nghỉ phép')) {
        let currentDate = new Date(reqObj.from_date);
        const endDate = new Date(reqObj.to_date);
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          await query(`
            INSERT INTO attendance (employee_id, date, shift, clock_in, clock_out, actual_hours, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (employee_id, date)
            DO UPDATE SET 
              shift = EXCLUDED.shift, 
              clock_in = EXCLUDED.clock_in, 
              clock_out = EXCLUDED.clock_out, 
              actual_hours = EXCLUDED.actual_hours, 
              status = EXCLUDED.status
          `, [
            reqObj.employee_id,
            dateStr,
            'Ca hành chính (08:00 - 17:30)',
            '-',
            '-',
            0,
            'Nghỉ phép'
          ]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    res.json({
      message: `Đã ${status === 'Approved' ? 'duyệt' : 'từ chối'} đơn đề xuất thành công.`,
      request: updatedRequest
    });

  } catch (error) {
    console.error('Lỗi phê duyệt đơn:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi phê duyệt đơn từ.' });
  }
};

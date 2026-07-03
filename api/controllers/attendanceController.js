import { query } from '../config/db.js';

const mapAttendanceToCamel = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    shift: row.shift,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    actualHours: parseFloat(row.actual_hours || 0),
    status: row.status
  };
};

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const diffLat = ((lat2 - lat1) * Math.PI) / 180;
  const diffLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(diffLon / 2) * Math.sin(diffLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const isIpAllowed = (clientIp) => {
  const allowedIpsStr = process.env.OFFICE_WIFI_IPS || '127.0.0.1,::1,::ffff:127.0.0.1';
  const allowedIps = allowedIpsStr.split(',').map((ip) => ip.trim().toLowerCase());
  const cleanIp = clientIp.replace(/^::ffff:/, '').toLowerCase();
  
  return allowedIps.some(allowed => 
    allowed === clientIp.toLowerCase() || 
    allowed === cleanIp || 
    allowed === 'localhost' ||
    allowed === '*'
  );
};

export const checkIn = async (req, res) => {
  try {
    const { lat, lng, wifiIp, shiftName, checkInTimeStr } = req.body;
    const employeeId = req.user.employeeId;

    const isOnlineShift = shiftName && shiftName.toLowerCase().includes('online');

    // Check IP if not a Remote shift (Online)
    const clientIp = wifiIp || req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    if (!isOnlineShift && !isIpAllowed(clientIp)) {
      return res.status(400).json({ error: 'Sai địa chỉ IP mạng văn phòng! Bạn cần kết nối đúng WiFi công ty.' });
    }
    if (!isOnlineShift) {
      const companyLat = parseFloat(process.env.COMPANY_LAT || '21.028511');
      const companyLng = parseFloat(process.env.COMPANY_LNG || '105.854167');
      
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Vui lòng cung cấp tọa độ định vị GPS để xác thực.' });
      }

      const distance = getDistanceInMeters(lat, lng, companyLat, companyLng);
      if (distance > 100) {
        return res.status(400).json({ error: `Bạn đang ở ngoài phạm vi công ty! Khoảng cách GPS thực tế là ${Math.round(distance)}m (Yêu cầu <= 100m).` });
      }
    } else {
      // Check for approved remote shift request
      const todayStr = new Date().toISOString().split('T')[0];
      const hasApprovedOnline = await query(`
        SELECT * FROM requests 
        WHERE employee_id = $1 
          AND LOWER(type) LIKE '%nghĩ%' 
          AND status = 'Approved' 
          AND from_date <= $2 
          AND to_date >= $3
      `, [employeeId, todayStr, todayStr]);
      console.log(`Checking remote leave approved for ${employeeId}: ${hasApprovedOnline.rows.length > 0}`);
    }

    // Check duplicate checkin
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = await query('SELECT * FROM attendance WHERE employee_id = $1 AND date = $2', [employeeId, todayStr]);

    if (existing.rows.length > 0 && existing.rows[0].clock_in !== '-') {
      return res.status(400).json({ error: 'Bạn đã thực hiện check-in ca làm việc hôm nay rồi.' });
    }

    const checkInTime = checkInTimeStr ? new Date(checkInTimeStr) : new Date();
    const clockInStr = checkInTime.toTimeString().split(' ')[0];

    // Determine status (Late check)
    let attendanceStatus = 'Hợp lệ';
    const checkInHour = checkInTime.getHours() + checkInTime.getMinutes() / 60;
    
    if (shiftName.includes('Sáng') && checkInHour > 8.0) {
      attendanceStatus = 'Đi muộn';
    } else if (shiftName.includes('Chiều') && checkInHour > 13.5) {
      attendanceStatus = 'Đi muộn';
    } else if (shiftName.includes('gãy') || shiftName.includes('hành chính') && checkInHour > 8.0) {
      attendanceStatus = 'Đi muộn';
    }

    let savedRecord;
    if (existing.rows.length > 0) {
      const updateRes = await query(`
        UPDATE attendance 
        SET shift = $1, clock_in = $2, clock_out = $3, actual_hours = $4, status = $5
        WHERE employee_id = $6 AND date = $7
        RETURNING *
      `, [shiftName, clockInStr, '-', 0, attendanceStatus, employeeId, todayStr]);
      savedRecord = mapAttendanceToCamel(updateRes.rows[0]);
    } else {
      const insertRes = await query(`
        INSERT INTO attendance (employee_id, date, shift, clock_in, clock_out, actual_hours, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [employeeId, todayStr, shiftName, clockInStr, '-', 0, attendanceStatus]);
      savedRecord = mapAttendanceToCamel(insertRes.rows[0]);
    }

    res.status(201).json({
      message: 'Check-in thành công!',
      record: savedRecord
    });

  } catch (error) {
    console.error('Lỗi Check-in:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi thực hiện chấm công.' });
  }
};

export const checkOut = async (req, res) => {
  try {
    const { checkOutTimeStr } = req.body;
    const employeeId = req.user.employeeId;
    const todayStr = new Date().toISOString().split('T')[0];

    const existing = await query('SELECT * FROM attendance WHERE employee_id = $1 AND date = $2', [employeeId, todayStr]);

    if (existing.rows.length === 0 || existing.rows[0].clock_in === '-') {
      return res.status(400).json({ error: 'Bạn chưa thực hiện Check-in cho ngày hôm nay.' });
    }

    const record = existing.rows[0];
    if (record.clock_out !== '-') {
      return res.status(400).json({ error: 'Bạn đã thực hiện Check-out hôm nay rồi.' });
    }

    const checkOutTime = checkOutTimeStr ? new Date(checkOutTimeStr) : new Date();
    const clockOutStr = checkOutTime.toTimeString().split(' ')[0];

    // Compute actual hours
    const [inH, inM, inS] = record.clock_in.split(':').map(Number);
    const clockInDate = new Date(todayStr);
    clockInDate.setHours(inH, inM, inS);
    
    const diffMs = checkOutTime - clockInDate;
    const diffHrs = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);

    // Status early check
    let finalStatus = record.status;
    if (finalStatus === 'Hợp lệ') {
      const checkoutHour = checkOutTime.getHours() + checkOutTime.getMinutes() / 60;
      if (record.shift.includes('Sáng') && checkoutHour < 12.0) {
        finalStatus = 'Về sớm';
      } else if (record.shift.includes('Chiều') && checkoutHour < 17.5) {
        finalStatus = 'Về sớm';
      } else if (record.shift.includes('gãy') || record.shift.includes('hành chính') && checkoutHour < 17.5) {
        finalStatus = 'Về sớm';
      }
    }

    const updateRes = await query(`
      UPDATE attendance 
      SET clock_out = $1, actual_hours = $2, status = $3
      WHERE employee_id = $4 AND date = $5
      RETURNING *
    `, [clockOutStr, diffHrs, finalStatus, employeeId, todayStr]);

    res.json({
      message: 'Check-out thành công!',
      record: mapAttendanceToCamel(updateRes.rows[0])
    });

  } catch (error) {
    console.error('Lỗi Check-out:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi thực hiện Check-out.' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const employeeId = req.user.employeeId;
    const role = req.user.role;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'Vui lòng cung cấp khoảng ngày tra cứu (fromDate, toDate).' });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      return res.status(400).json({ error: 'Khoảng thời gian tra cứu lịch sử không được vượt quá 31 ngày.' });
    }

    let result;
    if (role === 'Admin' || role === 'HR' || role === 'KeToan') {
      result = await query(`
        SELECT * FROM attendance 
        WHERE date >= $1 AND date <= $2 
        ORDER BY date DESC, employee_id ASC
      `, [fromDate, toDate]);
    } else {
      result = await query(`
        SELECT * FROM attendance 
        WHERE employee_id = $1 AND date >= $2 AND date <= $3 
        ORDER BY date DESC
      `, [employeeId, fromDate, toDate]);
    }

    res.json({ history: result.rows.map(row => mapAttendanceToCamel(row)) });

  } catch (error) {
    console.error('Lỗi lấy lịch sử chấm công:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi lấy lịch sử chấm công.' });
  }
};

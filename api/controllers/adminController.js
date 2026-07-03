import { query } from '../config/db.js';

const mapUserToCamel = (row) => {
  if (!row) return null;
  return {
    employeeId: row.employee_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    cccd: row.cccd,
    phone: row.phone,
    address: row.address,
    startDate: row.start_date,
    department: row.department,
    position: row.position,
    gender: row.gender,
    dob: row.dob,
    isProfileComplete: row.is_profile_complete,
    isBlocked: row.is_blocked,
    contractExpiry: row.contract_expiry || 'Vô thời hạn'
  };
};

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

export const getEntities = async (req, res) => {
  try {
    const depts = await query('SELECT name FROM departments ORDER BY name ASC');
    const pos = await query('SELECT name FROM positions ORDER BY name ASC');
    res.json({
      departments: depts.rows.map(d => d.name),
      positions: pos.rows.map(p => p.name)
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh mục.' });
  }
};

export const manageDepartments = async (req, res) => {
  try {
    const { action, name, oldName } = req.body;

    if (action === 'create') {
      if (!name) return res.status(400).json({ error: 'Tên phòng ban không được để trống.' });
      const existing = await query('SELECT * FROM departments WHERE name = $1', [name]);
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Tên phòng ban đã tồn tại.' });
      
      await query('INSERT INTO departments (name) VALUES ($1)', [name]);
    } else if (action === 'update') {
      await query('UPDATE departments SET name = $1 WHERE name = $2', [name, oldName]);
    } else if (action === 'delete') {
      await query('DELETE FROM departments WHERE name = $1', [name]);
    } else {
      return res.status(400).json({ error: 'Hành động không hợp lệ.' });
    }

    const depts = await query('SELECT name FROM departments ORDER BY name ASC');
    res.json({ message: 'Cấu hình phòng ban thành công!', departments: depts.rows.map(d => d.name) });

  } catch (error) {
    res.status(500).json({ error: 'Lỗi hệ thống khi cấu hình phòng ban.' });
  }
};

export const managePositions = async (req, res) => {
  try {
    const { action, name, oldName } = req.body;

    if (action === 'create') {
      if (!name) return res.status(400).json({ error: 'Tên chức vụ không được để trống.' });
      const existing = await query('SELECT * FROM positions WHERE name = $1', [name]);
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Tên chức vụ đã tồn tại.' });
      
      await query('INSERT INTO positions (name) VALUES ($1)', [name]);
    } else if (action === 'update') {
      await query('UPDATE positions SET name = $1 WHERE name = $2', [name, oldName]);
    } else if (action === 'delete') {
      await query('DELETE FROM positions WHERE name = $1', [name]);
    } else {
      return res.status(400).json({ error: 'Hành động không hợp lệ.' });
    }

    const pos = await query('SELECT name FROM positions ORDER BY name ASC');
    res.json({ message: 'Cấu hình chức vụ thành công!', positions: pos.rows.map(p => p.name) });

  } catch (error) {
    res.status(500).json({ error: 'Lỗi hệ thống khi cấu hình chức vụ.' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const result = await query('SELECT employee_id, full_name, email, role, cccd, phone, address, start_date, department, position, gender, dob, is_profile_complete, is_blocked FROM users ORDER BY employee_id ASC');
    res.json({ users: result.rows.map(row => mapUserToCamel(row)) });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách tài khoản.' });
  }
};

export const updateUserAccount = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { role, department, position, isBlocked, blockReason, fullName, email, phone, cccd, dob, gender, address, startDate, isProfileComplete, contractExpiry, adminVerificationCode } = req.body;
    const currentUser = req.user;

    const userRes = await query('SELECT * FROM users WHERE employee_id = $1', [employeeId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản cần sửa.' });
    }

    const user = mapUserToCamel(userRes.rows[0]);

    const getRoleLevel = (r) => {
      if (r === 'Admin') return 3;
      if (r === 'HR' || r === 'KeToan') return 2;
      return 1;
    };

    // 1. HR cannot edit Admin accounts
    if (currentUser.role === 'HR' && user.role === 'Admin') {
      return res.status(403).json({ error: 'Thẩm quyền thất bại: Nhân sự (HR) không được phép thay đổi thông tin hay vai trò của Admin.' });
    }

    // 2. HR cannot assign Admin role to others
    if (currentUser.role === 'HR' && role === 'Admin') {
      return res.status(403).json({ error: 'Thẩm quyền thất bại: Nhân sự (HR) không có quyền cấp vai trò Quản trị viên (Admin).' });
    }

    // 3. HR cannot downgrade another HR or KeToan (level 2) to NhanVien (level 1)
    if (currentUser.role === 'HR' && getRoleLevel(user.role) === 2 && role && getRoleLevel(role) < 2) {
      return res.status(403).json({ error: 'Thẩm quyền thất bại: Nhân sự (HR) không được phép hạ cấp vai trò của nhân sự quản lý ngang hàng (HR/Kế toán) xuống cấp Nhân viên.' });
    }

    // 4. Admin cannot self-demote or self-block
    if (employeeId === currentUser.employeeId) {
      if (role && role !== 'Admin') {
        return res.status(400).json({ error: 'Lỗi bảo mật tối cao: Bạn không được tự hạ quyền Quản trị (Admin) của bản thân.' });
      }
      if (isBlocked === true) {
        return res.status(400).json({ error: 'Lỗi bảo mật tối cao: Bạn không được phép khóa tài khoản Admin của chính bản thân.' });
      }
    }

    // 5. Admin cannot demote another Admin
    if (user.role === 'Admin' && role && role !== 'Admin') {
      return res.status(400).json({ error: 'Lỗi bảo mật tối cao: Bạn không được phép hạ quyền của các tài khoản Admin khác.' });
    }

    // High level Admin code verification check
    if (role === 'Admin' && user.role !== 'Admin') {
      if (adminVerificationCode !== 'SUPER_ADMIN_2026') {
        return res.status(400).json({ error: 'Yêu cầu mã xác thực bảo mật cấp cao (Security Code) để cấp quyền Admin.' });
      }
    }

    const updatedFullName      = fullName      !== undefined ? fullName      : user.fullName;
    const updatedEmail         = email         !== undefined ? email         : user.email;
    const updatedRole          = role          !== undefined ? role          : user.role;
    const updatedDept          = department    !== undefined ? department    : user.department;
    const updatedPos           = position      !== undefined ? position      : user.position;
    const updatedBlocked       = isBlocked     !== undefined ? isBlocked     : user.isBlocked;
    const updatedBlockReason   = blockReason   !== undefined ? blockReason   : user.blockReason;
    const updatedPhone         = phone         !== undefined ? phone         : user.phone;
    const updatedCccd          = cccd          !== undefined ? cccd          : user.cccd;
    const updatedDob           = dob           !== undefined ? dob           : user.dob;
    const updatedGender        = gender        !== undefined ? gender        : user.gender;
    const updatedAddress       = address       !== undefined ? address       : user.address;
    const updatedStartDate     = startDate     !== undefined ? startDate     : user.startDate;
    const updatedProfileComplete = isProfileComplete !== undefined ? isProfileComplete : user.isProfileComplete;
    const updatedContractExpiry  = contractExpiry    !== undefined ? contractExpiry    : user.contractExpiry;

    const updateRes = await query(`
      UPDATE users 
      SET full_name = $1, email = $2, role = $3, department = $4, position = $5, is_blocked = $6,
          phone = $7, cccd = $8, dob = $9, gender = $10, address = $11, start_date = $12,
          is_profile_complete = $13, contract_expiry = $14, block_reason = $15
      WHERE employee_id = $16
      RETURNING *
    `, [
      updatedFullName, updatedEmail, updatedRole, updatedDept, updatedPos, updatedBlocked,
      updatedPhone, updatedCccd, updatedDob, updatedGender, updatedAddress, updatedStartDate,
      updatedProfileComplete, updatedContractExpiry, updatedBlockReason, employeeId
    ]);

    res.json({
      message: 'Cập nhật tài khoản người dùng thành công!',
      user: mapUserToCamel(updateRes.rows[0])
    });

  } catch (error) {
    console.error('Lỗi cập nhật tài khoản:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật tài khoản.' });
  }
};

export const manualAttendanceOverride = async (req, res) => {
  try {
    const { employeeId, date, clockIn, clockOut, actualHours, status, shift } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mã nhân viên và ngày cần điều chỉnh công.' });
    }

    const overrideRes = await query(`
      INSERT INTO attendance (employee_id, date, shift, clock_in, clock_out, actual_hours, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (employee_id, date)
      DO UPDATE SET 
        shift = EXCLUDED.shift, 
        clock_in = EXCLUDED.clock_in, 
        clock_out = EXCLUDED.clock_out, 
        actual_hours = EXCLUDED.actual_hours, 
        status = EXCLUDED.status
      RETURNING *
    `, [
      employeeId,
      date,
      shift || 'Ca hành chính (08:00 - 17:30)',
      clockIn || '-',
      clockOut || '-',
      actualHours !== undefined ? parseFloat(actualHours) : 0,
      status || 'Hợp lệ'
    ]);

    res.json({
      message: 'Điều chỉnh lịch sử công thành công!',
      record: mapAttendanceToCamel(overrideRes.rows[0])
    });

  } catch (error) {
    console.error('Lỗi điều chỉnh chấm công:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi điều chỉnh chấm công.' });
  }
};

export const getMatrixGrid = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month || '06';
    const y = year || '2026';

    const usersRes = await query('SELECT employee_id, full_name, department FROM users ORDER BY employee_id ASC');
    const historyRes = await query('SELECT * FROM attendance WHERE date LIKE $1', [`${y}-${m}-%`]);
    
    const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    
    const matrix = usersRes.rows.map(user => {
      const row = {
        employeeId: user.employee_id,
        fullName: user.full_name,
        department: user.department,
        days: {}
      };

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${m}-${String(day).padStart(2, '0')}`;
        const record = historyRes.rows.find(h => h.employee_id === user.employee_id && h.date === dateStr);
        
        let symbol = '-';
        let hours = 0;
        
        if (record) {
          hours = parseFloat(record.actual_hours || 0);
          if (record.status === 'Hợp lệ' || record.status === 'Đi muộn' || record.status === 'Về sớm') {
            symbol = 'X';
          } else if (record.status === 'Nghỉ phép') {
            symbol = 'P';
          } else if (record.status === 'Nghỉ không phép' || record.status === 'Vắng mặt') {
            symbol = 'Ro';
          }
        }
        
        row.days[day] = { symbol, hours };
      }

      return row;
    });

    res.json({ matrix, daysInMonth });

  } catch (error) {
    console.error('Lỗi tải bảng tổng hợp công:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải bảng tổng hợp công.' });
  }
};

export const exportPayrollData = async (req, res) => {
  try {
    const usersRes = await query('SELECT employee_id, full_name, department FROM users');
    const historyRes = await query('SELECT * FROM attendance ORDER BY date DESC, employee_id ASC');

    if (historyRes.rows.length === 0) {
      return res.status(400).json({ error: 'Bảng công hiện tại trống, không thể xuất tệp tin dữ liệu.' });
    }

    let csvContent = '\uFEFFMã NV,Họ và Tên,Phòng ban,Ngày,Ca làm việc,Giờ Check-in,Giờ Check-out,Số giờ thực tế,Trạng thái\n';
    
    historyRes.rows.forEach(h => {
      const user = usersRes.rows.find(u => u.employee_id === h.employee_id) || {};
      csvContent += `${h.employee_id},${user.full_name || ''},${user.department || ''},${h.date},${h.shift},${h.clock_in},${h.clock_out},${h.actual_hours},${h.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=GENX_PKS_Payroll.csv');
    res.send(csvContent);

  } catch (error) {
    console.error('Lỗi xuất dữ liệu bảng công:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xuất dữ liệu bảng công.' });
  }
};

export const getLogs = async (req, res) => {
  try {
    const result = await query('SELECT * FROM logs ORDER BY id DESC LIMIT 100');
    res.json({ logs: result.rows.map(r => ({ id: r.id, text: r.text })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs.' });
  }
};

export const pushLog = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Nội dung log trống.' });
    
    const insertRes = await query('INSERT INTO logs (text) VALUES ($1) RETURNING *', [text]);
    res.json({ status: 'ok', log: { id: insertRes.rows[0].id, text: insertRes.rows[0].text } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to push log.' });
  }
};

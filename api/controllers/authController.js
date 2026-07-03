import { query } from '../config/db.js';
import { mapUserToCamel } from '../middleware/authMiddleware.js';
import nodemailer from 'nodemailer';

const logSystem = async (message, type = 'info') => {
  const timeStr = new Date().toLocaleTimeString('vi-VN');
  const logTypeSymbol = type === 'error' ? '❌' : type === 'success' ? '🟢' : 'ℹ️';
  const text = `[${timeStr}] ${logTypeSymbol} ${message}`;
  
  await query('INSERT INTO logs (text) VALUES ($1)', [text]).catch(err => {
    console.error('Failed to save log to Supabase:', err.message);
  });
};

const sendEmailNotification = async (to, subject, textContent) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'password'
      }
    });

    await transporter.sendMail({
      from: '"GENX PKS HRM" <no-reply@genxpks.com>',
      to,
      subject,
      text: textContent
    });
    console.log(`✉️ Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`🔴 Failed to send email to ${to}:`, error.message);
  }
};

export const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đăng ký.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp.' });
    }

    const existingUser = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email này đã được đăng ký sử dụng.' });
    }

    // Generate unique employeeId NVxxx dynamically
    const allUsers = await query('SELECT employee_id FROM users');
    const maxId = allUsers.rows.reduce((max, u) => {
      const num = parseInt(u.employee_id.replace('NV', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const newEmployeeId = `NV${String(maxId + 1).padStart(3, '0')}`;

    await query(`
      INSERT INTO users (employee_id, full_name, email, password, role, is_profile_complete)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [newEmployeeId, fullName, email.toLowerCase(), password, 'NhanVien', false]);

    await logSystem(`Đăng ký tài khoản mới thành công cho nhân viên: ${fullName} (Mã: ${newEmployeeId})`, 'success');

    // Send activation email
    const emailBody = `Chào mừng ${fullName},\n\nTài khoản quản lý nhân sự GENX PKS của bạn đã được khởi tạo thành công.\nMã nhân viên của bạn là: ${newEmployeeId}.\nVui lòng truy cập hệ thống để kích hoạt và hoàn tất hồ sơ cá nhân.\n\nTrân trọng,\nBộ phận nhân sự GENX PKS.`;
    await sendEmailNotification(email, 'Khởi tạo tài khoản nhân sự GENX PKS thành công', emailBody);

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công! Mã kích hoạt đã được gửi về email.',
      user: {
        employeeId: newEmployeeId,
        fullName,
        email,
        role: 'NhanVien',
        isProfileComplete: false
      }
    });

  } catch (error) {
    console.error('Lỗi API Đăng ký:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký tài khoản.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ Email và Mật khẩu.' });
    }

    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND password = $2',
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const matched = mapUserToCamel(result.rows[0]);

    if (matched.isBlocked) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.' });
    }

    await logSystem(`Đăng nhập hệ thống thành công: ${matched.fullName} (${matched.role})`, 'success');

    res.json({
      message: 'Đăng nhập thành công!',
      token: matched.employeeId,
      user: matched
    });

  } catch (error) {
    console.error('Lỗi API Đăng nhập:', error);
    res.status(500).json({ error: `Lỗi hệ thống khi đăng nhập: ${error.message}`, stack: error.stack });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { cccd, phone, address, startDate, department, position, gender, dob } = req.body;
    const employeeId = req.user.employeeId;

    if (!cccd || !phone || !address || !startDate || !department || !gender || !dob) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ tất cả các trường bắt buộc.' });
    }

    const result = await query(`
      UPDATE users 
      SET cccd = $1, phone = $2, address = $3, start_date = $4, department = $5, position = $6, gender = $7, dob = $8, is_profile_complete = $9
      WHERE employee_id = $10
      RETURNING *
    `, [cccd, phone, address, startDate, department, position || 'Nhân viên chính thức', gender, dob, true, employeeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin nhân viên.' });
    }

    const updatedUser = mapUserToCamel(result.rows[0]);
    await logSystem(`Cập nhật thông tin hồ sơ bắt buộc thành công cho nhân viên: ${updatedUser.fullName}`, 'success');

    res.json({
      message: 'Cập nhật thông tin thành công!',
      user: updatedUser
    });

  } catch (error) {
    console.error('Lỗi API cập nhật thông tin:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật hồ sơ.' });
  }
};

export const getCurrentUser = async (req, res) => {
  res.json({ user: req.user });
};

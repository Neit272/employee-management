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

const validateVietnamesePhone = (phone) => {
  if (!phone) return true;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return /^(0|84|\+84)(3|5|7|8|9)([0-9]{8})$/.test(cleanPhone);
};

const validateCccd = (cccd) => {
  if (!cccd) return true;
  return /^[0-9]{12}$/.test(cccd.trim());
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
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const { fullName, email, cccd, phone, address, startDate, department, position, gender, dob } = req.body;

    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      if (!validateVietnamesePhone(phone)) {
        return res.status(400).json({ error: 'Số điện thoại không đúng định dạng Việt Nam (phải gồm 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09).' });
      }
    }

    if (cccd !== undefined && cccd !== null && cccd.trim() !== '') {
      if (!validateCccd(cccd)) {
        return res.status(400).json({ error: 'Số CCCD không hợp lệ (phải gồm đúng 12 chữ số quốc gia).' });
      }
    }

    // Fetch existing user to merge fields
    const userRes = await query('SELECT * FROM users WHERE employee_id = $1', [employeeId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin nhân viên.' });
    }
    const user = userRes.rows[0];

    const merged = {
      fullName: fullName !== undefined ? fullName : user.full_name,
      email: email !== undefined ? email : user.email,
      cccd: cccd !== undefined ? cccd : user.cccd,
      phone: phone !== undefined ? phone : user.phone,
      address: address !== undefined ? address : user.address,
      startDate: startDate !== undefined ? startDate : user.start_date,
      department: department !== undefined ? department : user.department,
      position: position !== undefined ? position : user.position,
      gender: gender !== undefined ? gender : user.gender,
      dob: dob !== undefined ? dob : user.dob
    };

    // Check if profile is complete: all required fields are non-empty
    const isComplete = !!(
      merged.fullName && merged.fullName.trim() &&
      merged.email && merged.email.trim() &&
      merged.cccd && merged.cccd.trim() &&
      merged.phone && merged.phone.trim() &&
      merged.address && merged.address.trim() &&
      merged.startDate && merged.startDate.trim() &&
      merged.department && merged.department.trim() &&
      merged.position && merged.position.trim() &&
      merged.gender && merged.gender.trim() &&
      merged.dob && merged.dob.trim()
    );

    const result = await query(`
      UPDATE users 
      SET full_name = $1, email = $2, cccd = $3, phone = $4, address = $5, start_date = $6, department = $7, position = $8, gender = $9, dob = $10, is_profile_complete = $11
      WHERE employee_id = $12
      RETURNING *
    `, [
      merged.fullName.trim(),
      merged.email.trim().toLowerCase(),
      merged.cccd.trim(),
      merged.phone.trim(),
      merged.address.trim(),
      merged.startDate.trim(),
      merged.department.trim(),
      merged.position.trim(),
      merged.gender,
      merged.dob,
      isComplete,
      employeeId
    ]);

    const updatedUser = mapUserToCamel(result.rows[0]);
    await logSystem(`Cập nhật thông tin hồ sơ thành công cho nhân viên: ${updatedUser.fullName}`, 'success');

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

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng cung cấp Email tài khoản.' });
    }

    const check = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Địa chỉ Email không tồn tại trong hệ thống nhân sự!' });
    }

    const user = check.rows[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Save OTP to users table
    await query(`
      UPDATE users 
      SET document_otp = $1, document_otp_expires_at = $2 
      WHERE employee_id = $3
    `, [otp, expiresAt, user.employee_id]);

    await logSystem(`Yêu cầu đặt lại mật khẩu cho email: ${email}. Đã gửi mã OTP.`, 'info');

    // Send email with OTP code
    const emailBody = `Chào ${user.full_name},\n\nMã OTP khôi phục mật khẩu tài khoản GENX PKS của bạn là: ${otp}.\nMã này có hiệu lực trong vòng 5 phút.\n\nTrân trọng,\nHệ thống bảo mật GENX PKS.`;
    await sendEmailNotification(email, 'Mã OTP khôi phục mật khẩu tài khoản GENX PKS', emailBody);

    res.json({
      message: 'Mã OTP khôi phục mật khẩu đã được gửi thành công!',
      otp: otp // Return for client simulation display
    });
  } catch (error) {
    console.error('Lỗi API Forgot Password:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi gửi mã khôi phục mật khẩu.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Thiếu thông tin Email, mã OTP hoặc Mật khẩu mới.' });
    }

    const check = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy Email tài khoản cần đặt lại mật khẩu.' });
    }

    const user = check.rows[0];

    if (!user.document_otp || user.document_otp !== otp) {
      return res.status(400).json({ error: 'Mã xác nhận OTP 6 số không chính xác.' });
    }

    if (new Date() > new Date(user.document_otp_expires_at)) {
      // Clear expired OTP
      await query("UPDATE users SET document_otp = '', document_otp_expires_at = NULL WHERE employee_id = $1", [user.employee_id]);
      return res.status(400).json({ error: 'Mã OTP khôi phục mật khẩu đã hết hiệu lực (Quá 5 phút).' });
    }

    // Reset OTP upon verification success and update password
    await query("UPDATE users SET password = $1, document_otp = '', document_otp_expires_at = NULL WHERE employee_id = $2", [newPassword, user.employee_id]);
    await logSystem(`Đặt lại mật khẩu thành công cho tài khoản email: ${email}`, 'success');

    res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (error) {
    console.error('Lỗi API Reset Password:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đặt lại mật khẩu.' });
  }
};

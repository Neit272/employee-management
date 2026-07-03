import { query } from '../config/db.js';

export const mapUserToCamel = (row) => {
  if (!row) return null;
  return {
    employeeId: row.employee_id,
    fullName: row.full_name,
    email: row.email,
    password: row.password,
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
    blockReason: row.block_reason || '',
    contractExpiry: row.contract_expiry || 'Vô thời hạn',
    documentOtp: row.document_otp,
    documentOtpExpiresAt: row.document_otp_expires_at
  };
};

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Không tìm thấy token xác thực hoặc sai định dạng.' });
    }

    const token = authHeader.split(' ')[1];

    // Find user by employeeId or email (mock bearer authentication)
    const result = await query(
      'SELECT * FROM users WHERE employee_id = $1 OR LOWER(email) = LOWER($2)',
      [token, token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }

    const row = result.rows[0];

    // Self-healing check for profile completeness status
    if (row && !row.is_profile_complete) {
      const isComplete = !!(
        row.full_name && row.full_name.trim() &&
        row.email && row.email.trim() &&
        row.cccd && row.cccd.trim() &&
        row.phone && row.phone.trim() &&
        row.address && row.address.trim() &&
        row.start_date && row.start_date.trim() &&
        row.department && row.department.trim() &&
        row.position && row.position.trim() &&
        row.gender && row.gender.trim() &&
        row.dob && row.dob.trim()
      );
      if (isComplete) {
        await query('UPDATE users SET is_profile_complete = TRUE WHERE employee_id = $1', [row.employee_id]);
        row.is_profile_complete = true;
      }
    }

    const matchedUser = mapUserToCamel(row);

    if (matchedUser.isBlocked) {
      return res.status(403).json({ error: `Tài khoản của bạn đã bị khóa bởi Quản trị viên. Lý do: ${matchedUser.blockReason || 'Không có lý do cụ thể'}` });
    }

    req.user = matchedUser;
    next();
  } catch (error) {
    console.error('Lỗi xác thực middleware:', error);
    res.status(500).json({ error: 'Lỗi máy chủ xác thực tài khoản.' });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để thực hiện chức năng này.' });
    }
    
    const hasRole = allowedRoles.includes(req.user.role);
    if (!hasRole) {
      return res.status(403).json({ error: `Bạn không có quyền thực hiện. Yêu cầu vai trò: ${allowedRoles.join(', ')}` });
    }
    
    next();
  };
};

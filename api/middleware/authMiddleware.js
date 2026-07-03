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

    const matchedUser = mapUserToCamel(result.rows[0]);

    if (matchedUser.isBlocked) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.' });
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

import { query } from '../config/db.js';
import nodemailer from 'nodemailer';

const mapDocumentToCamel = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employee_id,
    uploadDate: row.upload_date,
    type: row.type,
    path: row.path,
    isCore: row.is_core
  };
};

const sendEmail = async (to, subject, text) => {
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
      text
    });
    console.log(`✉️ OTP email sent successfully to ${to}`);
  } catch (error) {
    console.error(`🔴 Failed to send OTP email to ${to}:`, error.message);
  }
};

export const getDocuments = async (req, res) => {
  try {
    // Exclude the large base64 'path' field from list response to optimize bandwidth
    const result = await query('SELECT id, name, employee_id, upload_date, type, is_core FROM documents ORDER BY id DESC');
    
    res.json({
      documents: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        employeeId: row.employee_id,
        uploadDate: row.upload_date,
        type: row.type,
        isCore: row.is_core
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách tài liệu.' });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const { name, employeeId, category, isCore, fileBase64 } = req.body;
    
    if (!name || !employeeId || !category || !fileBase64) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin tài liệu và nội dung tệp.' });
    }

    const uploadDateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const isCoreBool = isCore === 'true' || isCore === true;

    const result = await query(`
      INSERT INTO documents (name, employee_id, upload_date, type, path, is_core)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name.endsWith('.pdf') ? name : `${name}.pdf`, employeeId, uploadDateStr, category, fileBase64, isCoreBool]);

    const doc = mapDocumentToCamel(result.rows[0]);

    res.status(201).json({
      message: 'Tải tài liệu PDF lên thành công!',
      document: {
        id: doc.id,
        name: doc.name,
        employeeId: doc.employeeId,
        uploadDate: doc.uploadDate,
        type: doc.type,
        isCore: doc.isCore
      }
    });

  } catch (error) {
    console.error('Lỗi tải tài liệu:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tài liệu lên.' });
  }
};

export const requestDocumentAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { passCore } = req.body;
    const matchedUser = req.user;

    // Verify 1st factor: Security core password
    const expectedPass = process.env.PASS_CORE || 'accounting123';
    if (passCore !== expectedPass) {
      return res.status(401).json({ error: 'Mật khẩu bảo mật phân hệ (Pass Core) không chính xác.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save OTP to users table
    await query(`
      UPDATE users 
      SET document_otp = $1, document_otp_expires_at = $2 
      WHERE employee_id = $3
    `, [otp, expiresAt, matchedUser.employeeId]);

    // Send email with OTP code
    const emailBody = `Chào ${matchedUser.fullName},\n\nMã OTP xác thực 2 lớp tải tài liệu của bạn là: ${otp}.\nMã này có hiệu lực trong vòng 5 phút.\nVui lòng không chia sẻ mã này cho bất kỳ ai.\n\nTrân trọng,\nHệ thống bảo mật GENX PKS.`;
    await sendEmail(matchedUser.email, 'Mã OTP xác thực tải tài liệu bảo mật CORE', emailBody);

    res.json({
      message: 'Xác thực lớp 1 thành công! Mã OTP xác thực lớp 2 đã được gửi về email của bạn.'
    });

  } catch (error) {
    console.error('Lỗi yêu cầu OTP tải tài liệu:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi khởi tạo xác thực OTP.' });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const matchedUser = req.user;

    // Retrieve user OTP details from DB to make it serverless stateless
    const userRes = await query('SELECT document_otp, document_otp_expires_at FROM users WHERE employee_id = $1', [matchedUser.employeeId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nhân viên.' });
    }

    const dbUser = userRes.rows[0];

    if (!dbUser.document_otp || dbUser.document_otp !== otp) {
      return res.status(400).json({ error: 'Mã xác nhận OTP 6 số không chính xác.' });
    }

    if (new Date() > new Date(dbUser.document_otp_expires_at)) {
      // Clear expired OTP
      await query('UPDATE users SET document_otp = \'\', document_otp_expires_at = NULL WHERE employee_id = $1', [matchedUser.employeeId]);
      return res.status(400).json({ error: 'Mã OTP đã hết hiệu lực sử dụng (Quá 5 phút).' });
    }

    // Reset OTP upon verification success
    await query('UPDATE users SET document_otp = \'\', document_otp_expires_at = NULL WHERE employee_id = $1', [matchedUser.employeeId]);

    // Retrieve Document details from MongoDB or return a simulated success link
    let doc;
    // Attempt to parse ID as number
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      const docRes = await query('SELECT * FROM documents WHERE id = $1', [numericId]);
      if (docRes.rows.length > 0) {
        doc = mapDocumentToCamel(docRes.rows[0]);
      }
    }

    if (!doc) {
      const coreRes = await query('SELECT * FROM documents WHERE is_core = TRUE LIMIT 1');
      if (coreRes.rows.length > 0) {
        doc = mapDocumentToCamel(coreRes.rows[0]);
      }
    }

    const downloadUrl = doc ? doc.path : 'data:application/pdf;base64,JVBERi0xLjQKJ...';

    res.json({
      message: 'Mã xác thực OTP chính xác! Đã phê duyệt yêu cầu tải tệp.',
      downloadUrl
    });

  } catch (error) {
    console.error('Lỗi xác thực tải tài liệu:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xác nhận OTP tải tệp.' });
  }
};

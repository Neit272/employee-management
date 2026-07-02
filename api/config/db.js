import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase PostgreSQL Connection String
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

let isInitialized = false;

// Table DDL creation scripts
const initDDL = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Initializing Supabase PostgreSQL schema...');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        employee_id VARCHAR(50) PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) DEFAULT 'password123',
        role VARCHAR(50) DEFAULT 'NhanVien',
        cccd VARCHAR(50) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        address TEXT DEFAULT '',
        start_date VARCHAR(50) DEFAULT '',
        department VARCHAR(100) DEFAULT '',
        position VARCHAR(100) DEFAULT '',
        gender VARCHAR(50) DEFAULT '',
        dob VARCHAR(50) DEFAULT '',
        is_profile_complete BOOLEAN DEFAULT FALSE,
        is_blocked BOOLEAN DEFAULT FALSE,
        document_otp VARCHAR(10) DEFAULT '',
        document_otp_expires_at TIMESTAMP DEFAULT NULL
      );
    `);

    // 2. Attendance Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL,
        shift VARCHAR(100) NOT NULL,
        clock_in VARCHAR(50) DEFAULT '-',
        clock_out VARCHAR(50) DEFAULT '-',
        actual_hours NUMERIC(5,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Hợp lệ',
        CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
      );
    `);

    // 3. Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        from_date VARCHAR(50) NOT NULL,
        to_date VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        corrected_time VARCHAR(50) DEFAULT NULL,
        attachment_name VARCHAR(255) DEFAULT '',
        attachment_size VARCHAR(50) DEFAULT '',
        attachment_path TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'Pending',
        reject_reason TEXT DEFAULT '',
        employee_name VARCHAR(100) NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        submit_date VARCHAR(50) NOT NULL
      );
    `);

    // 4. Documents Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        upload_date VARCHAR(50) NOT NULL,
        type VARCHAR(100) NOT NULL,
        path TEXT NOT NULL,
        is_core BOOLEAN DEFAULT FALSE
      );
    `);

    // 5. Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Departments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // 7. Positions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    console.log('🟢 Supabase PostgreSQL schema initialized.');

    // Seed Departments if empty
    const deptCheck = await client.query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptCheck.rows[0].count, 10) === 0) {
      const depts = ['Hành chính', 'Nhân sự', 'Kế toán', 'Kỹ thuật', 'Kinh doanh'];
      for (const d of depts) {
        await client.query('INSERT INTO departments (name) VALUES ($1) ON CONFLICT DO NOTHING', [d]);
      }
      console.log('🌱 Seeded default departments.');
    }

    // Seed Positions if empty
    const posCheck = await client.query('SELECT COUNT(*) FROM positions');
    if (parseInt(posCheck.rows[0].count, 10) === 0) {
      const positions = ['Trưởng phòng', 'Nhân viên chính thức', 'Nhân viên thử việc', 'Kế toán viên', 'Chuyên viên HR'];
      for (const p of positions) {
        await client.query('INSERT INTO positions (name) VALUES ($1) ON CONFLICT DO NOTHING', [p]);
      }
      console.log('🌱 Seeded default positions.');
    }

    // Seed Users if empty
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      const presetUsers = [
        {
          fullName: 'Nguyễn Văn A',
          email: 'nva@genxpks.com',
          role: 'NhanVien',
          employeeId: 'NV001',
          cccd: '012345678912',
          phone: '0987654321',
          address: '123 Đường Láng, Hà Nội',
          startDate: '2025-01-15',
          department: 'Kỹ thuật',
          position: 'Nhân viên chính thức',
          gender: 'Nam',
          dob: '1998-05-20',
          isProfileComplete: true
        },
        {
          fullName: 'Trần Thị B',
          email: 'ttb@genxpks.com',
          role: 'KeToan',
          employeeId: 'NV002',
          cccd: '012345678913',
          phone: '0976543210',
          address: '456 Cầu Giấy, Hà Nội',
          startDate: '2025-02-10',
          department: 'Kế toán',
          position: 'Kế toán viên',
          gender: 'Nữ',
          dob: '1996-08-15',
          isProfileComplete: true
        },
        {
          fullName: 'Lê Văn C',
          email: 'lvc@genxpks.com',
          role: 'HR',
          employeeId: 'NV003',
          cccd: '012345678914',
          phone: '0965432109',
          address: '789 Nguyễn Chí Thanh, Hà Nội',
          startDate: '2024-11-01',
          department: 'Nhân sự',
          position: 'Chuyên viên HR',
          gender: 'Nam',
          dob: '1995-12-05',
          isProfileComplete: true
        },
        {
          fullName: 'Phạm Văn D (System Admin)',
          email: 'admin@genxpks.com',
          role: 'Admin',
          employeeId: 'NV000',
          cccd: '012345678911',
          phone: '0999999999',
          address: 'Trụ sở chính GENX PKS',
          startDate: '2024-01-01',
          department: 'Hành chính',
          position: 'Trưởng phòng',
          gender: 'Nam',
          dob: '1990-01-01',
          isProfileComplete: true
        },
        {
          fullName: 'Hoàng Văn E (Thực tập sinh)',
          email: 'hve@genxpks.com',
          role: 'NhanVien',
          employeeId: 'NV004',
          cccd: '',
          phone: '',
          address: '',
          startDate: '2026-06-01',
          department: 'Kỹ thuật',
          position: 'Nhân viên thử việc',
          gender: '',
          dob: '',
          isProfileComplete: false
        },
        {
          fullName: 'Hoàng Thị E',
          email: 'hte@genxpks.com',
          role: 'NhanVien',
          employeeId: 'NV005',
          cccd: '012345678920',
          phone: '0912345678',
          address: '22 Trần Phú, Hà Nội',
          startDate: '2025-08-01',
          department: 'Kinh doanh',
          position: 'Nhân viên chính thức',
          gender: 'Nữ',
          dob: '1999-03-10',
          isProfileComplete: true
        }
      ];

      for (const u of presetUsers) {
        await client.query(`
          INSERT INTO users (
            employee_id, full_name, email, role, cccd, phone, address, start_date, department, position, gender, dob, is_profile_complete
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          u.employeeId, u.fullName, u.email, u.role, u.cccd, u.phone, u.address, u.startDate, u.department, u.position, u.gender, u.dob, u.isProfileComplete
        ]);
      }
      console.log('🌱 Seeded default users.');
    }

  } catch (err) {
    console.error('🔴 Supabase schema initialization error:', err.message);
  } finally {
    client.release();
  }
};

export const connectDB = async () => {
  if (isInitialized) return;
  try {
    await initDDL();
    isInitialized = true;
  } catch (error) {
    console.error('🔴 Supabase DB connection error:', error.message);
  }
};

export const query = async (text, params) => {
  await connectDB();
  return pool.query(text, params);
};

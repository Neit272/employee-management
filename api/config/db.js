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
        contract_expiry VARCHAR(50) DEFAULT 'Vô thời hạn',
        document_otp VARCHAR(10) DEFAULT '',
        document_otp_expires_at TIMESTAMP DEFAULT NULL
      );
    `);

    // Migrate: add contract_expiry column if it doesn't exist (for existing DBs)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_expiry VARCHAR(50) DEFAULT 'Vô thời hạn'
    `);

    // Migrate: add block_reason column if it doesn't exist
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason VARCHAR(255) DEFAULT ''
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
    // First, let's delete any obsolete demo users from the DB if they exist
    await client.query("DELETE FROM users WHERE email IN ('nva@genxpks.com', 'ttb@genxpks.com', 'lvc@genxpks.com', 'hve@genxpks.com', 'hte@genxpks.com')");
    await client.query("DELETE FROM attendance WHERE employee_id IN ('NV001', 'NV002', 'NV003', 'NV004', 'NV005')");
    await client.query("DELETE FROM requests WHERE employee_id IN ('NV001', 'NV002', 'NV003', 'NV004', 'NV005')");
    await client.query("DELETE FROM documents WHERE employee_id IN ('NV001', 'NV002', 'NV003', 'NV004', 'NV005')");

    const userCheck = await client.query("SELECT COUNT(*) FROM users WHERE email = 'admin@genxpks.com'");
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO users (
          employee_id, full_name, email, password, role, cccd, phone, address, start_date, department, position, gender, dob, is_profile_complete
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        'NV000',
        'Phạm Văn D (System Admin)',
        'admin@genxpks.com',
        'password123',
        'Admin',
        '012345678911',
        '0999999999',
        'Trụ sở chính GENX PKS',
        '2024-01-01',
        'Hành chính',
        'Trưởng phòng',
        'Nam',
        '1990-01-01',
        true
      ]);
      console.log('🌱 Seeded default admin user.');
    }

    // Seed Documents if empty
    const docCheck = await client.query('SELECT COUNT(*) FROM documents');
    if (parseInt(docCheck.rows[0].count, 10) === 0) {
      const defaultDocs = [
        { name: 'HĐLĐ_Lê_Văn_C_Giám_Đốc_Nhân_Sự.pdf', employee_id: 'NV003', upload_date: '2024-11-01 09:00', type: 'Hợp đồng lao động', path: 'data:application/pdf;base64,JVBERi0xLjQKJ...', is_core: true },
        { name: 'HĐMB_Thiết_Bị_Nhà_Xưởng_GENX_2026.pdf', employee_id: 'NV002', upload_date: '2026-03-12 15:30', type: 'Báo cáo tài chính', path: 'data:application/pdf;base64,JVBERi0xLjQKJ...', is_core: true },
        { name: 'Báo_Cáo_Kiểm_Toán_Độc_Lập_GENXPKS_2025.pdf', employee_id: 'NV002', upload_date: '2026-01-20 10:45', type: 'Báo cáo tài chính', path: 'data:application/pdf;base64,JVBERi0xLjQKJ...', is_core: true },
        { name: 'Hợp đồng lao động Nguyễn Văn A.pdf', employee_id: 'NV001', upload_date: '2026-01-15 09:30', type: 'Hợp đồng lao động', path: 'data:application/pdf;base64,JVBERi0xLjQKJ...', is_core: false },
        { name: 'Báo cáo thuế Q1-2026.pdf', employee_id: 'NV002', upload_date: '2026-04-10 14:15', type: 'Báo cáo tài chính', path: 'data:application/pdf;base64,JVBERi0xLjQKJ...', is_core: false },
        { name: 'Thỏa thuận bảo mật NDA.pdf', employee_id: 'NV001', upload_date: '2026-01-15 10:00', type: 'Cam kết bảo mật', path: 'data:application/pdf;base64,JVBERi0xLjQKJ...', is_core: false }
      ];
      for (const d of defaultDocs) {
        await client.query(`
          INSERT INTO documents (name, employee_id, upload_date, type, path, is_core)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [d.name, d.employee_id, d.upload_date, d.type, d.path, d.is_core]);
      }
      console.log('🌱 Seeded default documents.');
    }

  } catch (err) {
    console.error('🔴 Supabase schema initialization error:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

export const connectDB = async () => {
  if (isInitialized) return;
  await initDDL();
  isInitialized = true;
};

export const query = async (text, params) => {
  await connectDB();
  return pool.query(text, params);
};

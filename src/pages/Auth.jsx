import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Mail, Lock, User, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Auth() {
  const { setIsLoggedIn, setCurrentUser, allUsers, setAllUsers, pushLog, showDialog } = useApp();
  
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('nva@genxpks.com');
  const [loginPass, setLoginPass] = useState('••••••••');
  
  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: input email, 2: input OTP & new pass
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [sentOtpVal, setSentOtpVal] = useState('123456');

  const handleRequestOtp = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const email = forgotEmail.toLowerCase().trim();

    // Verify if email exists in system users
    const userExists = allUsers.some(u => u.email.toLowerCase() === email) || 
                       ['nva@genxpks.com', 'ttb@genxpks.com', 'lvc@genxpks.com', 'admin@genxpks.com'].includes(email);
                       
    if (!userExists) {
      setErrorMsg('Địa chỉ Email không tồn tại trong hệ thống nhân sự!');
      pushLog(`Yêu cầu khôi phục mật khẩu thất bại: Email ${email} không tồn tại.`, 'error');
      return;
    }

    // Mock send OTP
    const mockOtp = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtpVal(mockOtp);
    setForgotStep(2);
    setSuccessMsg(`Mã xác thực OTP đã được gửi thành công đến hòm thư: ${email}. (Mã OTP mô phỏng để test là: ${mockOtp})`);
    pushLog(`Simulate OTP: Đã gửi mã khôi phục mật khẩu [${mockOtp}] đến hòm thư ${email}.`, 'success');
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (forgotOtp !== sentOtpVal) {
      setErrorMsg('Mã OTP xác thực không chính xác! Hãy kiểm tra lại hoặc thử lại sau.');
      return;
    }

    if (forgotNewPass.length < 6) {
      setErrorMsg('Mật khẩu mới phải chứa tối thiểu 6 ký tự.');
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    // Update password inside allUsers list
    setAllUsers(prev => prev.map(u => {
      if (u.email.toLowerCase() === forgotEmail.toLowerCase().trim()) {
        return { ...u, password: forgotNewPass };
      }
      return u;
    }));

    pushLog(`Khôi phục mật khẩu thành công cho tài khoản: ${forgotEmail}`, 'success');
    setSuccessMsg('Đã đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.');
    
    // Clear forgot states and redirect back to login step
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setForgotStep(1);
    setActiveTab('login');
    
    confetti({ particleCount: 50, spread: 30 });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    // Simulate API check
    pushLog(`Thực hiện đăng nhập cho email: ${loginEmail}`);
    
    const existingUser = allUsers.find(u => u.email.toLowerCase() === loginEmail.toLowerCase().trim());
    if (existingUser && existingUser.isLocked) {
      setErrorMsg('Tài khoản của bạn đã bị khóa bởi Quản trị viên hệ thống.');
      pushLog(`Đăng nhập thất bại: Tài khoản của ${existingUser.fullName} (${existingUser.employeeId}) đang bị khóa`, 'error');
      return;
    }
    
    // Check if it's one of the preset accounts
    let matchedUser = existingUser;
    if (!matchedUser) {
      if (loginEmail === 'nva@genxpks.com') {
      matchedUser = {
        fullName: 'Nguyễn Văn A',
        email: 'nva@genxpks.com',
        role: 'NhanVien',
        employeeId: 'NV001',
        cccd: '012345678912',
        phone: '0987654321',
        address: '123 Đường Láng, Hà Nội',
        startDate: '2025-01-15',
        department: 'Kỹ thuật',
        gender: 'Nam',
        dob: '1998-05-20',
        isProfileComplete: true
      };
    } else if (loginEmail === 'ttb@genxpks.com') {
      matchedUser = {
        fullName: 'Trần Thị B',
        email: 'ttb@genxpks.com',
        role: 'KeToan',
        employeeId: 'NV002',
        cccd: '012345678913',
        phone: '0976543210',
        address: '456 Cầu Giấy, Hà Nội',
        startDate: '2025-02-10',
        department: 'Kế toán',
        gender: 'Nữ',
        dob: '1996-08-15',
        isProfileComplete: true
      };
    } else if (loginEmail === 'lvc@genxpks.com') {
      matchedUser = {
        fullName: 'Lê Văn C',
        email: 'lvc@genxpks.com',
        role: 'HR',
        employeeId: 'NV003',
        cccd: '012345678914',
        phone: '0965432109',
        address: '789 Nguyễn Chí Thanh, Hà Nội',
        startDate: '2024-11-01',
        department: 'Nhân sự',
        gender: 'Nam',
        dob: '1995-12-05',
        isProfileComplete: true
      };
    } else if (loginEmail === 'admin@genxpks.com') {
      matchedUser = {
        fullName: 'Phạm Văn D (System Admin)',
        email: 'admin@genxpks.com',
        role: 'Admin',
        employeeId: 'NV000',
        cccd: '012345678911',
        phone: '0999999999',
        address: 'Trụ sở chính GENX PKS',
        startDate: '2024-01-01',
        department: 'Hành chính',
        gender: 'Nam',
        dob: '1990-01-01',
        isProfileComplete: true
      };
    } else {
      // Find inside dynamically registered users
      // If not found, assume it is a mock user with incomplete profile for demo
      matchedUser = {
        fullName: loginEmail.split('@')[0],
        email: loginEmail,
        role: 'NhanVien',
        employeeId: `NV${Math.floor(100 + Math.random() * 900)}`,
        cccd: '',
        phone: '',
        address: '',
        startDate: '',
        department: '',
        gender: '',
        dob: '',
        isProfileComplete: false
      };
    }
  }

    setCurrentUser(matchedUser);
    setIsLoggedIn(true);
    pushLog(`Đăng nhập thành công: ${matchedUser.fullName} (${matchedUser.role})`, 'success');
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPass !== regConfirmPass) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      pushLog('Đăng ký thất bại: Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    if (regPass.length < 6) {
      setErrorMsg('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    // Creating new account with incomplete profile to test Mandatory Profile Update
    const newEmpId = `NV${Math.floor(100 + Math.random() * 900)}`;
    const newUser = {
      fullName: regName,
      email: regEmail,
      role: 'NhanVien',
      employeeId: newEmpId,
      cccd: '',
      phone: '',
      address: '',
      startDate: '',
      department: '',
      gender: '',
      dob: '',
      isProfileComplete: false // Force profile update lock screen
    };

    // Add to state DB
    setAllUsers(prev => [...prev, newUser]);
    
    // Simulate push activation email (WITHOUT plain text password)
    pushLog(`Đăng ký tài khoản thành công cho ${regName} (${regEmail})`, 'success');
    pushLog(`[Bảo mật] Đã gửi email kích hoạt đến ${regEmail}. Nội dung email chỉ bao gồm liên kết kích hoạt và mã định danh, TUYỆT ĐỐI KHÔNG hiển thị mật khẩu gốc dạng văn bản thuần.`, 'success');

    // Confetti effect
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    
    setSuccessMsg(`Đăng ký thành công! Hệ thống đã gửi email kích hoạt tài khoản. Đăng nhập ngay để bắt đầu thiết lập thông tin.`);
    setActiveTab('login');
    setLoginEmail(regEmail);
    setLoginPass(regPass);
    
    // Clear registration fields
    setRegName('');
    setRegEmail('');
    setRegPass('');
    setRegConfirmPass('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Brand Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/20 mb-4">
            <ShieldCheck className="w-9 h-9 text-slate-950 stroke-[2]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-300 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
            GENX PKS
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hệ thống Quản lý Nhân sự & Chấm công</p>
        </div>

        {/* Tab Buttons */}
        {activeTab !== 'forgot' ? (
          <div className="flex bg-slate-950 p-1.5 rounded-xl mb-6 border border-slate-800/80">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
              className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'login'
                  ? 'bg-slate-800 text-teal-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
              className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'register'
                  ? 'bg-slate-800 text-teal-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Đăng ký
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-6">
            <button 
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full flex items-center justify-center gap-1 py-2 px-3 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              ← Quay lại Đăng nhập
            </button>
          </div>
        )}

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs mb-5 leading-relaxed">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs mb-5 flex gap-2.5 items-start">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-semibold text-emerald-300">Thông báo bảo mật</p>
              <p className="mt-1 text-slate-300">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Auth Forms */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Địa chỉ Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="nva@genxpks.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">Mật khẩu</label>
                <button 
                  type="button"
                  onClick={() => { setActiveTab('forgot'); setForgotStep(1); setErrorMsg(''); setSuccessMsg(''); }} 
                  className="text-xs text-teal-400 hover:underline focus:outline-none"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 hover:scale-[1.01] active:scale-95 transition-all duration-200 mt-2 text-sm"
            >
              Đăng nhập hệ thống
            </button>
            
            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Mẹo: Bạn có thể chọn bất kỳ tài khoản demo nào trong bảng mô phỏng ở góc dưới phải.</span>
            </div>
          </form>
        )}

        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Email công việc</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="nva@genxpks.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu"
                  value={regConfirmPass}
                  onChange={(e) => setRegConfirmPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 hover:scale-[1.01] active:scale-95 transition-all duration-200 mt-2 text-sm"
            >
              Đăng ký tài khoản mới
            </button>
          </form>
        )}

        {activeTab === 'forgot' && (
          <form onSubmit={forgotStep === 1 ? handleRequestOtp : handleResetPassword} className="space-y-4">
            {forgotStep === 1 ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Nhập địa chỉ Email tài khoản</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="nva@genxpks.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition text-slate-200"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Hệ thống sẽ xác thực địa chỉ email và tạo mã OTP khôi phục mật khẩu.
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all duration-200 mt-2 text-sm"
                >
                  Gửi mã xác thực OTP
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Mã xác thực OTP *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Nhập 6 chữ số OTP..."
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-teal-500 text-slate-200 text-center font-mono tracking-widest"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự..."
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu mới..."
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-teal-500 text-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all duration-200 mt-2 text-sm"
                >
                  Xác nhận đặt lại mật khẩu
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

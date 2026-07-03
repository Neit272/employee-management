import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Mail, Lock, User, CheckCircle, X, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Auth() {
  const { setIsLoggedIn, setCurrentUser, allUsers, setAllUsers, pushLog, showDialog, apiCall } = useApp();
  
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('admin@genxpks.com');
  const [loginPass, setLoginPass] = useState('password123');
  
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
  const [otpToast, setOtpToast] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const email = forgotEmail.toLowerCase().trim();

    try {
      pushLog(`Yêu cầu gửi mã OTP khôi phục mật khẩu cho email: ${email}...`);
      const res = await apiCall('/auth/forgot-password', 'POST', { email });
      setSentOtpVal(res.otp);
      setForgotStep(2);
      setSuccessMsg(`Mã xác thực OTP đã được gửi thành công đến hòm thư: ${email}.`);
      setOtpToast({ otp: res.otp, email });
      setCopied(false);
      pushLog(`Simulate OTP: Đã gửi mã khôi phục mật khẩu [${res.otp}] đến hòm thư ${email}.`, 'success');
    } catch (err) {
      setErrorMsg(err.message || 'Yêu cầu gửi OTP thất bại.');
      pushLog(`Yêu cầu khôi phục mật khẩu thất bại: ${err.message}`, 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (forgotNewPass.length < 6) {
      setErrorMsg('Mật khẩu mới phải chứa tối thiểu 6 ký tự.');
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    try {
      pushLog(`Đang gửi yêu cầu đặt lại mật khẩu với mã OTP cho email: ${forgotEmail}...`);
      await apiCall('/auth/reset-password', 'POST', {
        email: forgotEmail.toLowerCase().trim(),
        otp: forgotOtp,
        newPassword: forgotNewPass
      });

      pushLog(`Khôi phục mật khẩu thành công cho tài khoản: ${forgotEmail}`, 'success');
      setSuccessMsg('Đã đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.');
      setOtpToast(null);
      
      // Clear forgot states and redirect back to login step
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPass('');
      setForgotConfirmPass('');
      setForgotStep(1);
      setActiveTab('login');
      
      confetti({ particleCount: 50, spread: 30 });
    } catch (err) {
      setErrorMsg(err.message || 'Đặt lại mật khẩu thất bại.');
      pushLog(`Khôi phục mật khẩu thất bại: ${err.message}`, 'error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    pushLog(`Thực hiện đăng nhập cho email: ${loginEmail}`);
    
    try {
      const res = await apiCall('/auth/login', 'POST', {
        email: loginEmail,
        password: loginPass
      });
      
      setCurrentUser(res.user);
      setIsLoggedIn(true);
      pushLog(`Đăng nhập thành công: ${res.user.fullName} (${res.user.role})`, 'success');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      setErrorMsg(err.message || 'Email hoặc mật khẩu không chính xác.');
      pushLog(`Đăng nhập thất bại: ${err.message}`, 'error');
    }
  };

  const handleRegister = async (e) => {
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

    try {
      pushLog(`Bắt đầu đăng ký tài khoản cho ${regName} (${regEmail})`);
      await apiCall('/auth/register', 'POST', {
        fullName: regName,
        email: regEmail,
        password: regPass,
        confirmPassword: regConfirmPass
      });

      pushLog(`Đăng ký tài khoản thành công cho ${regName} (${regEmail})`, 'success');
      pushLog(`[Bảo mật] Đã gửi email kích hoạt đến ${regEmail}. Nội dung email chỉ bao gồm liên kết kích hoạt và mã định danh.`, 'success');

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
    } catch (err) {
      setErrorMsg(err.message || 'Đăng ký tài khoản thất bại.');
      pushLog(`Đăng ký thất bại: ${err.message}`, 'error');
    }
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
              onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); setOtpToast(null); }}
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

      {/* Dynamic OTP Demo Toast Notification */}
      {otpToast && (
        <div className="fixed top-6 right-6 z-50 w-full max-w-sm bg-slate-900/90 border border-teal-500/30 rounded-2xl p-5 shadow-[0_8px_32px_rgba(20,184,166,0.25)] backdrop-blur-md animate-slide-in-right text-slate-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20 text-teal-400">
                <ShieldCheck className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-teal-300 tracking-wide">Mã OTP Khôi Phục (Demo)</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Tài khoản: {otpToast.email}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setOtpToast(null)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <span className="text-xs text-slate-500 font-medium">MÃ OTP CỦA BẠN LÀ</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold tracking-[0.25em] text-teal-400 font-mono pl-[0.25em]">
                {otpToast.otp}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(otpToast.otp);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  pushLog(`Đã sao chép mã OTP: ${otpToast.otp} vào clipboard.`, 'success');
                }}
                className={`p-2 rounded-lg transition border flex items-center justify-center ${
                  copied 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-teal-400 hover:border-teal-500/40 hover:bg-slate-800'
                }`}
                title={copied ? "Đã sao chép" : "Sao chép mã OTP"}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center leading-relaxed">
            Hệ thống đã lưu mã OTP này vào database. Sử dụng mã này điền vào ô xác thực phía dưới để hoàn tất đổi mật khẩu.
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Mail, Lock, User, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Auth() {
  const { setIsLoggedIn, setCurrentUser, setAllUsers, pushLog, showDialog, apiCall } = useApp();
  
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('nva@genxpks.com');
  const [loginPass, setLoginPass] = useState('password123');
  
  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
        {activeTab === 'login' ? (
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
                <a 
                  href="#forgot" 
                  onClick={() => showDialog({
                    title: 'Khôi phục mật khẩu',
                    message: 'Vui lòng liên hệ trực tiếp với bộ phận Quản trị hệ thống (Admin) hoặc nhân sự (HR) của GENX PKS để được xác thực thông tin và hỗ trợ cấp lại mật khẩu mới.',
                    type: 'info'
                  })} 
                  className="text-xs text-teal-400 hover:underline"
                >
                  Quên mật khẩu?
                </a>
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
        ) : (
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
      </div>
    </div>
  );
}

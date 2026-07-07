import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  History,
  FileText,
  Users,
  BadgeCent,
  Settings,
  LogOut,
  Wifi,
  MapPin,
  Menu,
  Bell,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';

export default function MainLayout({ children }) {
  const { 
    currentUser, 
    logout, 
    currentPath, 
    navigateTo, 
    officeWifi, 
    gpsWithinRange,
    notifications,
    setNotifications,
    showDialog,
    undoToast,
    setUndoToast,
    theme,
    setTheme
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleReadNotif = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Sidebar navigation menu items
  const menuItems = [
    { name: 'Dashboard Chấm công', path: '/dashboard', icon: LayoutDashboard, roles: ['NhanVien', 'KeToan', 'HR', 'Admin'] },
    { name: 'Lịch sử Chấm công', path: '/history', icon: History, roles: ['NhanVien', 'KeToan', 'HR', 'Admin'] },
    { name: 'Quản lý Đơn từ', path: '/requests', icon: FileText, roles: ['NhanVien', 'KeToan', 'HR', 'Admin'] },
    { name: 'Phân hệ Nhân Sự', path: '/hr', icon: Users, roles: ['HR', 'KeToan', 'Admin'] },
    { name: 'Phân hệ Kế Toán', path: '/accounting', icon: BadgeCent, roles: ['KeToan', 'HR', 'Admin'] },
    { name: 'Quản Trị Hệ Thống', path: '/admin', icon: Settings, roles: ['Admin'] },
  ];

  // Filtering links based on user role (UI Level Truncation)
  const allowedMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'HR': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'KeToan': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default: return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'Admin': return 'Quản trị tối cao';
      case 'HR': return 'Bộ phận Nhân sự';
      case 'KeToan': return 'Bộ phận Kế toán';
      default: return 'Nhân viên';
    }
  };

  return (
    <div className="h-screen w-full flex bg-[#080b11] text-slate-100 overflow-hidden relative">
      
      {/* Sidebar */}
      {isSidebarOpen && (
        <aside className="h-full w-64 bg-slate-900/60 backdrop-blur-md border-r border-slate-800/80 flex flex-col justify-between hidden md:flex shrink-0 animate-in slide-in-from-left duration-300">
          
          <div>
            {/* Logo Brand */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <span className="text-slate-950 font-black text-lg tracking-tighter">N</span>
                </div>
                <div>
                  <span className="font-extrabold text-slate-200 tracking-tight text-base">NEXUS HRM</span>
                  <span className="block text-[9px] text-slate-500 font-semibold tracking-widest uppercase">HRM & Attendance</span>
                </div>
              </div>
              
              {/* Collapse Sidebar for desktop/laptop */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="hidden md:flex items-center justify-center text-slate-500 hover:text-slate-200 text-[10px] w-6 h-6 bg-slate-950 border border-slate-855 rounded-lg hover:border-slate-700 transition"
                title="Ẩn thanh menu"
              >
                ✕
              </button>
            </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {allowedMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/0 text-teal-400 border-l-[3px] border-teal-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* Environment Status Rows (Desktop Sidebar) */}
          <div className="px-4 py-3 mx-4 my-2 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Trạng thái kết nối
            </span>
            
            {/* WiFi Status Row */}
            <div 
              className={`flex items-center gap-2.5 cursor-pointer font-medium p-1.5 rounded-lg transition duration-150 ${
                officeWifi 
                  ? 'text-emerald-400 hover:bg-emerald-500/5' 
                  : 'text-rose-455 hover:bg-rose-500/5'
              }`}
              onClick={() => showDialog({
                title: 'Kết nối mạng văn phòng',
                message: officeWifi 
                  ? 'Địa chỉ IP mạng WiFi của bạn trùng khớp với dải địa chỉ IP văn phòng NEXUS HRM.' 
                  : 'Cảnh báo: Bạn đang truy cập từ địa chỉ IP mạng ngoài phạm vi văn phòng.',
                type: officeWifi ? 'success' : 'warning'
              })}
            >
              <Wifi className={`w-4 h-4 shrink-0 ${officeWifi ? 'text-emerald-400' : 'text-rose-400'}`} />
              <div className="truncate">
                <span className="block font-bold leading-none">{officeWifi ? 'Office IP' : 'External IP'}</span>
                <span className="text-[9px] text-slate-550 mt-1 block leading-none">{officeWifi ? 'Đúng mạng văn phòng' : 'Mạng ngoài văn phòng'}</span>
              </div>
            </div>

            {/* GPS Status Row */}
            <div 
              className={`flex items-center gap-2.5 cursor-pointer font-medium p-1.5 rounded-lg transition duration-150 ${
                gpsWithinRange 
                  ? 'text-emerald-400 hover:bg-emerald-500/5' 
                  : 'text-rose-455 hover:bg-rose-500/5'
              }`}
              onClick={() => showDialog({
                title: 'Định vị GPS Geofence',
                message: gpsWithinRange 
                  ? 'Tọa độ GPS thiết bị nằm trong bán kính 100m xung quanh văn phòng công ty.' 
                  : 'Cảnh báo: Tọa độ GPS thiết bị vượt quá 100m so với tâm định vị công ty.',
                type: gpsWithinRange ? 'success' : 'warning'
              })}
            >
              <MapPin className={`w-4 h-4 shrink-0 ${gpsWithinRange ? 'text-emerald-400' : 'text-rose-400'}`} />
              <div className="truncate">
                <span className="block font-bold leading-none">{gpsWithinRange ? 'Within Range' : 'Out of Geofence'}</span>
                <span className="text-[9px] text-slate-550 mt-1 block leading-none">{gpsWithinRange ? 'Trong khoảng cách 100m' : 'Ngoài phạm vi 100m'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-200 border border-slate-700 uppercase">
              {currentUser.fullName.split(' ').pop().substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-slate-200 truncate leading-snug">{currentUser.fullName}</h4>
              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${getRoleBadgeColor(currentUser.role)}`}>
                {getRoleLabel(currentUser.role)}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 border border-slate-800 hover:border-rose-500/20 rounded-xl text-xs font-bold transition duration-200"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Navbar */}
        <header className="h-20 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 z-20">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-slate-200 focus:outline-none shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Desktop toggle sidebar button (only shows when sidebar is hidden) */}
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="hidden md:flex text-slate-455 hover:text-slate-200 focus:outline-none p-2 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition shrink-0"
                title="Hiện thanh menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-200 capitalize whitespace-nowrap truncate">
              {menuItems.find((item) => item.path === currentPath)?.name || 'Hệ thống'}
            </h2>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 bg-slate-855 border border-slate-800 rounded-xl transition focus:outline-none flex items-center justify-center"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-slate-100 animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Real-time Notifications Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-[-48px] sm:right-0 top-12 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[999] overflow-hidden animate-in fade-in duration-200">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-200">
                      Thông báo ({notifications.filter(n => !n.read).length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-teal-400 font-bold hover:underline"
                      >
                        Đã đọc tất cả
                      </button>
                      <span className="text-slate-700 text-xs">|</span>
                      <button
                        onClick={handleClearNotifications}
                        className="text-[10px] text-slate-500 hover:text-rose-400 transition font-bold"
                      >
                        Xoá hết
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-850">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 italic">Không có thông báo nào.</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleReadNotif(notif.id)}
                          className={`p-3.5 hover:bg-slate-850/50 cursor-pointer transition flex items-start gap-3 ${
                            notif.read ? 'opacity-60' : ''
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            notif.type === 'success' ? 'bg-emerald-400' :
                            notif.type === 'error' ? 'bg-rose-400' : 'bg-teal-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-slate-250 flex justify-between gap-2">
                              <span className="truncate">{notif.title}</span>
                              <span className="text-[9px] text-slate-550 shrink-0 font-normal">{notif.time}</span>
                            </h5>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed break-words">{notif.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle (Light/Dark) */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 bg-slate-855 border border-slate-800 rounded-xl transition focus:outline-none flex items-center justify-center"
              title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-in spin-in-12 duration-300" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 animate-in spin-in-12 duration-300" />}
            </button>
          </div>
        </header>

        {/* Dashboard/Feature Display Area */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </main>
      </div>
      <UndoToast />

      {/* Mobile Drawer Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[1000] md:hidden animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar Drawer panel */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#0d121f] border-r border-slate-850 flex flex-col justify-between z-50 animate-in slide-in-from-left duration-300">
            <div>
              {/* Logo Brand / Close button */}
              <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <span className="text-slate-950 font-black text-lg tracking-tighter">N</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-200 tracking-tight text-base">NEXUS HRM</span>
                    <span className="block text-[9px] text-slate-500 font-semibold tracking-widest uppercase">HRM & Attendance</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm font-bold w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1">
                {allowedMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigateTo(item.path);
                        setIsMobileMenuOpen(false); // Close drawer after selection
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/0 text-teal-400 border-l-[3px] border-teal-500'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                      {item.name}
                    </button>
                  );
                })}
              </nav>

              {/* Environment Status Rows (Mobile Sidebar) */}
              <div className="px-4 py-3 mx-4 my-2 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Trạng thái kết nối
                </span>
                
                {/* WiFi Status Row */}
                <div 
                  className={`flex items-center gap-2.5 cursor-pointer font-medium p-1.5 rounded-lg transition duration-150 ${
                    officeWifi 
                      ? 'text-emerald-400 hover:bg-emerald-500/5' 
                      : 'text-rose-405 hover:bg-rose-500/5'
                  }`}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    showDialog({
                      title: 'Kết nối mạng văn phòng',
                      message: officeWifi 
                        ? 'Địa chỉ IP mạng WiFi của bạn trùng khớp với dải địa chỉ IP văn phòng NEXUS HRM.' 
                        : 'Cảnh báo: Bạn đang truy cập từ địa chỉ IP mạng ngoài phạm vi văn phòng.',
                      type: officeWifi ? 'success' : 'warning'
                    });
                  }}
                >
                  <Wifi className={`w-4 h-4 shrink-0 ${officeWifi ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <div className="truncate">
                    <span className="block font-bold leading-none">{officeWifi ? 'Office IP' : 'External IP'}</span>
                    <span className="text-[9px] text-slate-550 mt-1 block leading-none">{officeWifi ? 'Đúng mạng văn phòng' : 'Mạng ngoài văn phòng'}</span>
                  </div>
                </div>

                {/* GPS Status Row */}
                <div 
                  className={`flex items-center gap-2.5 cursor-pointer font-medium p-1.5 rounded-lg transition duration-150 ${
                    gpsWithinRange 
                      ? 'text-emerald-400 hover:bg-emerald-500/5' 
                      : 'text-rose-405 hover:bg-rose-500/5'
                  }`}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    showDialog({
                      title: 'Định vị GPS Geofence',
                      message: gpsWithinRange 
                        ? 'Tọa độ GPS thiết bị nằm trong bán kính 100m xung quanh văn phòng công ty.' 
                        : 'Cảnh báo: Tọa độ GPS thiết bị vượt quá 100m so với tâm định vị công ty.',
                      type: gpsWithinRange ? 'success' : 'warning'
                    });
                  }}
                >
                  <MapPin className={`w-4 h-4 shrink-0 ${gpsWithinRange ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <div className="truncate">
                    <span className="block font-bold leading-none">{gpsWithinRange ? 'Within Range' : 'Out of Geofence'}</span>
                    <span className="text-[9px] text-slate-550 mt-1 block leading-none">{gpsWithinRange ? 'Trong khoảng cách 100m' : 'Ngoài phạm vi 100m'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Card & Logout */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-200 border border-slate-700 uppercase">
                  {currentUser.fullName.split(' ').pop().substring(0, 2)}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-200 truncate leading-snug">{currentUser.fullName}</h4>
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 border border-slate-800 hover:border-rose-500/20 rounded-xl text-xs font-bold transition duration-200"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// Subcomponent for Undo Toast Notification
function UndoToast() {
  const { undoToast, setUndoToast } = useApp();
  const [progress, setProgress] = React.useState(100);
  const [seconds, setSeconds] = React.useState(5);

  React.useEffect(() => {
    if (!undoToast) return;

    setProgress(100);
    setSeconds(5);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      const pct = Math.max(0, 100 - (elapsed / 5000) * 100);
      setProgress(pct);
      setSeconds(Math.ceil((5000 - elapsed) / 1000));

      if (elapsed >= 5000) {
        clearInterval(interval);
        if (undoToast.onConfirm) {
          undoToast.onConfirm();
        }
        setUndoToast(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [undoToast]);

  if (!undoToast) return null;

  const handleUndoClick = () => {
    if (undoToast.onUndo) {
      undoToast.onUndo();
    }
    setUndoToast(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99999] max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 overflow-hidden animate-in slide-in-from-bottom duration-300">
      <div 
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="text-xs text-slate-300 truncate font-medium">{undoToast.message}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Tự động thực hiện sau {seconds} giây...</p>
          </div>
        </div>
        <button
          onClick={handleUndoClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 hover:text-teal-400 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-700 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Hoàn tác
        </button>
      </div>
    </div>
  );
}

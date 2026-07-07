import React, { createContext, useState, useEffect, useContext } from 'react';

const AppContext = createContext();

// Initialize HTML5 Broadcast Channel for cross-tab multiplayer sync
const syncChannel = new BroadcastChannel('nexus_hrm_sync');

const initialDepartments = ['Hành chính', 'Nhân sự', 'Kế toán', 'Kỹ thuật', 'Kinh doanh'];
const initialPositions = ['Trưởng phòng', 'Nhân viên chính thức', 'Nhân viên thử việc', 'Kế toán viên', 'Chuyên viên HR'];

const initialHistory = [];
const initialRequests = [];
const initialDocuments = [];

const presetUsers = {
  Admin: {
    fullName: 'Phạm Văn D (System Admin)',
    email: 'admin@nexushrm.com',
    role: 'Admin',
    employeeId: 'NV000',
    cccd: '012345678911',
    phone: '0999999999',
    address: 'Trụ sở chính NEXUS HRM',
    startDate: '2024-01-01',
    department: 'Hành chính',
    position: 'Trưởng phòng',
    gender: 'Nam',
    dob: '1990-01-01',
    isProfileComplete: true,
    contractExpiry: 'Vô thời hạn'
  }
};

export const AppProvider = ({ children }) => {
  // Current user state (Initialize from localStorage to persist login state)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('nexus_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('nexus_user');
  });

  // Persist login state changes to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nexus_user', JSON.stringify(currentUser));
      setIsLoggedIn(true);
    } else {
      localStorage.removeItem('nexus_user');
      setIsLoggedIn(false);
    }
  }, [currentUser]);

  // Dynamic entity states
  const [departments, setDepartments] = useState(initialDepartments);
  const [positions, setPositions] = useState(initialPositions);
  const [attendanceHistory, rawSetAttendanceHistory] = useState(initialHistory);
  const [requests, rawSetRequests] = useState(initialRequests);
  const [documents, setDocuments] = useState(initialDocuments);
  
  // Custom user collection (for HR management & Admin list)
  const [allUsers, rawSetAllUsers] = useState([
    { ...presetUsers.Admin }
  ]);

  // Simulation states
  const [officeWifi, setOfficeWifi] = useState(true);
  const [gpsWithinRange, setGpsWithinRange] = useState(true);
  const [systemTimeOffset, setSystemTimeOffset] = useState(0); // Offset in minutes
  const [firebaseLogs, setFirebaseLogs] = useState([]);

  // System parameters configuration
  const [allowedWifiIp, setAllowedWifiIp] = useState('192.168.1.100');
  const [allowedDistance, setAllowedDistance] = useState(100);
  const [gracePeriod, setGracePeriod] = useState(10);

  // Theme configuration (light/dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Real time punch state for active user
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentShift, setCurrentShift] = useState('');
  const [checkInTime, setCheckInTime] = useState(null);
  
  // Navigation / Page Routing Control
  const [currentPath, setCurrentPath] = useState('/dashboard');

  // Global Custom Dialog State
  const [modalDialog, setModalDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null
  });

  // Global Undo Toast State
  const [undoToast, setUndoToast] = useState(null);

  const triggerUndo = (message, onConfirm, onUndo) => {
    setUndoToast(prev => {
      if (prev && prev.onConfirm) {
        prev.onConfirm();
      }
      return { message, onConfirm, onUndo, id: Date.now() };
    });
  };

  const showDialog = (config) => {
    setModalDialog({
      isOpen: true,
      title: config.title || 'Thông báo',
      message: config.message || '',
      type: config.type || 'info',
      onConfirm: config.onConfirm || null,
      onCancel: config.onCancel || null
    });
  };

  const closeDialog = () => {
    setModalDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Real-time Notifications state
  const [notifications, rawSetNotifications] = useState([
    { id: 1, title: 'Thông báo hệ thống', description: 'Chào mừng bạn đến với hệ thống HRM NEXUS HRM.', time: '09:00', read: false, type: 'info' },
    { id: 2, title: 'Chấm công tự động', description: 'Đã hoàn thành đề xuất ca làm việc tự động sáng nay.', time: '07:45', read: true, type: 'success' },
  ]);

  // Sync state event listener
  useEffect(() => {
    const handleSync = (event) => {
      const { type, payload } = event.data;
      if (type === 'SYNC_ATTENDANCE') rawSetAttendanceHistory(payload);
      if (type === 'SYNC_REQUESTS') rawSetRequests(payload);
      if (type === 'SYNC_NOTIFICATIONS') rawSetNotifications(payload);
      if (type === 'SYNC_USERS') rawSetAllUsers(payload);
    };
    syncChannel.addEventListener('message', handleSync);
    return () => {
      syncChannel.removeEventListener('message', handleSync);
    };
  }, []);

  // State synchronization wrappers that broadcast to other tabs
  const updateAttendanceHistory = (val) => {
    rawSetAttendanceHistory(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_ATTENDANCE', payload: next });
      return next;
    });
  };

  const updateRequests = (val) => {
    rawSetRequests(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_REQUESTS', payload: next });
      return next;
    });
  };

  const updateAllUsers = (val) => {
    rawSetAllUsers(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_USERS', payload: next });
      return next;
    });
  };

  const updateNotifications = (val) => {
    rawSetNotifications(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncChannel.postMessage({ type: 'SYNC_NOTIFICATIONS', payload: next });
      return next;
    });
  };

  const getApiUrl = (endpoint) => {
    const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api'
      : 'https://employee-management-prj.vercel.app/api';
    return `${base}${endpoint}`;
  };

  // Push custom log simulating Firebase logger
  const pushLog = (message, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const logTypeSymbol = type === 'error' ? '❌' : type === 'success' ? '🟢' : 'ℹ️';
    setFirebaseLogs((prev) => [
      { id: Date.now() + Math.random(), text: `[${timeStr}] ${logTypeSymbol} ${message}` },
      ...prev
    ]);
    
    // Sync to backend if server is active
    fetch(getApiUrl('/admin/logs'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': currentUser ? `Bearer ${currentUser.employeeId}` : ''
      },
      body: JSON.stringify({ text: `[${timeStr}] ${logTypeSymbol} ${message}` })
    }).catch(() => {});
  };

  // Helper for all backend requests
  const apiCall = async (endpoint, method = 'GET', body = null, isMultipart = false) => {
    const headers = {
      'Authorization': currentUser ? `Bearer ${currentUser.employeeId}` : ''
    };
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      method,
      headers
    };

    if (body) {
      config.body = isMultipart ? body : JSON.stringify(body);
    }

    const res = await fetch(getApiUrl(endpoint), config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Lỗi HTTP ${res.status}`);
    }
    return res.json();
  };

  // Sync data from backend
  const syncFromBackend = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      // 1. Get current history for the last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      // Build parallel promise array for a 4x performance speed up
      const promises = [
        apiCall(`/attendance/history?fromDate=${fromDate}&toDate=${toDate}`),
        apiCall('/requests'),
        apiCall('/admin/logs').catch(() => ({}))
      ];

      let docPromiseIdx = -1;
      let usersPromiseIdx = -1;
      let entitiesPromiseIdx = -1;

      if (currentUser.role === 'KeToan' || currentUser.role === 'Admin') {
        docPromiseIdx = promises.length;
        promises.push(apiCall('/documents'));
      }

      if (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'KeToan') {
        usersPromiseIdx = promises.length;
        promises.push(apiCall('/admin/users'));
        entitiesPromiseIdx = promises.length;
        promises.push(apiCall('/admin/entities'));
      }

      // Execute all promises in parallel
      const results = await Promise.all(promises);

      // 1. Process History
      const historyData = results[0];
      if (historyData && historyData.history) {
        updateAttendanceHistory(historyData.history);
        
        // Sync check-in state
        const todayStr = today.toISOString().split('T')[0];
        const todayRecord = historyData.history.find(h => h.date === todayStr);
        if (todayRecord) {
          setIsCheckedIn(todayRecord.clockOut === '-');
          setCurrentShift(todayRecord.shift);
          if (todayRecord.clockIn !== '-') {
            const [h, m, s] = todayRecord.clockIn.split(':').map(Number);
            const inDate = new Date();
            inDate.setHours(h, m, s);
            setCheckInTime(inDate);
          } else {
            setCheckInTime(null);
          }
        } else {
          setIsCheckedIn(false);
          setCheckInTime(null);
        }
      }

      // 2. Process Requests
      const reqData = results[1];
      if (reqData && reqData.requests) {
        updateRequests(reqData.requests);
      }

      // 3. Process logs
      const logData = results[2];
      if (logData && logData.logs) {
        setFirebaseLogs(logData.logs);
      }

      // 4. Process Documents (optional)
      if (docPromiseIdx !== -1) {
        const docData = results[docPromiseIdx];
        if (docData && docData.documents) {
          setDocuments(docData.documents);
        }
      }

      // 5. Process Users & Entities (optional)
      if (usersPromiseIdx !== -1 && entitiesPromiseIdx !== -1) {
        const usersData = results[usersPromiseIdx];
        if (usersData && usersData.users) {
          updateAllUsers(usersData.users);
        }

        const entitiesData = results[entitiesPromiseIdx];
        if (entitiesData) {
          if (entitiesData.departments) {
            setDepartments(entitiesData.departments);
          }
          if (entitiesData.positions) {
            setPositions(entitiesData.positions);
          }
        }
      }

    } catch (error) {
      console.warn('⚠️ Lỗi đồng bộ Backend, đang chạy chế độ Mock Offline:', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync whenever active user changes
  useEffect(() => {
    if (currentUser) {
      syncFromBackend();
    }
  }, [currentUser]);

  // Trigger a real-time notification
  const addNotification = (title, description, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newNotif = {
      id: Date.now(),
      title,
      description,
      time: timeStr,
      read: false,
      type
    };
    updateNotifications(prev => [newNotif, ...prev]);
    pushLog(`[Thông báo Real-time] ${title}: ${description}`, 'info');
  };

  // Simulate background activities from other users for real-time vibe
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const otherUsers = allUsers.filter(u => u.employeeId !== currentUser.employeeId);
      if (otherUsers.length === 0) return;
      const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];

      const events = [
        { title: 'Chấm công nhân viên', desc: `Nhân viên ${randomUser.fullName} vừa Check-in thành công ca làm việc.`, type: 'success' },
        { title: 'Yêu cầu đơn từ mới', desc: `Nhân viên ${randomUser.fullName} vừa gửi đơn yêu cầu chờ duyệt.`, type: 'info' },
        { title: 'Hệ thống vận hành', desc: 'Đồng bộ dữ liệu chấm công sang Firestore thành công.', type: 'success' }
      ];
      const selectedEvent = events[Math.floor(Math.random() * events.length)];
      addNotification(selectedEvent.title, selectedEvent.desc, selectedEvent.type);
    }, 45000); // Every 45s

    return () => clearInterval(interval);
  }, [allUsers, currentUser]);

  // Change current simulated user & synchronize profile complete overlay
  const changeUserRole = (roleKey) => {
    const user = presetUsers[roleKey] || presetUsers.NhanVien;
    setCurrentUser(user);
    setIsCheckedIn(false);
    pushLog(`Chuyển sang tài khoản: ${user.fullName} (${user.role})`, 'success');
  };

  // Logout current user and clear states (Reverted & optimized with deferred state cleanup)
  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('nexus_user');
    setIsCheckedIn(false);
    setCheckInTime(null);
    setCurrentPath('/dashboard');
    pushLog('Đã đăng xuất tài khoản thành công.', 'info');
    setTimeout(() => {
      setCurrentUser(null);
    }, 200);
  };

  // Synchronize path and verify route guards
  const navigateTo = (path) => {
    pushLog(`Điều hướng tới: ${path}`);
    
    // Router Guard check
    const allowed = checkRoutePermission(currentUser.role, path);
    if (!allowed) {
      pushLog(`Chặn truy cập: Route ${path} sai thẩm quyền cho vai trò ${currentUser.role}. Chuyển hướng về /dashboard`, 'error');
      setCurrentPath('/dashboard');
    } else {
      setCurrentPath(path);
    }
  };

  // Core authorization checker
  const checkRoutePermission = (role, path) => {
    if (path === '/dashboard' || path === '/profile' || path === '/history' || path === '/requests') {
      return true; // All roles can access standard pages
    }
    if (path === '/hr' && (role === 'HR' || role === 'KeToan' || role === 'Admin')) {
      return true;
    }
    if (path === '/accounting' && (role === 'KeToan' || role === 'HR' || role === 'Admin')) {
      return true;
    }
    if (path === '/admin' && role === 'Admin') {
      return true;
    }
    return false;
  };

  // Effect to sync user complete state inside allUsers list
  useEffect(() => {
    if (currentUser) {
      updateAllUsers((prev) =>
        prev.map((u) => (u.employeeId === currentUser.employeeId ? currentUser : u))
      );
    }
  }, [currentUser]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoggedIn,
        setIsLoggedIn,
        departments,
        setDepartments,
        positions,
        setPositions,
        attendanceHistory,
        setAttendanceHistory: updateAttendanceHistory,
        requests,
        setRequests: updateRequests,
        documents,
        setDocuments,
        allUsers,
        setAllUsers: updateAllUsers,
        officeWifi,
        setOfficeWifi,
        gpsWithinRange,
        setGpsWithinRange,
        systemTimeOffset,
        setSystemTimeOffset,
        firebaseLogs,
        setFirebaseLogs,
        pushLog,
        isCheckedIn,
        setIsCheckedIn,
        isSyncing,
        currentShift,
        setCurrentShift,
        checkInTime,
        setCheckInTime,
        currentPath,
        navigateTo,
        changeUserRole,
        logout,
        checkRoutePermission,
        notifications,
        setNotifications: updateNotifications,
        addNotification,
        modalDialog,
        showDialog,
        closeDialog,
        apiCall,
        syncFromBackend,
        undoToast,
        setUndoToast,
        triggerUndo,
        allowedWifiIp,
        setAllowedWifiIp,
        allowedDistance,
        setAllowedDistance,
        gracePeriod,
        setGracePeriod,
        theme,
        setTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);


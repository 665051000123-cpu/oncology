import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, UserPlus, Edit2, Trash2, Shield, User, Lock, Save, X, Eye, EyeOff, Search, FileText, LogIn, PenLine, LayoutDashboard, TrendingUp, Users, Activity, Filter } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api';

const getDonutSlices = (data, cx, cy, r, innerR) => {
    let currentAngle = -90; // Start at the top (12 o'clock)
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    
    return data.map((item) => {
        const angle = (item.value / total) * 360;
        
        // Calculate start and end coordinates for outer arc
        const startRad = (currentAngle * Math.PI) / 180;
        const endRad = ((currentAngle + angle) * Math.PI) / 180;
        
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        
        // Calculate start and end coordinates for inner arc
        const ix1 = cx + innerR * Math.cos(startRad);
        const iy1 = cy + innerR * Math.sin(startRad);
        const ix2 = cx + innerR * Math.cos(endRad);
        const iy2 = cy + innerR * Math.sin(endRad);
        
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        // Path command for donut slice (outer arc -> line to inner -> inner arc back -> close)
        const d = [
            'M', x1, y1,
            'A', r, r, 0, largeArcFlag, 1, x2, y2,
            'L', ix2, iy2,
            'A', innerR, innerR, 0, largeArcFlag, 0, ix1, iy1,
            'Z'
        ].join(' ');
        
        const slice = {
            ...item,
            d,
            startAngle: currentAngle,
            endAngle: currentAngle + angle,
            percent: Math.round((item.value / total) * 100)
        };
        
        currentAngle += angle;
        return slice;
    });
};

const AdminUsers = ({ currentUser, setCurrentUser, onBack, showNotification, theme }) => {
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'users' | 'logs' | 'activities'
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [logsLoading, setLogsLoading] = useState(false);
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activitySearchQuery, setActivitySearchQuery] = useState('');
    const [logSearchQuery, setLogSearchQuery] = useState('');
    const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
    const [statusChangeConfirm, setStatusChangeConfirm] = useState(null);

    // Filter states for Login History (logs)
    const [showLogFilterPanel, setShowLogFilterPanel] = useState(false);
    const [logStartDateFilter, setLogStartDateFilter] = useState('');
    const [logEndDateFilter, setLogEndDateFilter] = useState('');
    const [logRoleFilter, setLogRoleFilter] = useState('all');
    const [logActionFilter, setLogActionFilter] = useState('all');

    // Filter states for Modification Logs (activities)
    const [showActivityFilterPanel, setShowActivityFilterPanel] = useState(false);
    const [activityStartDateFilter, setActivityStartDateFilter] = useState('');
    const [activityEndDateFilter, setActivityEndDateFilter] = useState('');
    const [activityActionFilter, setActivityActionFilter] = useState('all');

    // Filter states for Dashboard statistics
    const [statsStartDate, setStatsStartDate] = useState('');
    const [statsEndDate, setStatsEndDate] = useState('');

    const isDark = theme === 'dark';

    // Helper functions for filtering
    const parseFilterDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length < 3) return null;
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1; // 0-indexed
        let year = parseInt(parts[2], 10);
        if (year > 2400) {
            year -= 543;
        }
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
    };

    const handleDateInputChange = (val, currentVal, setter) => {
        let cleaned = val.replace(/[^0-9/]/g, '');
        if (val.length > currentVal.length) {
            if (cleaned.length === 2 && !cleaned.includes('/')) {
                cleaned = cleaned + '/';
            } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
                cleaned = cleaned + '/';
            }
        }
        if (cleaned.length <= 10) {
            setter(cleaned);
        }
    };

    const parseThaiTimestamp = (timestampStr) => {
        if (!timestampStr) return null;
        const parts = timestampStr.split(' ');
        if (parts.length === 0) return null;
        const dateParts = parts[0].split('/');
        if (dateParts.length < 3) return null;

        let day = parseInt(dateParts[0], 10);
        let month = parseInt(dateParts[1], 10) - 1; // 0-indexed
        let year = parseInt(dateParts[2], 10);

        if (year > 2400) {
            year -= 543;
        }

        return new Date(year, month, day);
    };

    // Form states for creating user
    const [createForm, setCreateForm] = useState({
        username: '',
        employee_id: '',
        password: '',
        role: 'pharmacist'
    });

    // Form states for editing user
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        username: '',
        employee_id: '',
        password: '',
        role: 'pharmacist'
    });

    // Password visibility states
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchStats();
        } else if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'logs') {
            fetchLogs();
        } else if (activeTab === 'activities') {
            fetchActivities();
        }
    }, [activeTab]);

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const params = {};
            if (statsStartDate.trim() && statsEndDate.trim()) {
                params.startDate = statsStartDate.trim();
                params.endDate = statsEndDate.trim();
            }
            const res = await axios.get(`${API_BASE}/admin/stats`, {
                headers: { 'x-employee-id': currentUser.employee_id },
                params
            });
            if (res.data.success) {
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error("Fetch stats failed:", err);
            showNotification(`ไม่สามารถดึงข้อมูลสถิติได้: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setStatsLoading(false);
        }
    };

    const handleApplyStatsFilter = () => {
        if (!statsStartDate.trim() || !statsEndDate.trim()) {
            showNotification("กรุณากรอกวันที่ให้ครบถ้วนทั้งวันเริ่มต้นและสิ้นสุด", "error");
            return;
        }
        const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!datePattern.test(statsStartDate) || !datePattern.test(statsEndDate)) {
            showNotification("รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้รูปแบบ วว/ดด/ปปปป (เช่น 24/06/2569)", "error");
            return;
        }
        fetchStats();
    };

    const handleClearStatsFilter = async () => {
        setStatsStartDate('');
        setStatsEndDate('');
        setStatsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/admin/stats`, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error("Fetch stats failed:", err);
            showNotification(`ไม่สามารถดึงข้อมูลสถิติได้: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/admin/users`, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                setUsers(res.data.users);
            }
        } catch (err) {
            console.error("Fetch users failed:", err);
            showNotification(`ไม่สามารถดึงข้อมูลผู้ใช้ได้: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/admin/logins`, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                setLogs(res.data.logins);
            }
        } catch (err) {
            console.error("Fetch login history failed:", err);
            showNotification(`ไม่สามารถดึงข้อมูลประวัติการเข้าใช้งานได้: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setLogsLoading(false);
        }
    };

    const fetchActivities = async () => {
        setActivitiesLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/admin/activities`, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                setActivities(res.data.activities);
            }
        } catch (err) {
            console.error("Fetch activities failed:", err);
            showNotification(`ไม่สามารถดึงข้อมูลบันทึกกิจกรรมได้: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setActivitiesLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        const { username, employee_id, password, role } = createForm;
        if (!username || !employee_id || !password) {
            showNotification("กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน", "error");
            return;
        }
        if (password.length < 6) {
            showNotification("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร", "error");
            return;
        }

        try {
            const res = await axios.post(`${API_BASE}/admin/users`, createForm, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                showNotification("สร้างบัญชีผู้ใช้สำเร็จ", "success");
                setCreateForm({
                    username: '',
                    employee_id: '',
                    password: '',
                    role: 'pharmacist'
                });
                setShowCreatePassword(false);
                fetchUsers();
            }
        } catch (err) {
            console.error("Create user failed:", err);
            showNotification(`ไม่สามารถสร้างผู้ใช้ได้: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditForm({
            username: user.username,
            employee_id: user.employee_id,
            password: '', // Leave blank to keep current password
            role: user.role || 'pharmacist',
            is_active: user.is_active !== undefined ? user.is_active : 1
        });
        setShowEditPassword(false);
    };

    const handleToggleStatus = (user) => {
        if (user.employee_id === currentUser.employee_id) {
            showNotification("ไม่สามารถระงับการใช้งานบัญชีผู้ใช้งานของตนเองได้", "error");
            return;
        }
        const newStatus = user.is_active === 0 ? 1 : 0;
        const statusText = newStatus === 1 ? 'เปิดใช้งาน' : 'ระงับการใช้งาน';
        
        setStatusChangeConfirm({
            user,
            newStatus,
            statusText
        });
    };

    const handleConfirmStatusChange = async () => {
        if (!statusChangeConfirm) return;
        const { user, newStatus, statusText } = statusChangeConfirm;
        try {
            const res = await axios.patch(`${API_BASE}/admin/users/${user.id}/status`, 
                { is_active: newStatus },
                { headers: { 'x-employee-id': currentUser.employee_id } }
            );
            if (res.data.success) {
                showNotification(res.data.message || `เปลี่ยนสถานะเป็น ${statusText} สำเร็จ`, "success");
                fetchUsers();
            }
        } catch (err) {
            console.error("Toggle user status failed:", err);
            showNotification(`ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setStatusChangeConfirm(null);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const { username, employee_id, role, is_active } = editForm;
        if (!username || !employee_id) {
            showNotification("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
            return;
        }
        if (editForm.password && editForm.password.length < 6) {
            showNotification("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร", "error");
            return;
        }

        try {
            const res = await axios.put(`${API_BASE}/admin/users/${editingUser.id}`, editForm, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                showNotification("แก้ไขข้อมูลผู้ใช้สำเร็จ", "success");
                if (editingUser.employee_id === currentUser.employee_id) {
                    const updatedUser = {
                        ...currentUser,
                        username: editForm.username,
                        employee_id: editForm.employee_id,
                        role: editForm.role
                    };
                    localStorage.setItem('oncology_user', JSON.stringify(updatedUser));
                    if (setCurrentUser) {
                        setCurrentUser(updatedUser);
                    }
                }
                setEditingUser(null);
                fetchUsers();
            }
        } catch (err) {
            console.error("Edit user failed:", err);
            showNotification(`ไม่สามารถแก้ไขผู้ใช้ได้: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    const handleDeleteClick = (user) => {
        if (user.employee_id === currentUser.employee_id) {
            showNotification("ไม่สามารถลบบัญชีของตัวเองได้", "error");
            return;
        }
        setDeleteConfirmUser(user);
    };

    const handleDeleteConfirm = async (userId, employeeId) => {
        try {
            const res = await axios.delete(`${API_BASE}/admin/users/${userId}`, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                showNotification("ลบผู้ใช้งานสำเร็จ", "success");
                fetchUsers();
            }
        } catch (err) {
            console.error("Delete user failed:", err);
            showNotification(`ไม่สามารถลบผู้ใช้ได้: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    const filteredLogs = useMemo(() => {
        let result = logs;
        if (logSearchQuery.trim()) {
            const q = logSearchQuery.toLowerCase();
            result = result.filter(log =>
                (log.employee_id && log.employee_id.toLowerCase().includes(q)) ||
                (log.username && log.username.toLowerCase().includes(q)) ||
                (log.role && log.role.toLowerCase().includes(q))
            );
        }
        if (logStartDateFilter) {
            const start = parseFilterDate(logStartDateFilter);
            if (start) {
                start.setHours(0, 0, 0, 0);
                result = result.filter(log => {
                    const logDate = parseThaiTimestamp(log.timestamp);
                    if (!logDate) return false;
                    logDate.setHours(0, 0, 0, 0);
                    return logDate >= start;
                });
            }
        }
        if (logEndDateFilter) {
            const end = parseFilterDate(logEndDateFilter);
            if (end) {
                end.setHours(23, 59, 59, 999);
                result = result.filter(log => {
                    const logDate = parseThaiTimestamp(log.timestamp);
                    if (!logDate) return false;
                    logDate.setHours(23, 59, 59, 999);
                    return logDate <= end;
                });
            }
        }
        if (logRoleFilter !== 'all') {
            result = result.filter(log => log.role && log.role.toLowerCase() === logRoleFilter.toLowerCase());
        }
        if (logActionFilter !== 'all') {
            result = result.filter(log => log.action_type && log.action_type.toUpperCase() === logActionFilter.toUpperCase());
        }
        return result;
    }, [logs, logSearchQuery, logStartDateFilter, logEndDateFilter, logRoleFilter, logActionFilter]);

    // Filter activities based on search query
    const filteredActivities = useMemo(() => {
        let result = activities;
        if (activitySearchQuery.trim()) {
            const q = activitySearchQuery.toLowerCase();
            result = result.filter(act =>
                (act.employee_id && act.employee_id.toLowerCase().includes(q)) ||
                (act.username && act.username.toLowerCase().includes(q)) ||
                (act.action_type && act.action_type.toLowerCase().includes(q)) ||
                (act.details && act.details.toLowerCase().includes(q))
            );
        }
        if (activityStartDateFilter) {
            const start = parseFilterDate(activityStartDateFilter);
            if (start) {
                start.setHours(0, 0, 0, 0);
                result = result.filter(act => {
                    const actDate = parseThaiTimestamp(act.timestamp);
                    if (!actDate) return false;
                    actDate.setHours(0, 0, 0, 0);
                    return actDate >= start;
                });
            }
        }
        if (activityEndDateFilter) {
            const end = parseFilterDate(activityEndDateFilter);
            if (end) {
                end.setHours(23, 59, 59, 999);
                result = result.filter(act => {
                    const actDate = parseThaiTimestamp(act.timestamp);
                    if (!actDate) return false;
                    actDate.setHours(23, 59, 59, 999);
                    return actDate <= end;
                });
            }
        }
        if (activityActionFilter !== 'all') {
            result = result.filter(act => act.action_type && act.action_type.toUpperCase() === activityActionFilter.toUpperCase());
        }
        return result;
    }, [activities, activitySearchQuery, activityStartDateFilter, activityEndDateFilter, activityActionFilter]);
    return (
        <div className="animate-row-in space-y-6">
            {/* Header section */}
            <div className="w-full premium-card p-5 flex justify-between items-center no-print">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className={`p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-md ${isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-sky-600 border-slate-200 shadow-sm'
                            }`}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black">การจัดการระบบหลังบ้าน (Admin Control Panel)</h2>
                        <p className="text-xs opacity-70">สำหรับผู้ดูแลระบบ (Admin Only) เพื่อจัดการบัญชีผู้ใช้และตรวจสอบประวัติการใช้งานระบบ</p>
                    </div>
                </div>
            </div>

            {/* Tab Switched Header */}
            <div className="flex gap-3 mb-6 no-print">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`py-3 px-6 rounded-2xl font-black text-sm flex items-center gap-2.5 transition-all active:scale-95 border cursor-pointer ${activeTab === 'dashboard'
                            ? (isDark
                                ? 'bg-sky-600 border-sky-400 text-white shadow-lg'
                                : 'bg-sky-600 border-sky-500 text-white shadow-md')
                            : (isDark
                                ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm')
                        }`}
                >
                    <LayoutDashboard size={16} /> แผงควบคุมสถิติ (Dashboard)
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`py-3 px-6 rounded-2xl font-black text-sm flex items-center gap-2.5 transition-all active:scale-95 border cursor-pointer ${activeTab === 'users'
                            ? (isDark
                                ? 'bg-sky-600 border-sky-400 text-white shadow-lg'
                                : 'bg-sky-600 border-sky-500 text-white shadow-md')
                            : (isDark
                                ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm')
                        }`}
                >
                    <User size={16} /> จัดการผู้ใช้งาน (Users)
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`py-3 px-6 rounded-2xl font-black text-sm flex items-center gap-2.5 transition-all active:scale-95 border cursor-pointer ${activeTab === 'logs'
                            ? (isDark
                                ? 'bg-sky-600 border-sky-400 text-white shadow-lg'
                                : 'bg-sky-600 border-sky-500 text-white shadow-md')
                            : (isDark
                                ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm')
                        }`}
                >
                    <LogIn size={16} /> ประวัติการเข้าใช้งาน (Login History)
                </button>
                <button
                    onClick={() => setActiveTab('activities')}
                    className={`py-3 px-6 rounded-2xl font-black text-sm flex items-center gap-2.5 transition-all active:scale-95 border cursor-pointer ${activeTab === 'activities'
                            ? (isDark
                                ? 'bg-sky-600 border-sky-400 text-white shadow-lg'
                                : 'bg-sky-600 border-sky-500 text-white shadow-md')
                            : (isDark
                                ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm')
                        }`}
                >
                    <PenLine size={16} /> ประวัติการแก้ไขข้อมูล (Modification Logs)
                </button>
            </div>

            {activeTab === 'dashboard' ? (
                <div className="space-y-6">
                    {/* Date Filter Panel */}
                    <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-end justify-between gap-4 ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
                    }`}>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase ml-1">วันที่เริ่มต้น (Start Date)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="วว/ดด/ปปปป (เช่น 24/06/2569)"
                                        value={statsStartDate}
                                        onChange={e => handleDateInputChange(e.target.value, statsStartDate, setStatsStartDate)}
                                        className="form-control py-2.5 pl-10 pr-4 text-sm rounded-xl font-bold"
                                    />
                                    <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase ml-1">วันที่สิ้นสุด (End Date)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="วว/ดด/ปปปป (เช่น 29/06/2569)"
                                        value={statsEndDate}
                                        onChange={e => handleDateInputChange(e.target.value, statsEndDate, setStatsEndDate)}
                                        className="form-control py-2.5 pl-10 pr-4 text-sm rounded-xl font-bold"
                                    />
                                    <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2.5 md:self-end">
                            <button
                                onClick={handleApplyStatsFilter}
                                className="py-2.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm transition-all active:scale-95 cursor-pointer shadow-md"
                            >
                                กรองข้อมูล
                            </button>
                            <button
                                onClick={handleClearStatsFilter}
                                className={`py-2.5 px-6 rounded-xl border font-black text-sm transition-all active:scale-95 cursor-pointer ${
                                    isDark 
                                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
                                }`}
                            >
                                ล้างค่า
                            </button>
                        </div>
                    </div>

                    {/* Stats Metric Cards */}
                    {statsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="premium-card p-6 animate-pulse flex flex-col justify-between h-[120px]">
                                    <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-2/3"></div>
                                    <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-1/2 mt-4 font-black"></div>
                                </div>
                            ))}
                        </div>
                    ) : stats ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Card 1: Total Calculations */}
                            <div className={`premium-card p-5 border-l-4 border-l-indigo-500 bg-gradient-to-br ${
                                isDark ? 'from-indigo-500/10 to-purple-500/5 border-indigo-500/20' : 'from-indigo-50 to-white border-indigo-200'
                            } flex justify-between items-center transition-all hover:translate-y-[-2px]`}>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase opacity-70 tracking-wider">จำนวนการใช้ยา</p>
                                    <h3 className="text-3xl font-black tracking-tight">{stats.totalCalculations.toLocaleString()}</h3>
                                </div>
                                <div className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <Activity size={24} />
                                </div>
                            </div>

                            {/* Card 2: Registered Pharmacists */}
                            <div className={`premium-card p-5 border-l-4 border-l-sky-500 bg-gradient-to-br ${
                                isDark ? 'from-sky-500/10 to-teal-500/5 border-sky-500/20' : 'from-sky-50 to-white border-sky-200'
                            } flex justify-between items-center transition-all hover:translate-y-[-2px]`}>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase opacity-70 tracking-wider">ผู้ใช้งานในระบบ</p>
                                    <h3 className="text-3xl font-black tracking-tight">{stats.totalUsers.toLocaleString()}</h3>
                                </div>
                                <div className={`p-3 rounded-2xl ${isDark ? 'bg-sky-950/40 text-sky-400' : 'bg-sky-100 text-sky-600'}`}>
                                    <Users size={24} />
                                </div>
                            </div>

                            {/* Card 3: Unique Patients */}
                            <div className={`premium-card p-5 border-l-4 border-l-teal-500 bg-gradient-to-br ${
                                isDark ? 'from-teal-500/10 to-emerald-500/5 border-teal-500/20' : 'from-teal-50 to-white border-teal-200'
                            } flex justify-between items-center transition-all hover:translate-y-[-2px]`}>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase opacity-70 tracking-wider">จำนวนผู้ป่วย (H.N. สะสม)</p>
                                    <h3 className="text-3xl font-black tracking-tight">{stats.totalPatients.toLocaleString()}</h3>
                                </div>
                                <div className={`p-3 rounded-2xl ${isDark ? 'bg-teal-950/40 text-teal-400' : 'bg-teal-100 text-teal-600'}`}>
                                    <User size={24} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="premium-card p-6 text-center text-slate-500 font-bold italic">
                            ไม่สามารถโหลดข้อมูลสถิติได้
                        </div>
                    )}

                    {/* Charts & Rankings */}
                    {!statsLoading && stats && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                {/* Drug Distribution - Bar Chart */}
                                <div className="lg:col-span-3 premium-card p-6 flex flex-col justify-between">
                                    <h3 className="font-black mb-5 uppercase tracking-wider text-sm flex items-center gap-2 opacity-90">
                                        <Activity size={18} className="text-indigo-500 dark:text-indigo-400" />
                                        จำนวนการใช้ยาแยกตามสูตร/ตัวยา
                                    </h3>
                                    
                                    <div className="h-[250px] w-full flex items-end justify-between px-2 pt-6 relative border-b border-slate-700/20">
                                        {/* SVG Grid Lines */}
                                        <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none opacity-[0.07] dark:opacity-[0.05]">
                                            <div className="border-t border-dashed border-current h-0 w-full" />
                                            <div className="border-t border-dashed border-current h-0 w-full" />
                                            <div className="border-t border-dashed border-current h-0 w-full" />
                                            <div className="border-t border-dashed border-current h-0 w-full" />
                                        </div>
                                        
                                        {(() => {
                                            const drugCounts = stats.drugCounts || {};
                                            const items = Object.entries(drugCounts);
                                            const maxVal = Math.max(...items.map(([_, v]) => v)) || 1;
                                            
                                            const drugColors = {
                                                'Vincristine': 'from-purple-500 to-indigo-500 shadow-purple-500/10',
                                                'Carboplatin': 'from-sky-500 to-blue-500 shadow-sky-500/10',
                                                'Bleomycin': 'from-teal-500 to-emerald-500 shadow-teal-500/10',
                                                'CV Regimen': 'from-amber-500 to-orange-500 shadow-amber-500/10',
                                                'BC Regimen': 'from-rose-500 to-pink-500 shadow-rose-500/10',
                                                'Other': 'from-slate-400 to-slate-500 shadow-slate-500/10'
                                            };
                                            
                                            return items.map(([name, val]) => {
                                                const pct = maxVal > 0 ? (val / maxVal) * 80 : 0; // max height is 80%
                                                const bgGradient = drugColors[name] || 'from-indigo-500 to-purple-500';
                                                return (
                                                    <div key={name} className="flex flex-col items-center flex-1 group">
                                                        <span className="text-[10px] font-black font-mono mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-1">
                                                            {val} ครั้ง
                                                        </span>
                                                        <div 
                                                            className={`w-10 sm:w-12 bg-gradient-to-t ${bgGradient} rounded-t-xl transition-all duration-500 group-hover:brightness-110 shadow-lg relative`}
                                                            style={{ height: `${pct}%`, minHeight: val > 0 ? '8px' : '2px' }}
                                                        >
                                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black font-mono opacity-85 group-hover:hidden">
                                                                {val}
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] font-black text-center mt-3 truncate w-full px-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                            {name}
                                                        </span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Drug Share - Donut Chart */}
                                <div className="lg:col-span-2 premium-card p-6 flex flex-col justify-between">
                                    <h3 className="font-black mb-5 uppercase tracking-wider text-sm flex items-center gap-2 opacity-90">
                                        <TrendingUp size={18} className="text-sky-500 dark:text-sky-400" />
                                        สัดส่วนการใช้ยาเคมีบำบัด
                                    </h3>
                                    
                                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-center h-full py-4 gap-6">
                                        {(() => {
                                            const drugCounts = stats.drugCounts || {};
                                            const rawData = Object.entries(drugCounts).map(([name, val]) => ({ name, value: val }));
                                            const total = rawData.reduce((s, i) => s + i.value, 0) || 0;
                                            
                                            const COLORS = {
                                                'Vincristine': '#8b5cf6', // Violet
                                                'Carboplatin': '#0ea5e9', // Sky
                                                'Bleomycin': '#14b8a6', // Teal
                                                'CV Regimen': '#f59e0b', // Amber
                                                'BC Regimen': '#f43f5e', // Rose
                                                'Other': '#64748b' // Slate
                                            };
                                            
                                            if (total === 0) {
                                                return (
                                                    <div className="text-center p-8 opacity-60 font-bold italic text-xs w-full">
                                                        ไม่มีข้อมูลการใช้ยา
                                                    </div>
                                                );
                                            }

                                            const cx = 100;
                                            const cy = 100;
                                            const r = 80;
                                            const innerR = 55;
                                            const slices = getDonutSlices(rawData, cx, cy, r, innerR);
                                            
                                            return (
                                                <>
                                                    <div className="relative w-[220px] h-[220px] shrink-0">
                                                        <svg width="220" height="220" viewBox="0 0 200 200" className="drop-shadow-lg">
                                                            {slices.map((s, idx) => (
                                                                <path 
                                                                    key={idx}
                                                                    d={s.d}
                                                                    fill={COLORS[s.name] || '#6366f1'}
                                                                    className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                                                                    title={`${s.name}: ${s.value} ครั้ง (${s.percent}%)`}
                                                                />
                                                            ))}
                                                            <circle cx={cx} cy={cy} r={innerR - 2} fill={isDark ? '#1e293b' : '#ffffff'} />
                                                            <text x={cx} y={cy - 12} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="11" fontWeight="900" opacity="0.8">
                                                                ใช้ยาทั้งหมด
                                                            </text>
                                                            <text x={cx} y={cy + 12} textAnchor="middle" fill={isDark ? '#ffffff' : '#0f172a'} fontSize="26" fontWeight="900">
                                                                {total}
                                                            </text>
                                                            <text x={cx} y={cy + 32} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="10" fontWeight="700" opacity="0.6">
                                                                ครั้ง
                                                            </text>
                                                        </svg>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-2.5 flex-1 w-full max-w-[200px]">
                                                        {slices.map((s, idx) => {
                                                            if (s.value === 0) return null;
                                                            return (
                                                                <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm">
                                                                    <span 
                                                                        className="h-3 w-3 rounded-full shrink-0 shadow-sm" 
                                                                        style={{ backgroundColor: COLORS[s.name] || '#6366f1' }}
                                                                    />
                                                                    <span className="font-bold opacity-90 flex-1 truncate">{s.name}</span>
                                                                    <span className="font-black font-mono opacity-70">{s.percent}%</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Pharmacist Leaderboard */}
                            <div className="premium-card p-6">
                                <h3 className="font-black mb-5 uppercase tracking-wider text-sm flex items-center gap-2 opacity-90">
                                    <Users size={18} className="text-emerald-500 dark:text-emerald-400" />
                                    การใช้งานของเภสัชกรสูงสุด (Top Active)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                                    {stats.leaderboard && stats.leaderboard.length > 0 ? (
                                        stats.leaderboard.map((pharmacist) => {
                                            return (
                                                <div
                                                    key={pharmacist.name}
                                                    className={`p-4 rounded-2xl border flex flex-col justify-between items-center text-center transition-all ${
                                                        isDark
                                                            ? 'bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/60 hover:translate-y-[-2px]'
                                                            : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100 hover:translate-y-[-2px] shadow-sm'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mb-3">
                                                        <User size={18} className="text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-800 dark:text-white truncate max-w-full">{pharmacist.name}</p>
                                                        <p className="text-[9px] opacity-50 mt-0.5">เภสัชกรผู้บันทึก</p>
                                                    </div>
                                                    <span className={`mt-3.5 px-3 py-1 rounded-full text-[10px] font-black font-mono border ${
                                                        isDark ? 'bg-sky-950/40 text-sky-400 border-sky-900/30' : 'bg-sky-50 text-sky-600 border-sky-200'
                                                    }`}>
                                                        {pharmacist.count} ครั้ง
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-5 text-center p-8 opacity-60 font-bold italic text-sm">
                                            ยังไม่มีประวัติการคำนวณยาในระบบ
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : activeTab === 'users' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Form Section */}
                    <div className="lg:col-span-1">
                        <div className="premium-card p-6 border-sky-500/30">
                            <h3 className="font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-sm opacity-90">
                                <UserPlus size={18} className="text-sky-500 dark:text-sky-400" />
                                สร้างบัญชีผู้ใช้งานใหม่
                            </h3>
                            <form onSubmit={handleCreateSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">รหัสพนักงาน (Employee ID)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="เช่น 6604"
                                            className="form-control pl-10 text-sm"
                                            value={createForm.employee_id}
                                            onChange={e => setCreateForm({ ...createForm, employee_id: e.target.value })}
                                            required
                                        />
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">ชื่อผู้ใช้งาน (Username)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="ชื่อ-นามสกุล หรือชื่อเรียก"
                                            className="form-control pl-10 text-sm"
                                            value={createForm.username}
                                            onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                                            required
                                        />
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">รหัสผ่าน (Password)</label>
                                    <div className="relative">
                                        <input
                                            type={showCreatePassword ? "text" : "password"}
                                            placeholder="รหัสผ่านเข้าใช้งาน (อย่างน้อย 6 ตัวอักษร)"
                                            className="form-control pl-10 pr-10 text-sm"
                                            value={createForm.password}
                                            onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                            required
                                        />
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                        <button
                                            type="button"
                                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-sky-500 transition-colors cursor-pointer"
                                        >
                                            {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">บทบาทหน้าที่ (Role)</label>
                                    <div className="relative">
                                        <select
                                            className="form-control pl-10 text-sm appearance-none"
                                            value={createForm.role}
                                            onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                        >
                                            <option value="pharmacist">pharmacist (เภสัชกร)</option>
                                            <option value="admin">admin (ผู้ดูแลระบบ)</option>
                                        </select>
                                        <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    </div>
                                </div>

                                <button type="submit" className="w-full btn-primary text-sm p-3 mt-4 flex items-center justify-center gap-2">
                                    <UserPlus size={16} /> ยืนยันสร้างผู้ใช้
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Users List Section */}
                    <div className="lg:col-span-2">
                        <div className="premium-card p-6 h-full flex flex-col">
                            <h3 className="font-black mb-5 uppercase tracking-wider text-sm flex items-center gap-2 opacity-90">
                                <Shield size={18} className="text-emerald-500 dark:text-emerald-400" />
                                บัญชีผู้ใช้งานในระบบ ({users.length} บัญชี)
                            </h3>

                            <div className="overflow-x-auto rounded-xl border border-slate-700/20 shadow-inner flex-1 scrollable-table-container">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 z-10 font-bold" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                        <tr className="bg-sky-600/10 border-b border-slate-700/20 opacity-60">
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[20%]">รหัสพนักงาน (ID)</th>
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[30%]">ชื่อผู้ใช้งาน</th>
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[15%] text-center">บทบาท (Role)</th>
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[20%] text-center">สถานะ (Status)</th>
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[15%] text-center">การจัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-500 font-bold italic">
                                                    กำลังโหลดข้อมูล...
                                                </td>
                                            </tr>
                                        ) : users.length > 0 ? (
                                            users.map(u => (
                                                <tr key={u.id} className="border-b border-slate-700/10 hover:bg-sky-600/5 transition-colors">
                                                    <td className="p-4 font-mono font-bold">{u.employee_id}</td>
                                                    <td className="p-4 font-bold">{u.username}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border uppercase tracking-wider ${u.role?.toUpperCase() === 'ADMIN'
                                                                ? (isDark
                                                                    ? 'bg-rose-950/30 text-rose-400 border-rose-900/30'
                                                                    : 'bg-rose-50 text-rose-600 border-rose-200')
                                                                : (isDark
                                                                    ? 'bg-sky-950/30 text-sky-400 border-sky-900/30'
                                                                    : 'bg-sky-50 text-sky-600 border-sky-200')
                                                            }`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                     <td className="p-4 text-center">
                                                         {u.employee_id === currentUser.employee_id ? (
                                                             u.must_change_password === 1 ? (
                                                                 <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                                                                     isDark
                                                                         ? 'bg-amber-950/30 text-amber-400 border-amber-900/30'
                                                                         : 'bg-amber-50 text-amber-600 border-amber-200'
                                                                 }`}>
                                                                     รอเปลี่ยนรหัส
                                                                 </span>
                                                             ) : (
                                                                 <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                                                                     isDark
                                                                         ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30'
                                                                         : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                 }`}>
                                                                     ใช้งานปกติ
                                                                 </span>
                                                             )
                                                         ) : (
                                                             u.is_active === 0 ? (
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => handleToggleStatus(u)}
                                                                     className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                                                         isDark
                                                                             ? 'bg-rose-950/30 hover:bg-rose-900/30 text-rose-400 border-rose-900/30'
                                                                             : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                                                                     }`}
                                                                     title="คลิกเพื่อเปิดใช้งาน"
                                                                 >
                                                                     ระงับการใช้งาน
                                                                 </button>
                                                             ) : u.must_change_password === 1 ? (
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => handleToggleStatus(u)}
                                                                     className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                                                         isDark
                                                                             ? 'bg-amber-950/30 hover:bg-amber-900/30 text-amber-400 border-amber-900/30'
                                                                             : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200'
                                                                     }`}
                                                                     title="คลิกเพื่อระงับการใช้งาน"
                                                                 >
                                                                     รอเปลี่ยนรหัส
                                                                 </button>
                                                             ) : (
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => handleToggleStatus(u)}
                                                                     className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                                                         isDark
                                                                             ? 'bg-emerald-950/30 hover:bg-emerald-900/30 text-emerald-400 border-emerald-900/30'
                                                                             : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                                                                     }`}
                                                                     title="คลิกเพื่อระงับการใช้งาน"
                                                                 >
                                                                     ใช้งานปกติ
                                                                 </button>
                                                             )
                                                         )}
                                                     </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => handleEditClick(u)}
                                                                className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer ${isDark
                                                                        ? 'bg-sky-950/30 hover:bg-sky-900/40 text-sky-400 hover:text-sky-300 border-sky-900/50'
                                                                        : 'bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 border-sky-200 shadow-sm'
                                                                    }`}
                                                                title="แก้ไข"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(u)}
                                                                className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer ${u.employee_id === currentUser.employee_id
                                                                        ? (isDark
                                                                            ? 'bg-slate-800/40 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-40'
                                                                            : 'bg-slate-100 text-slate-400 border-slate-200/50 cursor-not-allowed opacity-40')
                                                                        : (isDark
                                                                            ? 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border-rose-900/50'
                                                                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border-rose-200 shadow-sm')
                                                                    }`}
                                                                disabled={u.employee_id === currentUser.employee_id}
                                                                title={u.employee_id === currentUser.employee_id ? "ไม่สามารถลบตัวเองได้" : "ลบ"}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-500 font-bold italic">
                                                    ไม่พบผู้ใช้ในระบบ
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'logs' ? (
                /* Login History View — ประวัติการเข้าใช้งาน */
                <div className="premium-card p-6 flex flex-col">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                        <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2 opacity-90">
                            <LogIn size={18} className="text-emerald-500 dark:text-emerald-400" />
                            ประวัติการเข้าใช้งานระบบ ({filteredLogs.length} รายการ)
                        </h3>
                        <div className="flex items-center gap-2.5 w-full md:w-auto">
                            <button
                                onClick={() => setShowLogFilterPanel(!showLogFilterPanel)}
                                className={`py-2.5 px-4 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${showLogFilterPanel
                                    ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                                    : theme === 'dark'
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                                    }`}
                            >
                                <Filter size={15} /> {showLogFilterPanel ? 'ปิดตัวกรอง' : 'ตัวกรอง (Filters)'}
                            </button>
                            <div className="relative w-full md:w-[240px]">
                                <input
                                    type="text"
                                    placeholder="ค้นหา รหัสพนักงาน / ชื่อผู้ใช้ / บทบาท ..."
                                    value={logSearchQuery}
                                    onChange={e => setLogSearchQuery(e.target.value)}
                                    className="form-control py-2.5 pl-10 pr-4 text-sm rounded-xl font-bold"
                                />
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {showLogFilterPanel && (
                        <div className={`p-5 rounded-2xl border mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pop ${isDark
                            ? 'bg-slate-900/60 border-slate-800'
                            : 'bg-slate-50 border-slate-200 shadow-inner'
                            }`}>
                            <div>
                                <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่เริ่มต้น (Start Date)</label>
                                <input
                                    type="text"
                                    placeholder="วว/ดด/ปปปป (เช่น 24/06/2569)"
                                    value={logStartDateFilter}
                                    onChange={e => handleDateInputChange(e.target.value, logStartDateFilter, setLogStartDateFilter)}
                                    className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่สิ้นสุด (End Date)</label>
                                <input
                                    type="text"
                                    placeholder="วว/ดด/ปปปป (เช่น 24/06/2569)"
                                    value={logEndDateFilter}
                                    onChange={e => handleDateInputChange(e.target.value, logEndDateFilter, setLogEndDateFilter)}
                                    className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">บทบาท (Role)</label>
                                <select
                                    value={logRoleFilter}
                                    onChange={e => setLogRoleFilter(e.target.value)}
                                    className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                >
                                    <option value="all">บทบาททั้งหมด (All)</option>
                                    <option value="admin">admin</option>
                                    <option value="pharmacist">pharmacist</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">ประเภทกิจกรรม</label>
                                <select
                                    value={logActionFilter}
                                    onChange={e => setLogActionFilter(e.target.value)}
                                    className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                >
                                    <option value="all">กิจกรรมทั้งหมด (All)</option>
                                    <option value="LOGIN">LOGIN</option>
                                    <option value="LOGOUT">LOGOUT</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-3 border-t border-slate-700/10">
                                <button
                                    onClick={() => {
                                        setLogStartDateFilter('');
                                        setLogEndDateFilter('');
                                        setLogRoleFilter('all');
                                        setLogActionFilter('all');
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600/20 transition-all cursor-pointer"
                                >
                                    ล้างตัวกรอง (Reset)
                                </button>
                                <button
                                    onClick={() => setShowLogFilterPanel(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-black bg-slate-700 text-white transition-all cursor-pointer"
                                >
                                    ปิด (Close)
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-slate-700/20 shadow-inner scrollable-table-container">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 z-10 font-bold" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <tr className="bg-sky-600/10 border-b border-slate-700/20 opacity-60">
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[25%]">วันที่/เวลา</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[15%]">รหัสพนักงาน</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[25%]">ชื่อผู้ใช้</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[15%] text-center">บทบาท (Role)</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[20%] text-center">กิจกรรม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsLoading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500 font-bold italic">
                                            กำลังโหลดประวัติการเข้าใช้งาน...
                                        </td>
                                    </tr>
                                ) : filteredLogs.length > 0 ? (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="border-b border-slate-700/10 hover:bg-sky-600/5 transition-colors">
                                            <td className="p-4 font-mono opacity-70 whitespace-nowrap">{log.timestamp}</td>
                                            <td className="p-4 font-mono font-bold whitespace-nowrap">{log.employee_id}</td>
                                            <td className="p-4 font-bold">{log.username}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border uppercase tracking-wider ${log.role?.toUpperCase() === 'ADMIN'
                                                        ? (isDark
                                                            ? 'bg-rose-950/30 text-rose-400 border-rose-900/30'
                                                            : 'bg-rose-50 text-rose-600 border-rose-200')
                                                        : (isDark
                                                            ? 'bg-sky-950/30 text-sky-400 border-sky-900/30'
                                                            : 'bg-sky-50 text-sky-600 border-sky-200')
                                                    }`}>
                                                    {log.role || 'unknown'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border tracking-wider uppercase ${log.action_type === 'LOGIN' || !log.action_type
                                                        ? (isDark
                                                            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30'
                                                            : 'bg-emerald-50 text-emerald-600 border-emerald-200')
                                                        : (isDark
                                                            ? 'bg-slate-800/40 text-slate-400 border-slate-700/30'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200')
                                                    }`}>
                                                    {log.action_type || 'LOGIN'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500 font-bold italic">
                                            ไม่พบประวัติการเข้าใช้งานในระบบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'activities' ? (
    /* Modification History View — ประวัติการแก้ไขข้อมูล */
    <div className="premium-card p-6 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
            <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2 opacity-90">
                <PenLine size={18} className="text-amber-500 dark:text-amber-400" />
                ประวัติการแก้ไขข้อมูลในระบบ ({filteredActivities.length} รายการ)
            </h3>
            <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                    onClick={() => setShowActivityFilterPanel(!showActivityFilterPanel)}
                    className={`py-2.5 px-4 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${showActivityFilterPanel
                        ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                        : theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                        }`}
                >
                    <Filter size={15} /> {showActivityFilterPanel ? 'ปิดตัวกรอง' : 'ตัวกรอง (Filters)'}
                </button>
                <div className="relative w-full md:w-[240px]">
                    <input
                        type="text"
                        placeholder="ค้นหา ผู้ใช้ / ประเภท / รายละเอียด ..."
                        value={activitySearchQuery}
                        onChange={e => setActivitySearchQuery(e.target.value)}
                        className="form-control py-2.5 pl-10 pr-4 text-sm rounded-xl font-bold"
                    />
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
            </div>
        </div>

        {showActivityFilterPanel && (
            <div className={`p-5 rounded-2xl border mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pop ${isDark
                ? 'bg-slate-900/60 border-slate-800'
                : 'bg-slate-50 border-slate-200 shadow-inner'
                }`}>
                <div>
                    <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่เริ่มต้น (Start Date)</label>
                    <input
                        type="text"
                        placeholder="วว/ดด/ปปปป (เช่น 24/06/2569)"
                        value={activityStartDateFilter}
                        onChange={e => handleDateInputChange(e.target.value, activityStartDateFilter, setActivityStartDateFilter)}
                        className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่สิ้นสุด (End Date)</label>
                    <input
                        type="text"
                        placeholder="วว/ดด/ปปปป (เช่น 24/06/2569)"
                        value={activityEndDateFilter}
                        onChange={e => handleDateInputChange(e.target.value, activityEndDateFilter, setActivityEndDateFilter)}
                        className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">ประเภทการแก้ไข</label>
                    <select
                        value={activityActionFilter}
                        onChange={e => setActivityActionFilter(e.target.value)}
                        className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                    >
                        <option value="all">ประเภททั้งหมด (All)</option>
                        <option value="SAVE_CALCULATION">SAVE_CALCULATION (บันทึกการคำนวณ)</option>
                        <option value="CREATE_USER">CREATE_USER (สร้างผู้ใช้)</option>
                        <option value="UPDATE_USER">UPDATE_USER (แก้ไขผู้ใช้)</option>
                        <option value="DELETE_USER">DELETE_USER (ลบผู้ใช้)</option>
                        <option value="DELETE_LOG">DELETE_LOG (ลบบันทึก)</option>
                        <option value="UPDATE_PASSWORD">UPDATE_PASSWORD (เปลี่ยนรหัสผ่าน)</option>
                    </select>
                </div>
                <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2 pt-3 border-t border-slate-700/10">
                    <button
                        onClick={() => {
                            setActivityStartDateFilter('');
                            setActivityEndDateFilter('');
                            setActivityActionFilter('all');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600/20 transition-all cursor-pointer"
                    >
                        ล้างตัวกรอง (Reset)
                    </button>
                    <button
                        onClick={() => setShowActivityFilterPanel(false)}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-slate-700 text-white transition-all cursor-pointer"
                    >
                        ปิด (Close)
                    </button>
                </div>
            </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-700/20 shadow-inner scrollable-table-container">
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 font-bold" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                    <tr className="bg-sky-600/10 border-b border-slate-700/20 opacity-60">
                        <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[18%]">วันที่</th>
                        <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[12%]">รหัสพนักงาน</th>
                        <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[15%]">ผู้ดำเนินการ</th>
                        <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[18%] text-center">ประเภทการแก้ไข</th>
                        <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[37%]">รายละเอียด</th>
                    </tr>
                </thead>
                <tbody>
                    {activitiesLoading ? (
                        <tr>
                            <td colSpan="5" className="p-8 text-center text-slate-500 font-bold italic">กำลังโหลดประวัติการแก้ไข...</td>
                        </tr>
                    ) : filteredActivities.length > 0 ? (
                        filteredActivities.map(act => {
                            const actionBadge = {
                                'SAVE_CALCULATION': { label: 'บันทึกการคำนวณ', dark: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30', light: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                                'CREATE_USER': { label: 'สร้างผู้ใช้', dark: 'bg-sky-950/30 text-sky-400 border-sky-900/30', light: 'bg-sky-50 text-sky-600 border-sky-200' },
                                'UPDATE_USER': { label: 'แก้ไขผู้ใช้', dark: 'bg-amber-950/30 text-amber-400 border-amber-900/30', light: 'bg-amber-50 text-amber-600 border-amber-200' },
                                'DELETE_USER': { label: 'ลบผู้ใช้', dark: 'bg-rose-950/30 text-rose-400 border-rose-900/30', light: 'bg-rose-50 text-rose-600 border-rose-200' },
                                'DELETE_LOG': { label: 'ลบบันทึก', dark: 'bg-orange-950/30 text-orange-400 border-orange-900/30', light: 'bg-orange-50 text-orange-600 border-orange-200' },
                                'UPDATE_PASSWORD': { label: 'เปลี่ยนรหัสผ่าน', dark: 'bg-indigo-950/30 text-indigo-400 border-indigo-900/30', light: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
                            };
                            const badge = actionBadge[act.action_type] || { label: act.action_type, dark: 'bg-slate-800/30 text-slate-400 border-slate-700/30', light: 'bg-slate-100 text-slate-600 border-slate-200' };
                            return (
                                <tr key={act.id} className="border-b border-slate-700/10 hover:bg-sky-600/5 transition-colors">
                                    <td className="p-4 font-mono opacity-70 whitespace-nowrap">{act.timestamp}</td>
                                    <td className="p-4 font-mono font-bold whitespace-nowrap">{act.employee_id}</td>
                                    <td className="p-4 font-bold">{act.username}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black border tracking-wider whitespace-nowrap ${isDark ? badge.dark : badge.light}`}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm opacity-80">{act.details}</td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="5" className="p-8 text-center text-slate-500 font-bold italic">ไม่พบประวัติการแก้ไขข้อมูลในระบบ</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
) : null}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="premium-card p-6 md:p-8 w-full max-w-md animate-pop relative border-sky-500/50">
                        <button
                            onClick={() => setEditingUser(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="font-black text-lg mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-3">
                            <Edit2 size={18} className="text-sky-500 dark:text-sky-400" />
                            แก้ไขข้อมูลผู้ใช้งาน
                        </h3>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">รหัสพนักงาน (Employee ID)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="รหัสพนักงาน"
                                        className="form-control pl-10 text-sm"
                                        value={editForm.employee_id}
                                        onChange={e => setEditForm({ ...editForm, employee_id: e.target.value })}
                                        required
                                    />
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">ชื่อผู้ใช้งาน (Username)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="ชื่อผู้ใช้งาน"
                                        className="form-control pl-10 text-sm"
                                        value={editForm.username}
                                        onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                        required
                                    />
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">เปลี่ยนรหัสผ่าน (New Password)</label>
                                <div className="relative">
                                    <input
                                        type={showEditPassword ? "text" : "password"}
                                        placeholder="เว้นว่างไว้เพื่อใช้รหัสผ่านเดิม (อย่างน้อย 6 ตัวอักษร)"
                                        className="form-control pl-10 pr-10 text-sm"
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                    />
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <button
                                        type="button"
                                        onClick={() => setShowEditPassword(!showEditPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-sky-500 transition-colors cursor-pointer"
                                    >
                                        {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <span className="text-[10px] opacity-70 block mt-1 ml-1">หากไม่ต้องการแก้ไขรหัสผ่าน ให้ปล่อยช่องนี้ว่างไว้</span>
                            </div>

                            <div>
                                <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">บทบาทหน้าที่ (Role)</label>
                                <div className="relative">
                                    <select
                                        className="form-control pl-10 text-sm appearance-none"
                                        value={editForm.role}
                                        onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                    >
                                        <option value="pharmacist">pharmacist (เภสัชกร)</option>
                                        <option value="admin">admin (ผู้ดูแลระบบ)</option>
                                    </select>
                                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">สถานะการใช้งาน (Status)</label>
                                <div className="relative">
                                    <select
                                        className="form-control pl-10 text-sm appearance-none"
                                        value={editForm.is_active}
                                        onChange={e => setEditForm({ ...editForm, is_active: parseInt(e.target.value, 10) })}
                                        disabled={editingUser.employee_id === currentUser.employee_id}
                                    >
                                        <option value={1}>ใช้งานปกติ (Active)</option>
                                        <option value={0}>ระงับการใช้งาน (Suspended)</option>
                                    </select>
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                </div>
                                {editingUser.employee_id === currentUser.employee_id && (
                                    <span className="text-[10px] text-rose-500 block mt-1 ml-1">ไม่สามารถระงับการใช้งานบัญชีตนเองได้</span>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className={`w-1/2 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-95 cursor-pointer text-center ${isDark
                                            ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                            : 'border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm'
                                        }`}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="w-1/2 btn-primary text-sm py-3 px-4 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> บันทึกข้อมูล
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmUser && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="premium-card p-6 md:p-8 w-full max-w-sm animate-pop relative border-rose-500/30">
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-3 text-rose-500">
                            <Trash2 size={18} />
                            ยืนยันการลบผู้ใช้งาน
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน <strong className="text-slate-200">{deleteConfirmUser.username}</strong> (รหัสพนักงาน: {deleteConfirmUser.employee_id})? การกระทำนี้ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmUser(null)}
                                className={`w-1/2 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-95 cursor-pointer text-center ${isDark
                                        ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                        : 'border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm'
                                    }`}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleDeleteConfirm(deleteConfirmUser.id, deleteConfirmUser.employee_id);
                                    setDeleteConfirmUser(null);
                                }}
                                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-3 px-4 rounded-xl active:scale-95 cursor-pointer text-center transition-all shadow-md shadow-rose-900/10"
                            >
                                ลบผู้ใช้
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Status Change Confirmation Modal */}
            {statusChangeConfirm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`premium-card p-6 md:p-8 w-full max-w-sm animate-pop relative border-l-4 ${
                        statusChangeConfirm.newStatus === 0 ? 'border-l-rose-500 border-rose-500/30' : 'border-l-emerald-500 border-emerald-500/30'
                    }`}>
                        <h3 className={`font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-3 ${
                            statusChangeConfirm.newStatus === 0 ? 'text-rose-500' : 'text-emerald-500'
                        }`}>
                            <Shield size={18} />
                            {statusChangeConfirm.newStatus === 0 ? "ยืนยันการระงับการใช้งาน" : "ยืนยันการเปิดใช้งาน"}
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            คุณต้องการ{statusChangeConfirm.statusText}ผู้ใช้ <strong className="text-slate-200">"{statusChangeConfirm.user.username}"</strong> ใช่หรือไม่?
                            {statusChangeConfirm.newStatus === 0 && " เมื่อดำเนินการแล้ว บัญชีนี้จะไม่สามารถล็อกอินเข้าสู่ระบบได้ชั่วคราว"}
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStatusChangeConfirm(null)}
                                className={`w-1/2 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-95 cursor-pointer text-center ${isDark
                                        ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                        : 'border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm'
                                    }`}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmStatusChange}
                                className={`w-1/2 text-white text-sm font-black py-3 px-4 rounded-xl active:scale-95 cursor-pointer text-center transition-all shadow-md ${
                                    statusChangeConfirm.newStatus === 0 
                                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/10' 
                                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/10'
                                }`}
                            >
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;

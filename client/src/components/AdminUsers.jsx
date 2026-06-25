import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, UserPlus, Edit2, Trash2, Shield, User, Lock, Save, X, Eye, EyeOff, History, Search, FileText } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api';

const AdminUsers = ({ currentUser, setCurrentUser, onBack, showNotification, theme }) => {
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'logs'
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logSearchQuery, setLogSearchQuery] = useState('');
    const isDark = theme === 'dark';

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
        if (activeTab === 'users') {
            fetchUsers();
        } else {
            fetchLogs();
        }
    }, [activeTab]);

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
            const res = await axios.get(`${API_BASE}/admin/logs`, {
                headers: { 'x-employee-id': currentUser.employee_id }
            });
            if (res.data.success) {
                setLogs(res.data.logs);
            }
        } catch (err) {
            console.error("Fetch logs failed:", err);
            showNotification(`ไม่สามารถดึงข้อมูลประวัติการคำนวณได้: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setLogsLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        const { username, employee_id, password, role } = createForm;
        if (!username || !employee_id || !password) {
            showNotification("กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน", "error");
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
            role: user.role || 'pharmacist'
        });
        setShowEditPassword(false);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const { username, employee_id, role } = editForm;
        if (!username || !employee_id) {
            showNotification("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
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

    const handleDeleteClick = async (userId, employeeId, userName) => {
        if (employeeId === currentUser.employee_id) {
            showNotification("ไม่สามารถลบบัญชีของตัวเองได้", "error");
            return;
        }

        if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ "${userName}" (รหัสพนักงาน: ${employeeId}) ?`)) {
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
        }
    };

    const handleDeleteLog = async (logId, patientName, timestamp) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบประวัติการคำนวณของ "${patientName}" เมื่อวันที่ ${timestamp} ?`)) {
            try {
                const res = await axios.delete(`${API_BASE}/admin/logs/${logId}`, {
                    headers: { 'x-employee-id': currentUser.employee_id }
                });
                if (res.data.success) {
                    showNotification("ลบประวัติการคำนวณสำเร็จ", "success");
                    fetchLogs();
                }
            } catch (err) {
                console.error("Delete log failed:", err);
                showNotification(`ไม่สามารถลบประวัติการคำนวณได้: ${err.response?.data?.message || err.message}`, "error");
            }
        }
    };

    const filteredLogs = useMemo(() => {
        if (!logSearchQuery.trim()) return logs;
        const q = logSearchQuery.toLowerCase();
        return logs.filter(log =>
            (log.hn && log.hn.toLowerCase().includes(q)) ||
            (log.patient_name && log.patient_name.toLowerCase().includes(q)) ||
            (log.user_name && log.user_name.toLowerCase().includes(q)) ||
            (log.formula_used && log.formula_used.toLowerCase().includes(q))
        );
    }, [logs, logSearchQuery]);

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
                        <p className="text-xs opacity-70">สำหรับผู้ดูแลระบบ (Admin Only) เพื่อจัดการบัญชีผู้ใช้และประวัติการคำนวณ</p>
                    </div>
                </div>
            </div>

            {/* Tab Switched Header */}
            <div className="flex gap-3 mb-6 no-print">
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
                    <History size={16} /> ประวัติการคำนวณ (Calculation Logs)
                </button>
            </div>

            {activeTab === 'users' ? (
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
                                            placeholder="รหัสผ่านเข้าใช้งาน"
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
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[25%]">รหัสพนักงาน (ID)</th>
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[35%]">ชื่อผู้ใช้งาน</th>
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[20%] text-center">บทบาท (Role)</th>
                                            <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[20%] text-center">การจัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-500 font-bold italic">
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
                                                                onClick={() => handleDeleteClick(u.id, u.employee_id, u.username)}
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
                                                <td colSpan="4" className="p-8 text-center text-slate-500 font-bold italic">
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
            ) : (
                /* Calculation Logs View */
                <div className="premium-card p-6 flex flex-col">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                        <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2 opacity-90">
                            <FileText size={18} className="text-sky-500 dark:text-sky-400" />
                            รายงานประวัติการคำนวณของระบบทั้งหมด
                        </h3>
                        <div className="relative w-full md:w-[320px]">
                            <input
                                type="text"
                                placeholder="ค้นหา HN / ชื่อคนไข้ / ผู้บันทึก..."
                                value={logSearchQuery}
                                onChange={e => setLogSearchQuery(e.target.value)}
                                className="form-control py-2.5 pl-10 pr-4 text-sm rounded-xl font-bold"
                            />
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-700/20 shadow-inner scrollable-table-container">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 z-10 font-bold" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <tr className="bg-sky-600/10 border-b border-slate-700/20 opacity-60">
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[15%]">วันที่บันทึก</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[10%]">HN</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[18%]">ชื่อผู้ป่วย</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[8%] text-center">เพศ</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[8%] text-center">อายุ</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[8%] text-center">BSA (m²)</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[18%]">สูตรคำนวณ</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[12%] text-right">Dose</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[11%] text-center">ผู้บันทึก</th>
                                    <th className="p-4 font-black uppercase tracking-wider text-[11px] w-[5%] text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsLoading ? (
                                    <tr>
                                        <td colSpan="10" className="p-8 text-center text-slate-500 font-bold italic">
                                            กำลังโหลดประวัติการคำนวณ...
                                        </td>
                                    </tr>
                                ) : filteredLogs.length > 0 ? (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="border-b border-slate-700/10 hover:bg-sky-600/5 transition-colors">
                                            <td className="p-4 font-mono opacity-70 whitespace-nowrap">{log.timestamp}</td>
                                            <td className="p-4 font-bold whitespace-nowrap">{log.hn}</td>
                                            <td className="p-4 font-bold uppercase">{log.patient_name}</td>
                                            <td className="p-4 text-center font-bold whitespace-nowrap">
                                                {log.gender === 'female' ? 'หญิง' : log.gender === 'male' ? 'ชาย' : '-'}
                                            </td>
                                            <td className="p-4 text-center font-bold whitespace-nowrap">
                                                {log.age ? `${log.age} ปี` : '-'}
                                            </td>
                                            <td className="p-4 text-center text-emerald-500 font-bold whitespace-nowrap">{log.calculated_bsa}</td>
                                            <td className="p-4 text-slate-400 font-bold uppercase leading-snug">{log.formula_used}</td>
                                            <td className="p-4 text-right text-amber-500 font-black whitespace-nowrap">{log.prescribed_dose}</td>
                                            <td className="p-4 text-center text-sky-400 font-bold uppercase truncate max-w-[100px]">{log.user_name || '-'}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteLog(log.id, log.patient_name, log.timestamp)}
                                                    className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer ${isDark
                                                            ? 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border-rose-900/50'
                                                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border-rose-200 shadow-sm'
                                                        }`}
                                                    title="ลบรายการบันทึกนี้"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="p-8 text-center text-slate-500 font-bold italic">
                                            ไม่พบประวัติการคำนวณในระบบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                                        placeholder="เว้นว่างไว้เพื่อใช้รหัสผ่านเดิม"
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
        </div>
    );
};

export default AdminUsers;

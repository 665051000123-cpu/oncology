import React, { useState } from 'react';
import { Lock, Eye, EyeOff, XCircle, KeyRound, LogOut, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api';

const ChangePassword = ({ user, onPasswordChanged, onLogout }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!newPassword || !confirmPassword) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (newPassword.length < 6) {
            setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('การยืนยันรหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/change-password`, {
                employee_id: user.employee_id,
                new_password: newPassword
            });

            if (res.data.success) {
                // Update local storage user details to set must_change_password = 0
                const updatedUser = { ...user, must_change_password: 0 };
                localStorage.setItem('oncology_user', JSON.stringify(updatedUser));
                onPasswordChanged(updatedUser);
            }
        } catch (err) {
            console.error('Change password failed:', err);
            const msg = err.response?.data?.message || 'เปลี่ยนรหัสผ่านล้มเหลว';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full mx-auto premium-card p-8 md:p-10 animate-row-in border-t-4 border-t-amber-500 border-amber-500/20 shadow-[0_25px_60px_rgba(245,158,11,0.15)]">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-[0_10px_25px_rgba(245,158,11,0.3)] transform rotate-3 hover:rotate-12 transition-transform duration-300">
                    <KeyRound size={40} className="text-white -rotate-3" />
                </div>
                <h1 className="text-2xl font-black tracking-wide">เปลี่ยนรหัสผ่านใหม่</h1>
                <p className="text-slate-400 mt-2 font-bold text-xs uppercase tracking-wider">
                    บังคับเปลี่ยนรหัสผ่านสำหรับเข้าใช้งานครั้งแรก
                </p>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-4 bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 leading-relaxed flex items-start gap-2.5 text-left">
                    <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
                    <span>นี่คือการเข้าสู่ระบบครั้งแรก หรือรหัสผ่านของคุณได้รับการรีเซ็ต โปรดตั้งรหัสผ่านใหม่ความยาวไม่ต่ำกว่า 6 ตัวอักษร เพื่อความปลอดภัยในการเข้าใช้งาน</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-3 animate-pop">
                        <XCircle size={16} className="text-red-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase ml-1">
                        รหัสผ่านใหม่ (New Password)
                    </label>
                    <div className="relative">
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="ป้อนรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                            className="form-control pl-10 pr-10 text-sm focus:border-amber-500 focus:ring-amber-500/10"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading}
                        />
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors cursor-pointer"
                        >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase ml-1">
                        ยืนยันรหัสผ่านใหม่ (Confirm New Password)
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                            className="form-control pl-10 pr-10 text-sm focus:border-amber-500 focus:ring-amber-500/10"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                        />
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors cursor-pointer"
                        >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50 mt-6">
                    <button
                        type="button"
                        onClick={onLogout}
                        className="w-1/3 py-3 px-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-sm font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        disabled={loading}
                    >
                        <LogOut size={16} /> ออก
                    </button>
                    <button
                        type="submit"
                        className={`w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-sm font-black transition-all active:scale-95 shadow-md shadow-orange-500/10 cursor-pointer flex items-center justify-center gap-2 ${
                            loading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                        disabled={loading}
                    >
                        {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChangePassword;

import React, { useState } from 'react';
import { User, LogIn, Lock, Eye, EyeOff, XCircle, Syringe } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api';

const Login = ({ onLoginSuccess }) => {
    const [loginData, setLoginData] = useState({ employee_id: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!loginData.employee_id || !loginData.password) {
            setError("กรุณากรอกรหัสพนักงานและรหัสผ่าน");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${API_BASE}/login`, loginData);
            if (res.data.success) {
                // Save to localStorage for persistence
                localStorage.setItem('oncology_user', JSON.stringify(res.data.user));
                onLoginSuccess(res.data.user);
            }
        } catch (err) {
            console.error("Login Error:", err);
            const msg = err.response?.data?.message || "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto premium-card p-8 md:p-10 animate-row-in">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-sky-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg transform rotate-3">
                    <Syringe size={40} className="text-white -rotate-3" />
                </div>
                <h1 className="text-3xl font-black tracking-wide">ระบบคำนวณยาเคมีบำบัด</h1>
                <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-xs">Chemotherapy drug calculation system</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-3 animate-pop">
                        <XCircle size={16} className="text-red-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-black text-slate-400 mb-2 uppercase ml-1">รหัสพนักงาน (Employee ID)</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="กรอกรหัสพนักงาน"
                            className="form-control pl-10"
                            value={loginData.employee_id}
                            onChange={e => setLoginData({ ...loginData, employee_id: e.target.value })}
                            disabled={loading}
                        />
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-black text-slate-400 mb-2 uppercase ml-1">รหัสผ่าน (Password)</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="form-control pl-10 pr-10"
                            value={loginData.password}
                            onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                            disabled={loading}
                        />
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-500 transition-colors cursor-pointer"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    className={`w-full btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={loading}
                >
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'ยืนยัน'} <LogIn size={18} />
                </button>
            </form>
        </div>
    );
};

export default Login;

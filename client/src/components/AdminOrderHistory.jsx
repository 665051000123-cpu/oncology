import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Trash2, Search, Calendar, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';

const API_BASE = '/api';

function AdminOrderHistory({ currentUser, onBack, showNotification, theme, onEdit }) {
    const [orderLogs, setOrderLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        fetchOrderLogs();
    }, []);

    const fetchOrderLogs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/order-logs`);
            setOrderLogs(response.data);
        } catch (error) {
            console.error('Error fetching order logs:', error);
            showNotification('ไม่สามารถโหลดประวัติการสั่งยาได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (logId) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบบันทึกการสั่งยานี้?')) return;
        try {
            const response = await axios.delete(`${API_BASE}/order-logs/${logId}`, {
                headers: { 'x-employee-id': currentUser?.employee_id || '' }
            });
            if (response.data.success) {
                showNotification('ลบประวัติการสั่งยาสำเร็จ', 'success');
                setOrderLogs(prev => prev.filter(log => log.id !== logId));
            } else {
                showNotification('ไม่สามารถลบได้', 'error');
            }
        } catch (error) {
            console.error('Error deleting order log:', error);
            showNotification('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
    };

    const toggleExpand = (id) => {
        setExpandedLogId(prev => prev === id ? null : id);
    };

    const filteredLogs = orderLogs.filter(log => {
        const query = searchQuery.toLowerCase();
        return (log.hn && log.hn.toLowerCase().includes(query)) ||
               (log.patient_name && log.patient_name.toLowerCase().includes(query));
    });

    const canEdit = (log) => {
        const role = currentUser?.role?.toLowerCase() || '';
        if (role === 'admin' || role === 'head') return true;
        if (role === 'pharmacist') {
            const logTime = new Date(log.timestamp).getTime();
            const now = Date.now();
            const diffHours = (now - logTime) / (1000 * 60 * 60);
            return diffHours <= 24;
        }
        return false;
    };

    return (
        <div className="animate-row-in space-y-6">
            <div className="max-w-7xl mx-auto premium-card p-6 md:p-8 relative">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-700/10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2.5 rounded-xl border border-slate-700/30 hover:bg-slate-700/10 transition-all cursor-pointer text-slate-400 hover:text-sky-500 mr-2 no-print"
                            title="ย้อนกลับ"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black flex items-center gap-2">
                                <Calendar size={28} className="text-rose-500 print-hide" /> บันทึกข้อมูลการสั่งยาเคมีบำบัด
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                ประวัติการสั่งยาจากระบบให้ยา (Drug Administration)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mb-6 relative w-full md:w-96 no-print">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหา H.N. หรือ ชื่อผู้ป่วย..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-control pl-10 pr-4 py-3 rounded-2xl border-slate-200 dark:border-slate-700 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 text-sm font-medium transition-all"
                    />
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-bold">ไม่พบประวัติการสั่งยา</div>
                ) : (
                    <div className="space-y-4">
                        {filteredLogs.map(log => {
                            let details = [];
                            try {
                                details = JSON.parse(log.order_details || '[]');
                            } catch (e) {
                                console.error('Failed to parse details for log', log.id);
                            }

                            return (
                                <div key={log.id} className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm hover:shadow">
                                    <div 
                                        className="p-4 flex flex-col md:flex-row justify-between items-center cursor-pointer gap-4"
                                        onClick={() => toggleExpand(log.id)}
                                    >
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                            <div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">วันที่สั่งยา</div>
                                                <div className="text-sm font-bold">{new Date(log.timestamp).toLocaleString('th-TH')}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">H.N. / ชื่อ-สกุล</div>
                                                <div className="text-sm font-black text-rose-600 dark:text-rose-400">{log.hn}</div>
                                                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">{log.patient_name}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">หอผู้ป่วย / แพทย์</div>
                                                <div className="text-sm font-bold">{log.ward || '-'}</div>
                                                <div className="text-xs text-slate-500 font-medium truncate">{log.doctor || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">ผู้บันทึก</div>
                                                <div className="text-sm font-bold text-slate-500">{log.user_name}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 pr-4">
                                            {canEdit(log) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onEdit) onEdit(log);
                                                    }}
                                                    className="p-2 rounded-xl border border-slate-700/30 hover:bg-amber-500/10 transition-all cursor-pointer text-slate-400 hover:text-amber-500 hover:border-amber-500/30 no-print"
                                                    title="แก้ไขบันทึก"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {currentUser?.role?.toUpperCase() === 'ADMIN' || currentUser?.username === log.user_name ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="ลบข้อมูล"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : null}
                                            <div className="text-slate-400">
                                                {expandedLogId === log.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {expandedLogId === log.id && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/40">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                                            <th className="py-2 px-3 font-bold text-slate-500">ชื่อยา</th>
                                                            <th className="py-2 px-3 font-bold text-slate-500">วิธีให้ยา</th>
                                                            <th className="py-2 px-3 font-bold text-slate-500">ตัวทำละลาย</th>
                                                            <th className="py-2 px-3 font-bold text-slate-500">วันเริ่มต้น</th>
                                                            <th className="py-2 px-3 font-bold text-slate-500">วันสุดท้าย</th>
                                                            <th className="py-2 px-3 font-bold text-slate-500">อัตราเร็ว</th>
                                                            <th className="py-2 px-3 font-bold text-slate-500">หมายเหตุ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {details.map((row, idx) => (
                                                            <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/30 last:border-0">
                                                                <td className="py-2.5 px-3 font-black text-rose-600 dark:text-rose-400">{row.drugName || '-'}</td>
                                                                <td className="py-2.5 px-3 font-medium">{row.route || '-'}</td>
                                                                <td className="py-2.5 px-3 font-medium">{row.solvent || '-'}</td>
                                                                <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">{row.startDate || '-'}</td>
                                                                <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">{row.endDate || '-'}</td>
                                                                <td className="py-2.5 px-3 font-black text-sky-600 dark:text-sky-400">{row.rate || '-'}</td>
                                                                <td className="py-2.5 px-3 font-medium">{row.note || '-'}</td>
                                                            </tr>
                                                        ))}
                                                        {details.length === 0 && (
                                                            <tr>
                                                                <td colSpan="7" className="py-4 text-center text-slate-400 font-bold">ไม่มีข้อมูลรายละเอียดการให้ยา</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminOrderHistory;

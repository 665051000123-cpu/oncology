import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ArrowLeft, Trash2, Search, Calendar, ChevronDown, ChevronUp, Edit2, Filter } from 'lucide-react';

const API_BASE = '/api';

function AdminOrderHistory({ currentUser, onBack, showNotification, theme, onEdit }) {
    const [orderLogs, setOrderLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState(null);

    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [wardFilter, setWardFilter] = useState('all');
    const [pharmacistFilter, setPharmacistFilter] = useState('all');

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

    const uniqueWards = useMemo(() => {
        const wards = orderLogs.map(l => l.ward).filter(Boolean);
        return Array.from(new Set(wards)).sort();
    }, [orderLogs]);

    const uniquePharmacists = useMemo(() => {
        const users = orderLogs.map(l => l.user_name).filter(Boolean);
        return Array.from(new Set(users)).sort();
    }, [orderLogs]);

    const parseDateToComparable = (dateStr) => {
        if (!dateStr || dateStr.length !== 10) return null;
        const [d, m, y] = dateStr.split('/');
        const yNum = parseInt(y, 10);
        const gYear = yNum > 2400 ? yNum - 543 : yNum;
        return new Date(`${gYear}-${m}-${d}T00:00:00`);
    };

    const handleDateInputChange = (val, currentVal, setter) => {
        const cleaned = val.replace(/[^\d/]/g, '');
        let formatted = cleaned;
        if (cleaned.length === 2 && !cleaned.includes('/') && (currentVal.length < 2 || !currentVal.includes('/'))) {
            formatted = cleaned + '/';
        } else if (cleaned.length === 5 && cleaned.split('/').length === 2 && (currentVal.length < 5 || currentVal.split('/').length < 3)) {
            formatted = cleaned + '/';
        }
        setter(formatted.substring(0, 10));
    };

    const filteredLogs = orderLogs.filter(log => {
        const query = searchQuery.toLowerCase();
        const matchSearch = (log.hn && log.hn.toLowerCase().includes(query)) ||
                            (log.patient_name && log.patient_name.toLowerCase().includes(query));

        let matchDate = true;
        if (startDateFilter.length === 10 || endDateFilter.length === 10) {
            const logDate = new Date(log.timestamp);
            logDate.setHours(0, 0, 0, 0);

            let sDate = parseDateToComparable(startDateFilter);
            let eDate = parseDateToComparable(endDateFilter);

            if (sDate && eDate) {
                matchDate = logDate >= sDate && logDate <= eDate;
            } else if (sDate) {
                matchDate = logDate >= sDate;
            } else if (eDate) {
                matchDate = logDate <= eDate;
            }
        }

        const matchWard = wardFilter === 'all' || log.ward === wardFilter;
        const matchPharmacist = pharmacistFilter === 'all' || log.user_name === pharmacistFilter;

        return matchSearch && matchDate && matchWard && matchPharmacist;
    });

    const canEdit = (log) => {
        const role = currentUser?.role?.toLowerCase() || '';
        if (role === 'admin' || role === 'head') return true;
        if (role === 'pharmacist') {
            const logDate = new Date(log.timestamp).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
            const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
            return logDate === today;
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
                    <div className="flex items-center gap-2.5 no-print w-full md:w-auto">
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={`py-2 px-4 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all duration-300 whitespace-nowrap ${showFilterPanel
                                ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                                : theme === 'dark'
                                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                                }`}
                        >
                            <Filter size={15} /> {showFilterPanel ? 'ปิดตัวกรอง' : 'ตัวกรอง (Filters)'}
                        </button>
                        <div className="relative w-full md:w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="ค้นหา H.N. หรือ ชื่อผู้ป่วย..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="form-control pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-700/30 font-bold focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 transition-all w-full"
                            />
                        </div>
                    </div>
                </div>

                {showFilterPanel && (
                    <div className={`no-print p-5 rounded-2xl border mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pop ${theme === 'dark'
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200 shadow-inner'
                        }`}>
                        <div>
                            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่เริ่มต้น (Start Date)</label>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    placeholder="วว/ดด/ปปปป"
                                    value={startDateFilter}
                                    onChange={e => handleDateInputChange(e.target.value, startDateFilter, setStartDateFilter)}
                                    className="form-control py-1.5 px-3 text-xs rounded-xl font-bold w-full"
                                    maxLength={10}
                                />
                                <input
                                    type="date"
                                    className="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer w-full h-full"
                                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                                    value={(() => {
                                        if (startDateFilter && startDateFilter.length === 10) {
                                            const d = startDateFilter.substring(0, 2);
                                            const m = startDateFilter.substring(3, 5);
                                            const yNum = parseInt(startDateFilter.substring(6, 10), 10);
                                            if (!isNaN(yNum)) {
                                                const gYear = yNum > 2400 ? yNum - 543 : yNum;
                                                return `${gYear}-${m}-${d}`;
                                            }
                                        }
                                        return '';
                                    })()}
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [y, m, d] = e.target.value.split('-');
                                        const thaiYear = parseInt(y, 10) < 2400 ? parseInt(y, 10) + 543 : parseInt(y, 10);
                                        handleDateInputChange(`${d}/${m}/${thaiYear}`, startDateFilter, setStartDateFilter);
                                    }}
                                />
                                <Calendar size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่สิ้นสุด (End Date)</label>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    placeholder="วว/ดด/ปปปป"
                                    value={endDateFilter}
                                    onChange={e => handleDateInputChange(e.target.value, endDateFilter, setEndDateFilter)}
                                    className="form-control py-1.5 px-3 text-xs rounded-xl font-bold w-full"
                                    maxLength={10}
                                />
                                <input
                                    type="date"
                                    className="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer w-full h-full"
                                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                                    value={(() => {
                                        if (endDateFilter && endDateFilter.length === 10) {
                                            const d = endDateFilter.substring(0, 2);
                                            const m = endDateFilter.substring(3, 5);
                                            const yNum = parseInt(endDateFilter.substring(6, 10), 10);
                                            if (!isNaN(yNum)) {
                                                const gYear = yNum > 2400 ? yNum - 543 : yNum;
                                                return `${gYear}-${m}-${d}`;
                                            }
                                        }
                                        return '';
                                    })()}
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [y, m, d] = e.target.value.split('-');
                                        const thaiYear = parseInt(y, 10) < 2400 ? parseInt(y, 10) + 543 : parseInt(y, 10);
                                        handleDateInputChange(`${d}/${m}/${thaiYear}`, endDateFilter, setEndDateFilter);
                                    }}
                                />
                                <Calendar size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">หอผู้ป่วย (Ward)</label>
                            <select
                                value={wardFilter}
                                onChange={e => setWardFilter(e.target.value)}
                                className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                            >
                                <option value="all">หอผู้ป่วยทั้งหมด (All)</option>
                                {uniqueWards.map(w => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">ผู้บันทึก (Pharmacist)</label>
                            <select
                                value={pharmacistFilter}
                                onChange={e => setPharmacistFilter(e.target.value)}
                                className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                            >
                                <option value="all">ผู้บันทึกทั้งหมด (All)</option>
                                {uniquePharmacists.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-3 border-t border-slate-700/10">
                            <button
                                onClick={() => {
                                    setStartDateFilter('');
                                    setEndDateFilter('');
                                    setWardFilter('all');
                                    setPharmacistFilter('all');
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600/20 transition-all cursor-pointer"
                            >
                                ล้างตัวกรอง (Reset)
                            </button>
                            <button
                                onClick={() => setShowFilterPanel(false)}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-slate-700 text-white transition-all cursor-pointer"
                            >
                                ปิด (Close)
                            </button>
                        </div>
                    </div>
                )}

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

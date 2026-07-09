import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Save, AlertCircle, RefreshCw } from 'lucide-react';
import Notification from './Notification';

const API_BASE = '/api';

export default function InventoryManagement({ currentUser }) {
    const [drugs, setDrugs] = useState([]);
    const [filterMode, setFilterMode] = useState('auto'); // 'auto', 'all'
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [savingId, setSavingId] = useState(null);

    const fetchDrugs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/drugs`);
            if (res.data.success) {
                setDrugs(res.data.drugs);
            }
        } catch (err) {
            console.error('Failed to fetch drugs:', err);
            showNotification('ไม่สามารถโหลดข้อมูลยาได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrugs();
    }, []);

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleUpdateInventory = async (drugId, field, value) => {
        setSavingId(drugId);
        
        // Find current drug data to send complete payload or just partial
        const drug = drugs.find(d => d.drug_id === drugId);
        if (!drug) return;

        let parsedValue = value;
        if (field === 'is_auto_dispensed') {
            parsedValue = value === true ? 1 : 0;
        } else if (field !== 'package_type') {
            parsedValue = value === '' ? 0 : parseFloat(value);
            if (isNaN(parsedValue)) parsedValue = 0;
        }

        const payload = {
            [field]: parsedValue
        };

        // Optimistically update UI
        setDrugs(prev => prev.map(d => d.drug_id === drugId ? { ...d, [field]: parsedValue } : d));

        try {
            const headers = currentUser?.employee_id ? { 'x-employee-id': currentUser.employee_id } : {};
            const res = await axios.put(`${API_BASE}/drugs/${drugId}/inventory`, payload, { headers });
            if (!res.data.success) {
                showNotification('บันทึกข้อมูลไม่สำเร็จ', 'error');
                fetchDrugs(); // Revert
            }
        } catch (err) {
            console.error('Update inventory error:', err);
            showNotification('เกิดข้อผิดพลาดในการบันทึก', 'error');
            fetchDrugs(); // Revert
        } finally {
            setSavingId(null);
        }
    };

    const filteredDrugs = drugs.filter(d => {
        if (filterMode === 'auto' && !d.is_auto_dispensed) return false;
        if (searchTerm) {
            return d.drug_name.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            {notification && (
                <Notification 
                    message={notification.message} 
                    type={notification.type} 
                    onClose={() => setNotification(null)} 
                />
            )}

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden">
                {/* Header Section */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 p-3 rounded-2xl shadow-inner">
                            <Package size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                บริหารคลังยา
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">จัดการสต๊อกและข้อมูลบรรจุภัณฑ์ของรายการยา</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อยา..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>
                        <button onClick={fetchDrugs} className="p-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Filter Options */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${filterMode === 'auto' ? 'border-indigo-500' : 'border-slate-400 group-hover:border-indigo-400'}`}>
                            {filterMode === 'auto' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                        </div>
                        <input
                            type="radio"
                            name="inventoryFilter"
                            className="hidden"
                            checked={filterMode === 'auto'}
                            onChange={() => setFilterMode('auto')}
                        />
                        <span className={`font-bold text-sm ${filterMode === 'auto' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300'}`}>
                            รายการยาในระบบเบิกอัตโนมัติ
                        </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${filterMode === 'all' ? 'border-indigo-500' : 'border-slate-400 group-hover:border-indigo-400'}`}>
                            {filterMode === 'all' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                        </div>
                        <input
                            type="radio"
                            name="inventoryFilter"
                            className="hidden"
                            checked={filterMode === 'all'}
                            onChange={() => setFilterMode('all')}
                        />
                        <span className={`font-bold text-sm ${filterMode === 'all' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300'}`}>
                            รายการยาทั้งหมด
                        </span>
                    </label>
                </div>

                {/* Table Section */}
                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/30 p-6 relative">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                                    <tr className="border-b border-slate-200 dark:border-slate-700 shadow-sm">
                                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16 text-center">ออโต้</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">dname</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">dose/pack</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">package</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Inv</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">InvMin</th>
                                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">InvMax</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-10 text-slate-500 font-medium">กำลังโหลดข้อมูล...</td>
                                        </tr>
                                    ) : filteredDrugs.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-10 text-slate-500 font-medium">ไม่พบรายการยาที่ค้นหา</td>
                                        </tr>
                                    ) : (
                                        filteredDrugs.map(drug => (
                                            <tr key={drug.drug_id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group">
                                                <td className="px-4 py-2 text-center align-middle">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!drug.is_auto_dispensed}
                                                        onChange={(e) => handleUpdateInventory(drug.drug_id, 'is_auto_dispensed', e.target.checked)}
                                                        className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[200px]" title={drug.drug_name}>{drug.drug_name}</div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="number"
                                                        value={drug.dose_per_pack === null ? '' : drug.dose_per_pack}
                                                        onChange={(e) => setDrugs(prev => prev.map(d => d.drug_id === drug.drug_id ? { ...d, dose_per_pack: e.target.value } : d))}
                                                        onBlur={(e) => handleUpdateInventory(drug.drug_id, 'dose_per_pack', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-all shadow-sm focus:shadow-md"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="text"
                                                        value={drug.package_type || ''}
                                                        onChange={(e) => setDrugs(prev => prev.map(d => d.drug_id === drug.drug_id ? { ...d, package_type: e.target.value } : d))}
                                                        onBlur={(e) => handleUpdateInventory(drug.drug_id, 'package_type', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-all shadow-sm focus:shadow-md"
                                                        placeholder="Vial"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="number"
                                                        value={drug.inventory_qty === null ? '' : drug.inventory_qty}
                                                        onChange={(e) => setDrugs(prev => prev.map(d => d.drug_id === drug.drug_id ? { ...d, inventory_qty: e.target.value } : d))}
                                                        onBlur={(e) => handleUpdateInventory(drug.drug_id, 'inventory_qty', e.target.value)}
                                                        className={`w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-md px-2 py-1.5 text-sm font-bold outline-none transition-all shadow-sm focus:shadow-md ${
                                                            parseFloat(drug.inventory_qty) <= parseFloat(drug.inventory_min) && parseFloat(drug.inventory_min) > 0 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'text-emerald-700 dark:text-emerald-400'
                                                        }`}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="number"
                                                        value={drug.inventory_min === null ? '' : drug.inventory_min}
                                                        onChange={(e) => setDrugs(prev => prev.map(d => d.drug_id === drug.drug_id ? { ...d, inventory_min: e.target.value } : d))}
                                                        onBlur={(e) => handleUpdateInventory(drug.drug_id, 'inventory_min', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-all shadow-sm focus:shadow-md text-amber-600 dark:text-amber-500"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="number"
                                                        value={drug.inventory_max === null ? '' : drug.inventory_max}
                                                        onChange={(e) => setDrugs(prev => prev.map(d => d.drug_id === drug.drug_id ? { ...d, inventory_max: e.target.value } : d))}
                                                        onBlur={(e) => handleUpdateInventory(drug.drug_id, 'inventory_max', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-all shadow-sm focus:shadow-md text-slate-600 dark:text-slate-400"
                                                        placeholder="0"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-4 text-[11px] text-slate-500 font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-indigo-500" /> 
                            <span>สามารถคลิกที่ช่องตัวเลขหรือข้อความเพื่อพิมพ์แก้ไข และ<span className="text-indigo-600 dark:text-indigo-400">ระบบจะบันทึกอัตโนมัติ</span>เมื่อคลิกออกไปที่อื่น (Inline Edit)</span>
                        </div>
                        <div className="bg-white dark:bg-slate-700 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                            พบรายการยาทั้งหมด <span className="text-indigo-600 dark:text-indigo-400">{filteredDrugs.length}</span> รายการ
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

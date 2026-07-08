import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pill, Search, FlaskConical, Ruler, ShieldAlert, Activity, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api';

const DrugsInfo = ({ currentUser, onBack, showNotification, theme }) => {
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const isDark = theme === 'dark';
    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN' || currentUser?.role?.toUpperCase() === 'HEAD';

    // Form Modal states
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingDrug, setEditingDrug] = useState(null);
    const [drugForm, setDrugForm] = useState({
        drug_code: '',
        drug_name: '',
        drug_category: 'CHEMOTHERAPY',
        calculation_type: 'BSA',
        default_weight_type: 'ACTUAL',
        standard_dose_value: '',
        standard_dose_unit: '',
        max_dose_cap: '',
        max_bsa_cap: '',
        max_gfr_cap: '125',
        is_active: 1
    });

    const [deleteConfirmDrug, setDeleteConfirmDrug] = useState(null);

    useEffect(() => {
        fetchDrugs();
    }, []);

    const fetchDrugs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/drugs`);
            if (res.data.success) {
                setDrugs(res.data.drugs);
            }
        } catch (err) {
            console.error('Failed to fetch drugs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setEditingDrug(null);
        setDrugForm({
            drug_code: '',
            drug_name: '',
            drug_category: 'CHEMOTHERAPY',
            calculation_type: 'BSA',
            default_weight_type: 'ACTUAL',
            standard_dose_value: '',
            standard_dose_unit: 'mg/m2',
            max_dose_cap: '',
            max_bsa_cap: '',
            max_gfr_cap: '',
            is_active: 1
        });
        setShowFormModal(true);
    };

    const handleOpenEditModal = (drug) => {
        setEditingDrug(drug);
        setDrugForm({
            drug_code: drug.drug_code || '',
            drug_name: drug.drug_name || '',
            drug_category: drug.drug_category || 'CHEMOTHERAPY',
            calculation_type: drug.calculation_type || 'BSA',
            default_weight_type: drug.default_weight_type || 'ACTUAL',
            standard_dose_value: drug.standard_dose_value !== null && drug.standard_dose_value !== undefined ? drug.standard_dose_value.toString() : '',
            standard_dose_unit: drug.standard_dose_unit || '',
            max_dose_cap: drug.max_dose_cap !== null && drug.max_dose_cap !== undefined ? drug.max_dose_cap.toString() : '',
            max_bsa_cap: drug.max_bsa_cap !== null && drug.max_bsa_cap !== undefined ? drug.max_bsa_cap.toString() : '',
            max_gfr_cap: drug.max_gfr_cap !== null && drug.max_gfr_cap !== undefined ? drug.max_gfr_cap.toString() : '',
            is_active: drug.is_active !== undefined ? drug.is_active : 1
        });
        setShowFormModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!drugForm.drug_name.trim() || !drugForm.calculation_type) {
            if (showNotification) showNotification("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
            return;
        }

        const payload = {
            ...drugForm,
            drug_code: drugForm.drug_code.toUpperCase().trim() || null,
            drug_name: drugForm.drug_name.toUpperCase().trim(),
            standard_dose_value: drugForm.standard_dose_value === '' ? null : parseFloat(drugForm.standard_dose_value),
            max_dose_cap: drugForm.max_dose_cap === '' ? null : parseFloat(drugForm.max_dose_cap),
            max_bsa_cap: drugForm.max_bsa_cap === '' ? null : parseFloat(drugForm.max_bsa_cap),
            max_gfr_cap: drugForm.max_gfr_cap === '' ? null : parseInt(drugForm.max_gfr_cap, 10),
            is_active: parseInt(drugForm.is_active, 10)
        };

        try {
            if (editingDrug) {
                // Update
                const res = await axios.put(`${API_BASE}/admin/drugs/${editingDrug.drug_id}`, payload, {
                    headers: { 'x-employee-id': currentUser?.employee_id }
                });
                if (res.data.success) {
                    if (showNotification) showNotification("แก้ไขข้อมูลยาสำเร็จ", "success");
                    setShowFormModal(false);
                    fetchDrugs();
                }
            } else {
                // Create
                const res = await axios.post(`${API_BASE}/admin/drugs`, payload, {
                    headers: { 'x-employee-id': currentUser?.employee_id }
                });
                if (res.data.success) {
                    if (showNotification) showNotification("เพิ่มยารายการใหม่สำเร็จ", "success");
                    setShowFormModal(false);
                    fetchDrugs();
                }
            }
        } catch (err) {
            console.error("Save drug failed:", err);
            if (showNotification) showNotification(`ไม่สามารถบันทึกข้อมูลยาได้: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    const handleDeleteClick = (drug) => {
        setDeleteConfirmDrug(drug);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmDrug) return;
        try {
            const res = await axios.delete(`${API_BASE}/admin/drugs/${deleteConfirmDrug.drug_id}`, {
                headers: { 'x-employee-id': currentUser?.employee_id }
            });
            if (res.data.success) {
                if (showNotification) showNotification("ลบรายการยาสำเร็จ", "success");
                setDeleteConfirmDrug(null);
                fetchDrugs();
            }
        } catch (err) {
            console.error("Delete drug failed:", err);
            if (showNotification) showNotification(`ไม่สามารถลบข้อมูลยาได้: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    const filteredDrugs = drugs.filter(d => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            d.drug_code?.toLowerCase().includes(q) ||
            d.drug_name?.toLowerCase().includes(q) ||
            d.calculation_type?.toLowerCase().includes(q) ||
            d.standard_dose_unit?.toLowerCase().includes(q)
        );
    });

    const getCalcTypeLabel = (type) => {
        switch (type) {
            case 'BSA': return 'BSA';
            case 'CALVERT_FORMULA': return 'Calvert';
            case 'FIXED_DOSE': return 'Fixed Dose';
            case 'WEIGHT_BASED': return 'ตามน้ำหนัก';
            default: return type;
        }
    };

    const getCalcTypeColor = (type) => {
        switch (type) {
            case 'BSA': return isDark ? 'bg-sky-950/50 text-sky-400 border-sky-800/50' : 'bg-sky-50 text-sky-700 border-sky-200';
            case 'CALVERT_FORMULA': return isDark ? 'bg-amber-950/50 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-700 border-amber-200';
            case 'FIXED_DOSE': return isDark ? 'bg-purple-950/50 text-purple-400 border-purple-800/50' : 'bg-purple-50 text-purple-700 border-purple-200';
            case 'WEIGHT_BASED': return isDark ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getCategoryLabel = (cat) => {
        switch (cat) {
            case 'CHEMOTHERAPY': return '💊 ยาเคมีบำบัด';
            case 'TARGETED_THERAPY': return '🎯 ยามุ่งเป้า';
            case 'IMMUNOTHERAPY': return '🛡️ ภูมิคุ้มกันบำบัด';
            case 'SUPPORTIVE_CARE': return '🩺 ยาประคับประคอง';
            default: return cat || 'ยาเคมีบำบัด';
        }
    };

    const getCategoryColor = (cat) => {
        switch (cat) {
            case 'CHEMOTHERAPY': return isDark ? 'bg-rose-950/50 text-rose-400 border-rose-800/50' : 'bg-rose-50 text-rose-700 border-rose-200';
            case 'TARGETED_THERAPY': return isDark ? 'bg-amber-950/50 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-700 border-amber-200';
            case 'IMMUNOTHERAPY': return isDark ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SUPPORTIVE_CARE': return isDark ? 'bg-sky-950/50 text-sky-400 border-sky-800/50' : 'bg-sky-50 text-sky-700 border-sky-200';
            default: return isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getStatusBadge = (isActive) => {
        if (isActive === 1 || isActive === true || isActive === '1') {
            return (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${isDark ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                    เปิดใช้งาน
                </span>
            );
        }
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${isDark ? 'bg-red-950/50 text-red-400 border-red-800/50' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                ปิดใช้งาน
            </span>
        );
    };

    return (
        <div className="animate-row-in space-y-6">
            {/* Header */}
            <div className="w-full premium-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
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
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <Pill size={22} className="text-sky-500" />
                            ข้อมูลยาทั้งหมดในระบบ (Drug Information)
                        </h2>
                        <p className="text-xs opacity-70">รายการยาที่ใช้ในการคำนวณขนาดยาทั้งหมดในระบบ ดึงข้อมูลจากฐานข้อมูล</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-end">
                    <div className="relative flex-1 md:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อยา..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`pl-9 pr-4 py-2 rounded-xl text-sm font-bold border transition-all w-full md:w-[220px] ${isDark
                                ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500'
                                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 shadow-sm'
                                }`}
                        />
                    </div>
                    {isAdmin && (
                        <button
                            onClick={handleOpenAddModal}
                            className="btn-primary text-sm py-2 px-4 rounded-xl flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
                        >
                            <Plus size={16} /> เพิ่มยาใหม่
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`premium-card p-4 border-l-4 border-l-sky-500 flex items-center gap-4 transition-all hover:translate-y-[-2px]`}>
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-sky-950/40 text-sky-400' : 'bg-sky-100 text-sky-600'}`}>
                        <Pill size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider">ยาทั้งหมด</p>
                        <p className="text-2xl font-black">{drugs.length}</p>
                    </div>
                </div>
                <div className={`premium-card p-4 border-l-4 border-l-emerald-500 flex items-center gap-4 transition-all hover:translate-y-[-2px]`}>
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Activity size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider">เปิดใช้งาน</p>
                        <p className="text-2xl font-black">{drugs.filter(d => d.is_active === 1 || d.is_active === true || d.is_active === '1').length}</p>
                    </div>
                </div>
                <div className={`premium-card p-4 border-l-4 border-l-amber-500 flex items-center gap-4 transition-all hover:translate-y-[-2px]`}>
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-950/40 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                        <FlaskConical size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider">ประเภทการคำนวณ</p>
                        <p className="text-2xl font-black">{new Set(drugs.map(d => d.calculation_type)).size}</p>
                    </div>
                </div>
                <div className={`premium-card p-4 border-l-4 border-l-rose-500 flex items-center gap-4 transition-all hover:translate-y-[-2px]`}>
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-rose-950/40 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider">ยาที่มี Dose Cap</p>
                        <p className="text-2xl font-black">{drugs.filter(d => d.max_dose_cap !== null && d.max_dose_cap !== undefined).length}</p>
                    </div>
                </div>
            </div>

            {/* Drug Table */}
            <div className="premium-card overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="font-bold opacity-60">กำลังโหลดข้อมูลยา...</p>
                    </div>
                ) : filteredDrugs.length === 0 ? (
                    <div className="p-10 text-center opacity-60">
                        <Pill size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">ไม่พบข้อมูลยาที่ตรงกับการค้นหา</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className={`border-b ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[3%]">#</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[10%]">CODE</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[15%]">ชื่อยา</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[12%] text-center">กลุ่มยา</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[13%]">ประเภทการคำนวณ</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[10%]">ขนาดยามาตรฐาน</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[7%]">หน่วย</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[9%] text-center">Dose Cap</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black tracking-wider opacity-60 w-[9%] text-center">CrCl CAP</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[9%] text-center">น้ำหนักที่ใช้</th>
                                    <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[7%] text-center">สถานะ</th>
                                    {isAdmin && (
                                        <th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[8%] text-center">การจัดการ</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDrugs.map((drug, idx) => (
                                    <tr
                                        key={drug.drug_id}
                                        className={`border-b transition-colors ${isDark
                                            ? 'border-slate-700/30 hover:bg-slate-800/40'
                                            : 'border-slate-100 hover:bg-sky-50/50'
                                            }`}
                                    >
                                        <td className="px-2.5 py-3 font-mono text-xs opacity-50">{idx + 1}</td>
                                        <td className="px-2.5 py-3 font-bold text-xs text-sky-500 dark:text-sky-400">
                                            {drug.drug_code || <span className="opacity-45 font-normal italic">ไม่มีโค้ด</span>}
                                        </td>
                                        <td className="px-2.5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${drug.calculation_type === 'BSA' ? (isDark ? 'bg-sky-950/60 text-sky-400' : 'bg-sky-100 text-sky-600')
                                                    : drug.calculation_type === 'CALVERT_FORMULA' ? (isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-100 text-amber-600')
                                                        : drug.calculation_type === 'FIXED_DOSE' ? (isDark ? 'bg-purple-950/60 text-purple-400' : 'bg-purple-100 text-purple-600')
                                                            : (isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                                                    }`}>
                                                    <Pill size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-wide">{drug.drug_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2.5 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border whitespace-nowrap ${getCategoryColor(drug.drug_category)}`}>
                                                {getCategoryLabel(drug.drug_category)}
                                            </span>
                                        </td>
                                        <td className="px-2.5 py-3">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border whitespace-nowrap ${getCalcTypeColor(drug.calculation_type)}`}>
                                                {getCalcTypeLabel(drug.calculation_type)}
                                            </span>
                                        </td>
                                        <td className="px-2.5 py-3">
                                            <span className="font-black text-sm">
                                                {drug.standard_dose_value !== null ? parseFloat(drug.standard_dose_value).toFixed(2) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-2.5 py-3">
                                            <span className="font-bold text-xs opacity-70">{drug.standard_dose_unit || '-'}</span>
                                        </td>
                                        <td className="px-2.5 py-3 text-center">
                                            {drug.max_dose_cap !== null && drug.max_dose_cap !== undefined ? (
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-black border whitespace-nowrap ${isDark ? 'bg-rose-950/40 text-rose-400 border-rose-800/40' : 'bg-rose-50 text-rose-600 border-rose-200'
                                                    }`}>
                                                    {parseFloat(drug.max_dose_cap).toFixed(2)} mg
                                                </span>
                                            ) : (
                                                <span className="text-xs opacity-40 font-bold">ไม่มี</span>
                                            )}
                                        </td>
                                        <td className="px-2.5 py-3 text-center">
                                            {drug.max_gfr_cap !== null && drug.max_gfr_cap !== undefined ? (
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-black border whitespace-nowrap ${isDark ? 'bg-amber-950/40 text-amber-400 border-amber-800/40' : 'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                    {drug.max_gfr_cap} ml/min
                                                </span>
                                            ) : (
                                                <span className="text-xs opacity-40 font-bold">ไม่มี</span>
                                            )}
                                        </td>
                                        <td className="px-2.5 py-3 text-center">
                                            <span className="text-xs font-bold opacity-70">{drug.default_weight_type || '-'}</span>
                                        </td>
                                        <td className="px-2.5 py-3 text-center">
                                            {getStatusBadge(drug.is_active)}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-2.5 py-3 text-center">
                                                <div className="flex justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleOpenEditModal(drug)}
                                                        className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer ${isDark
                                                            ? 'bg-sky-950/30 hover:bg-sky-900/40 text-sky-400 hover:text-sky-300 border-sky-900/50'
                                                            : 'bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 border-sky-200 shadow-sm'
                                                            }`}
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(drug)}
                                                        className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer ${isDark
                                                            ? 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border-rose-900/50'
                                                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border-rose-200 shadow-sm'
                                                            }`}
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form Modal (Add / Edit) */}
            {showFormModal && (
                <div className="fixed inset-0 z-[999] overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="flex min-h-full items-start justify-center p-4 md:p-10">
                        <div className="premium-card p-6 md:p-8 w-full max-w-[75%] animate-pop relative border-sky-500/50">
                        <button
                            onClick={() => setShowFormModal(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="font-black text-lg mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-3">
                            <Pill size={18} className="text-sky-500 dark:text-sky-400" />
                            {editingDrug ? "แก้ไขข้อมูลยา" : "เพิ่มยารายการใหม่"}
                        </h3>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">CODE (Drug Code)</label>
                                    <input
                                        type="text"
                                        placeholder="ตัวอย่างเช่น H0201208"
                                        className="form-control text-sm uppercase"
                                        value={drugForm.drug_code}
                                        onChange={e => setDrugForm({ ...drugForm, drug_code: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">ชื่อยา (Generic / Trade Name) *</label>
                                    <input
                                        type="text"
                                        placeholder="ตัวอย่างเช่น CISPLATIN"
                                        className="form-control text-sm uppercase"
                                        value={drugForm.drug_name}
                                        onChange={e => setDrugForm({ ...drugForm, drug_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">กลุ่มยา *</label>
                                    <select
                                        className="form-control text-sm"
                                        value={drugForm.drug_category}
                                        onChange={e => setDrugForm({ ...drugForm, drug_category: e.target.value })}
                                        required
                                    >
                                        <option value="CHEMOTHERAPY">💊 ยาเคมีบำบัด (Chemotherapy)</option>
                                        <option value="TARGETED_THERAPY">🎯 ยามุ่งเป้า (Targeted Therapy)</option>
                                        <option value="IMMUNOTHERAPY">🛡️ ยากลุ่มภูมิคุ้มกันบำบัด (Immunotherapy)</option>
                                        <option value="SUPPORTIVE_CARE">🩺 ยาประคับประคอง (Supportive Care)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">ประเภทการคำนวณหลัก *</label>
                                    <select
                                        className="form-control text-sm"
                                        value={drugForm.calculation_type}
                                        onChange={e => setDrugForm({ ...drugForm, calculation_type: e.target.value })}
                                        required
                                    >
                                        <option value="BSA">BSA (คำนวณตามพื้นที่ผิวร่างกาย)</option>
                                        <option value="CALVERT_FORMULA">CALVERT_FORMULA (สำหรับ Carboplatin)</option>
                                        <option value="FIXED_DOSE">FIXED_DOSE (ขนาดยาคงที่)</option>
                                        <option value="WEIGHT_BASED">WEIGHT_BASED (คำนวณตามน้ำหนักตัว)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">ประเภทน้ำหนักแนะนำ</label>
                                    <select
                                        className="form-control text-sm"
                                        value={drugForm.default_weight_type}
                                        onChange={e => setDrugForm({ ...drugForm, default_weight_type: e.target.value })}
                                    >
                                        <option value="ACTUAL">Actual (น้ำหนักจริง)</option>
                                        <option value="IDEAL">Ideal (น้ำหนักในอุดมคติ)</option>
                                        <option value="ADJUSTED">Adjusted (น้ำหนักปรับปรุง)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">ขนาดยาเริ่มต้น (Standard Dose)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="เช่น 1.40, 30.00, 75.00"
                                        className="form-control text-sm"
                                        value={drugForm.standard_dose_value}
                                        onChange={e => setDrugForm({ ...drugForm, standard_dose_value: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">หน่วยขนาดยามาตรฐาน</label>
                                    <input
                                        type="text"
                                        placeholder="เช่น mg/m2, units, Target AUC"
                                        className="form-control text-sm"
                                        value={drugForm.standard_dose_unit}
                                        onChange={e => setDrugForm({ ...drugForm, standard_dose_unit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-2">
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">Dose Cap (mg)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="ไม่มี (เว้นว่างไว้)"
                                        className="form-control text-sm"
                                        value={drugForm.max_dose_cap}
                                        onChange={e => setDrugForm({ ...drugForm, max_dose_cap: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">Max BSA Cap (m²)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="ไม่มี (เว้นว่างไว้)"
                                        className="form-control text-sm"
                                        value={drugForm.max_bsa_cap}
                                        onChange={e => setDrugForm({ ...drugForm, max_bsa_cap: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black opacity-70 mb-1.5 ml-1">MAX CrCl CAP (ml/min)</label>
                                    <input
                                        type="number"
                                        placeholder="เช่น 125"
                                        className="form-control text-sm"
                                        value={drugForm.max_gfr_cap}
                                        onChange={e => setDrugForm({ ...drugForm, max_gfr_cap: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black opacity-70 mb-1.5 uppercase ml-1">สถานะใช้งาน</label>
                                <select
                                    className="form-control text-sm"
                                    value={drugForm.is_active}
                                    onChange={e => setDrugForm({ ...drugForm, is_active: e.target.value })}
                                >
                                    <option value={1}>เปิดการใช้งาน (Active)</option>
                                    <option value={0}>ปิดการใช้งาน (Inactive)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
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
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmDrug && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="premium-card p-6 md:p-8 w-full max-w-sm animate-pop relative border-rose-500/30">
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-3 text-rose-500">
                            <Trash2 size={18} />
                            ยืนยันการลบรายการยา
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            คุณแน่ใจหรือไม่ที่จะลบรายการยา <strong className="text-slate-200">{deleteConfirmDrug.drug_name}</strong> ออกจากระบบ? การกระทำนี้ไม่สามารถกู้คืนข้อมูลกลับมาได้
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmDrug(null)}
                                className={`w-1/2 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-95 cursor-pointer text-center ${isDark
                                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                    : 'border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm'
                                    }`}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-3 px-4 rounded-xl active:scale-95 cursor-pointer text-center transition-all shadow-md shadow-rose-900/10"
                            >
                                ยืนยันลบยา
                            </button>
                        </div>
                    </div>
                </div>
            )}



        </div>
    );
};

export default DrugsInfo;

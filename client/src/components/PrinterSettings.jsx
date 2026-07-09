import React, { useState, useEffect } from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
import axios from 'axios';
import qz from 'qz-tray';

const API_BASE = '/api';

const PrinterSettings = ({ user, setUser, show, onClose, showNotification }) => {
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState(user?.default_printer || '');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('ไม่ได้เชื่อมต่อ');

    useEffect(() => {
        if (show) {
            connectQZ();
        } else {
            if (qz.websocket.isActive()) {
                qz.websocket.disconnect();
            }
        }
    }, [show]);

    const connectQZ = async () => {
        setIsLoading(true);
        setStatus('กำลังเชื่อมต่อ QZ Tray...');
        try {
            if (!qz.websocket.isActive()) {
                await qz.websocket.connect({ retries: 2, delay: 1 });
            }
            setStatus('เชื่อมต่อสำเร็จ กำลังค้นหาเครื่องพิมพ์...');
            const foundPrinters = await qz.printers.find();
            setPrinters(foundPrinters);
            setStatus('ค้นหาเครื่องพิมพ์สำเร็จ');
            
            // If user has a default printer but it's not set in local state yet
            if (user?.default_printer) {
                setSelectedPrinter(user.default_printer);
            }
        } catch (err) {
            console.error('QZ Connection error', err);
            setStatus('ไม่สามารถเชื่อมต่อ QZ Tray ได้ โปรดตรวจสอบว่าโปรแกรมเปิดอยู่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const res = await axios.put(`${API_BASE}/users/${user.employee_id}/printer`, {
                default_printer: selectedPrinter
            });
            if (res.data.success) {
                const updatedUser = { ...user, default_printer: selectedPrinter };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                showNotification('บันทึกเครื่องพิมพ์เริ่มต้นเรียบร้อยแล้ว', 'success');
                onClose();
            }
        } catch (err) {
            showNotification('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8 relative shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <X size={24} />
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Printer size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">ตั้งค่าเครื่องพิมพ์ (Silent Print)</h2>
                        <p className="text-sm font-bold text-slate-500">เลือกเครื่องพิมพ์สติ๊กเกอร์เริ่มต้น</p>
                    </div>
                </div>

                <div className="mb-6 space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">สถานะ QZ Tray</div>
                        <div className={`font-bold ${status.includes('สำเร็จ') ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {status}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">เลือกเครื่องพิมพ์</label>
                        <select
                            value={selectedPrinter}
                            onChange={(e) => setSelectedPrinter(e.target.value)}
                            disabled={printers.length === 0}
                            className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 font-bold focus:border-sky-500 focus:ring-0 outline-none transition-all disabled:opacity-50"
                        >
                            <option value="">-- ไม่ระบุ (ใช้หน้าต่างพิมพ์ของเบราว์เซอร์) --</option>
                            {printers.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-8 py-3 rounded-xl font-black bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isLoading && <Loader2 size={18} className="animate-spin" />} บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrinterSettings;

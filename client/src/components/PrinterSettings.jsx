import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Printer, CheckCircle2, AlertCircle, Save } from 'lucide-react';

const PrinterSettings = ({ user, setUser, show, onClose, showNotification }) => {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('กำลังโหลดรายชื่อเครื่องปริ้นท์...');
    const [error, setError] = useState(null);

    // Selected printers
    const [stickerPrinter, setStickerPrinter] = useState('');
    const [a4Printer, setA4Printer] = useState('');

    useEffect(() => {
        if (show) {
            fetchPrinters();
            // Load saved settings
            const savedSticker = localStorage.getItem('sticker_printer');
            const savedA4 = localStorage.getItem('a4_printer');
            if (savedSticker) setStickerPrinter(savedSticker);
            if (savedA4) setA4Printer(savedA4);
        }
    }, [show]);

    const fetchPrinters = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/printers');
            setPrinters(res.data);
            setStatus('ดึงรายชื่อเครื่องปริ้นท์สำเร็จ');
        } catch (err) {
            console.error('Fetch printers error', err);
            setError('ไม่สามารถดึงรายชื่อเครื่องปริ้นท์ได้: ' + err.message);
            setStatus('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        localStorage.setItem('sticker_printer', stickerPrinter);
        localStorage.setItem('a4_printer', a4Printer);
        
        // Also save to user context for backward compatibility in App.jsx if needed
        const updatedUser = { ...user, default_printer: stickerPrinter, a4_printer: a4Printer };
        setUser(updatedUser);
        localStorage.setItem('oncology_user', JSON.stringify(updatedUser));
        
        showNotification('บันทึกการตั้งค่าเครื่องปริ้นท์เรียบร้อยแล้ว', 'success');
        onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-sky-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner">
                            <Printer size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">ตั้งค่าเครื่องพิมพ์ (Local Print Server)</h2>
                            <p className="text-sm font-medium text-slate-500">พิมพ์เอกสารอัตโนมัติ ไม่ต้องกด Confirm</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50/50">
                    {/* Status Box */}
                    <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        <div className="mt-0.5">
                            {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <div>
                            <div className="font-bold">{error ? 'เกิดข้อผิดพลาด' : 'สถานะระบบ'}</div>
                            <div className="text-sm opacity-90">{status}</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Sticker Printer Setting */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">เครื่องพิมพ์สติ๊กเกอร์ (Stickers)</h3>
                                    <p className="text-sm text-slate-500">สำหรับพิมพ์ฉลากยาขนาด 80x50mm</p>
                                </div>
                            </div>
                            
                            {loading ? (
                                <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                            ) : (
                                <select 
                                    value={stickerPrinter}
                                    onChange={(e) => setStickerPrinter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all"
                                >
                                    <option value="">-- ปิดระบบพิมพ์อัตโนมัติ (Manual Print) --</option>
                                    {printers.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* A4 Printer Setting */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">เครื่องพิมพ์เอกสาร (A4/A5)</h3>
                                    <p className="text-sm text-slate-500">สำหรับพิมพ์ใบเตรียมยาและใบสรุปผล</p>
                                </div>
                            </div>
                            
                            {loading ? (
                                <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                            ) : (
                                <select 
                                    value={a4Printer}
                                    onChange={(e) => setA4Printer(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all"
                                >
                                    <option value="">-- ปิดระบบพิมพ์อัตโนมัติ (Manual Print) --</option>
                                    {printers.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button 
                        onClick={fetchPrinters}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        disabled={loading}
                    >
                        รีเฟรชรายชื่อ
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2.5 rounded-xl font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/30 transition-colors flex items-center gap-2"
                    >
                        <Save size={18} /> บันทึกการตั้งค่า
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrinterSettings;

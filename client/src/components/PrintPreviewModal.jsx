import React from 'react';
import { X, Printer } from 'lucide-react';

const PrintPreviewModal = ({ isOpen, htmlContent, title, printerName, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-xl font-black text-slate-800">{title}</h2>
                    <button 
                        onClick={onCancel} 
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>
                
                {/* Preview Area - Simple and Readable */}
                <div 
                    className="flex-1 bg-slate-200 overflow-y-auto p-4 md:p-8"
                >
                    <div className="w-full max-w-[900px] mx-auto bg-white shadow-xl border border-slate-300 min-h-full">
                        {/* We use an iframe to render the raw HTML to prevent CSS conflicts */}
                        <iframe 
                            srcDoc={htmlContent} 
                            className="w-full h-[800px] border-0" 
                            title="Print Preview"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center bg-white gap-4">
                    <div className="text-sm text-slate-500">
                        เครื่องพิมพ์เป้าหมาย: <span className="font-bold text-sky-600 px-2 py-1 bg-sky-50 rounded-md">{printerName || 'ไม่มี (ระบบจะเปิดหน้าต่างเบราว์เซอร์แทน)'}</span>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={onCancel} 
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            onClick={onConfirm} 
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-colors flex items-center justify-center gap-2"
                        >
                            <Printer size={18} /> ยืนยันการพิมพ์
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;

import io

file_path = r'd:\patien-system\client\src\components\PrintPreviewModal.jsx'

new_content = """import React, { useRef, useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';

const PrintPreviewModal = ({ isOpen, htmlContent, title, printerName, paperSize = 'A4', onConfirm, onCancel }) => {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;
        
        const updateScale = () => {
            const container = containerRef.current;
            if (!container) return;
            
            const padding = 64; // padding around the paper
            const availableHeight = container.clientHeight - padding;
            const availableWidth = container.clientWidth - padding;
            
            // Dimensions in pixels (assuming 96dpi approx)
            const targetWidth = paperSize === 'A4' ? 794 : (paperSize === 'Sticker' ? 302 : 559);
            const targetHeight = paperSize === 'A4' ? 1123 : (paperSize === 'Sticker' ? 189 : 794);
            
            const scaleHeight = availableHeight / targetHeight;
            const scaleWidth = availableWidth / targetWidth;
            
            // We want it to fit perfectly within the container
            setScale(Math.min(scaleHeight, scaleWidth, 1));
        };

        // Initial scale calculation (with a slight delay to ensure DOM is ready)
        const timer = setTimeout(updateScale, 50);
        window.addEventListener('resize', updateScale);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateScale);
        };
    }, [isOpen, paperSize, htmlContent]);

    if (!isOpen) return null;

    // Physical dimensions for the wrapper
    const dimensions = {
        'A4': { width: '210mm', height: '297mm' },
        'A5': { width: '148mm', height: '210mm' },
        'Sticker': { width: '80mm', height: '50mm' }
    };
    
    const paper = dimensions[paperSize] || dimensions['A4'];

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
                
                {/* Preview Area (Scaled Paper) */}
                <div 
                    ref={containerRef}
                    className="flex-1 bg-slate-300 overflow-hidden relative flex items-center justify-center"
                    style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 0)', backgroundSize: '20px 20px' }}
                >
                    <div 
                        style={{ 
                            width: paper.width, 
                            height: paper.height, 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'center center',
                            transition: 'transform 0.15s ease-out'
                        }} 
                        className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex-shrink-0"
                    >
                        <iframe 
                            srcDoc={htmlContent} 
                            className="w-full h-full border-0" 
                            title="Print Preview"
                            scrolling="no"
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
"""

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated PrintPreviewModal successfully")

import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

const Notification = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration === 0) return;
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const icons = {
        success: <CheckCircle className="text-emerald-400" size={24} />,
        error: <XCircle className="text-red-400" size={24} />,
        warning: <AlertCircle className="text-amber-400" size={24} />,
        info: <Info className="text-sky-400" size={24} />
    };

    const bgColors = {
        success: 'bg-emerald-950/95 border-emerald-500/50',
        error: 'bg-red-950/95 border-red-500/50',
        warning: 'bg-amber-950/95 border-amber-500/50',
        info: 'bg-sky-950/95 border-sky-500/50'
    };

    return (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 p-5 md:p-6 rounded-3xl border-2 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-pop-center min-w-[320px] max-w-[90vw] ${bgColors[type] || bgColors.info}`}>
            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 shadow-inner">
                {icons[type] || icons.info}
            </div>
            <p className="text-lg font-black text-white leading-tight flex-1 text-center px-2 whitespace-pre-line">{message}</p>
            <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-slate-300 hover:text-white"
            >
                <X size={24} />
            </button>
        </div>
    );
};

export default Notification;

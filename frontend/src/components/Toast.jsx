import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onDismiss }) => {
  const { type, message } = toast;

  const configs = {
    info: { icon: Info, color: 'text-blue-600', border: 'border-l-blue-600', bg: 'bg-white' },
    success: { icon: CheckCircle2, color: 'text-emerald-600', border: 'border-l-emerald-600', bg: 'bg-white' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', border: 'border-l-amber-600', bg: 'bg-white' },
    error: { icon: AlertCircle, color: 'text-red-600', border: 'border-l-red-600', bg: 'bg-white' },
  };
  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={`pointer-events-auto min-w-[280px] max-w-sm p-4 rounded-2xl bg-white border border-slate-200 border-l-4 ${config.border} shadow-xl flex items-start gap-3 animate-[slide-in-right_0.3s_ease-out] relative overflow-hidden group`}>
      <Icon size={18} className={`${config.color} shrink-0 mt-0.5`} />
      <div className="flex-1 text-xs font-semibold text-slate-800 leading-relaxed">
        {message}
      </div>
      <button 
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

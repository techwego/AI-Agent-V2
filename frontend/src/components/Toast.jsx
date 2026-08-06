import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

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
    info: { icon: Info, color: 'text-blue-400', border: 'border-l-blue-500' },
    success: { icon: CheckCircle, color: 'text-green-400', border: 'border-l-green-500' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', border: 'border-l-amber-500' },
    error: { icon: AlertCircle, color: 'text-red-400', border: 'border-l-red-500' },
  };
  const config = configs[type] || configs.info;

  const Icon = config.icon;

  return (
    <div className={`glass-card pointer-events-auto min-w-[280px] max-w-sm p-4 rounded-lg border-l-4 ${config.border} shadow-lg flex items-start gap-3 animate-[slide-in-right_0.3s_ease-out] relative overflow-hidden group`}>
      <Icon size={20} className={`${config.color} shrink-0 mt-0.5`} />
      <div className="flex-1 text-sm text-gray-200">
        {message}
      </div>
      <button 
        onClick={onDismiss}
        className="text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X size={16} />
      </button>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-gray-500/20 w-full">
        <div className={`h-full ${config.color.replace('text-', 'bg-')} animate-[shrink_4s_linear_forwards]`} />
      </div>
    </div>
  );
};

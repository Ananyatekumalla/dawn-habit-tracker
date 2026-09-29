import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const show = useCallback((text) => {
    setMessage(text);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${visible ? 'show' : ''}`} role="status">
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

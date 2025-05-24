// UXUI/Components/ui/use-toast.jsx
import * as React from "react";

const ToastContext = React.createContext({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const toast = (toastData) => {
    setToasts((prev) => [...prev, { id: Date.now(), ...toastData }]);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
}

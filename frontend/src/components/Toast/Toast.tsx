import { useEffect, useRef, useState } from "react";

import "./Toast.css";

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function Toast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function handleToast(e: Event) {
      const custom = e as CustomEvent<ToastState>;
      setToast(custom.detail);

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setToast(null), 3000);
    }

    window.addEventListener("app:toast", handleToast);
    return () => window.removeEventListener("app:toast", handleToast);
  }, []);

  if (!toast) return null;

  return (
    <div className={`app-toast app-toast-${toast.type}`}>
      {toast.message}
    </div>
  );
}
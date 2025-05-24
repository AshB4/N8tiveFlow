// toast.jsx
import * as React from "react";
import {
  Toast as RadixToast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
} from "@radix-ui/react-toast";

// Styled Toast component (you can theme it however you want)
export const Toast = React.forwardRef(({ className, ...props }, ref) => (
  <RadixToast
    ref={ref}
    className={`bg-black text-white border border-pink-500 rounded-md p-4 shadow-md ${className}`}
    {...props}
  />
));

Toast.displayName = "Toast";

export { ToastTitle, ToastDescription, ToastClose, ToastViewport };

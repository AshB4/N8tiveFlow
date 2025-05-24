import * as React from "react";
import { ToastProvider as RadixToastProvider, ToastViewport } from "@radix-ui/react-toast";
import { ToastProvider as CustomToastProvider } from "./use-toast";

export function Toaster({ children }) {
  return (
    <RadixToastProvider>
      <CustomToastProvider>
        {children}
        <ToastViewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" />
      </CustomToastProvider>
    </RadixToastProvider>
  );
}

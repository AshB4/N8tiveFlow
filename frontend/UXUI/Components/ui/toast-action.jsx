import * as React from "react";
import { ToastAction as Action } from "@radix-ui/react-toast";

export function ToastAction({ altText, children, ...props }) {
  return (
    <Action
      altText={altText}
      className="text-pink-400 hover:text-white underline font-mono"
      {...props}
    >
      {children}
    </Action>
  );
}

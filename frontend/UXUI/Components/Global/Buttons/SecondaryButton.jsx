import { Button } from "@/components/ui/button";

export function OutlineButton({ label, onClick, ...props }) {
    return (
      <Button
        variant="outline"
        onClick={onClick}
        className="font-mono border-pink-500 text-pink-400 hover:bg-pink-900/10 hover:text-white animate-pulse"
        {...props}
      > 
        {label}
      </Button>
    );
  }
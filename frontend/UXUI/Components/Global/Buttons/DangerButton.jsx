import { Button } from "@/components/ui/button";
import { Toast } from "@/Components/ui/toast";

export function DangerButton({ label, onClick, ...props }) {
    return (
      <Button
        variant="destructive"
        onClick={onClick}
        className="font-mono shadow-md shadow-red-600/40"
        {...props}
      > 
        {label}
      </Button>
    );
  }
import { Button } from "@/components/ui/button";

export function GhostButton({ label, onClick, ...props }) {
    return (
      <Button
        variant="ghost"
        onClick={onClick}
        className="font-mono text-teal-300 hover:text-white"
        {...props}
      > 
        {label}
        {/* <GhostButton label="I’ll do it later" onClick={() => console.log("Liar.")} />
        <GhostButton label="Coming Soon" disabled /> */}
  
      </Button>
    );
  }
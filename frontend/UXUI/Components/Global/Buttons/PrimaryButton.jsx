import { Button } from "@/components/ui/button";

export function PrimaryButton({ label, onClick, ...props }) {
  return (
    <Button
      variant="default"
      onClick={onClick}
      className="bg-teal-500 text-black font-mono hover:bg-teal-400 shadow-md shadow-teal-400/40"
      {...props}
    >
      {label}
    </Button>
  );
}

import { DangerButton } from "@/Components/Global/Buttons/DangerButton";
import { useToast } from "@/Components/ui/use-toast";

export function DeletePostButton({ onConfirm, label = "Delete" }) {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: "⚠️ Danger Zone",
      description: "Deleting this is irreversible. Regret is forever.",
      action: {
        label: "Nuke It",
        onClick: onConfirm,
      },
    });

    toast({
      description: "Or click 'Changed My Mind' — we won’t judge you. Much.",
      action: {
        label: "Changed My Mind",
        onClick: () => console.log("Escape route triggered"),
      },
    });
  };

  return <DangerButton label={label} onClick={handleClick} />;
}

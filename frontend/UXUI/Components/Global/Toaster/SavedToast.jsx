import { showRandomToast } from "@/lib/toastMessages";
import { toast } from "react-hot-toast";

export default function SavedToast() {
  return (
    <button onClick={() => showRandomToast(toast)}>
      Show Toast
    </button>
  );
}

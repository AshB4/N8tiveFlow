import { useState } from "react";
import PostSelector from "./PostSelector";
import GearSelector from "./GearSelector";
import PlatformPreview from "./PlatformPreview";
import SchedulerPanel from "./SchedulerPanel";

export default function PostComposer() {
  const [selectedPost, setSelectedPost] = useState(null);
  const [attachedGear, setAttachedGear] = useState([]);
  const [scheduledTimes, setScheduledTimes] = useState({});

  const saveDraft = async () => {
    const entry = {
      postId: selectedPost?.id,
      body: selectedPost?.body,
      gear: attachedGear,
      schedule: scheduledTimes,
    };
    await fetch("/api/post-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">🧙 Ritual Drop Composer</h1>

      <PostSelector selectedPost={selectedPost} onSelect={setSelectedPost} />

      <GearSelector selectedGear={attachedGear} onChange={setAttachedGear} />

      <PlatformPreview post={selectedPost} gear={attachedGear} />

      <SchedulerPanel times={scheduledTimes} onChange={setScheduledTimes} />

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={saveDraft}
      >
        Save Draft
      </button>
    </div>
  );
}

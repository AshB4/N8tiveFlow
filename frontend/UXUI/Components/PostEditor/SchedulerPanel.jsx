export default function SchedulerPanel({ times, onChange }) {
  const platforms = ["x", "pinterest", "instagram", "kofi"];

  const update = (pl, value) => {
    onChange({ ...times, [pl]: value });
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">Schedule Drops</h3>
      {platforms.map((pl) => (
        <label key={pl} className="block mb-2">
          {pl.toUpperCase()}
          <input
            type="datetime-local"
            className="border p-1 ml-2"
            value={times[pl] || ""}
            onChange={(e) => update(pl, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

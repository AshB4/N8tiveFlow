import { useEffect, useState } from "react";

export default function GearSelector({ selectedGear, onChange }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/data/affiliate-items.json')
      .then(res => res.json())
      .then(setItems)
      .catch(() => {});
  }, []);

  const toggle = (id) => {
    const newSet = selectedGear.includes(id)
      ? selectedGear.filter(g => g !== id)
      : [...selectedGear, id];
    onChange(newSet);
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">Affiliate Gear</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <label key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedGear.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
            {item.title}
          </label>
        ))}
      </div>
    </div>
  );
}

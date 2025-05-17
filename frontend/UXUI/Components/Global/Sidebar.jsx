// 💠 Sidebar.jsx
import { useState } from "react";

const products = [
  "Green Square Ritual",
  "Terminal Tarot",
  "GhostSheet Tracker",
  "PromptStorm"
];

export function Sidebar() {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="w-64 border-r border-pink-500 p-4">
      <h2 className="text-lg font-bold mb-4 text-pink-500">PRODUCTS</h2>
      <input
        type="text"
        placeholder="Search products..."
        className="w-full p-2 mb-4 bg-black text-white border border-slate-600 rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="space-y-2">
        {filtered.map((prod, i) => (
          <li key={i} className="hover:text-sacred cursor-pointer">
            {prod}
          </li>
        ))}
      </ul>
    </aside>
  );
}
// 💠 Buttons.jsx
export function PrimaryButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-sacred text-white px-4 py-2 rounded hover:bg-blue-700 shadow"
    >
      {label}
    </button>
  );
}

export function DangerButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-800"
    >
      {label}
    </button>
  );
}
// 💠 Inputs.jsx
export function InputField({ label, name, value, onChange }) {
  return (
    <label className="block text-sm text-white mb-2">
      {label}
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-2 mt-1 bg-black text-white border border-slate-700 rounded"
      />
    </label>
  );
}

export function SelectField({ label, name, options, value, onChange }) {
  return (
    <label className="block text-sm text-white mb-2">
      {label}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-2 mt-1 bg-black text-white border border-slate-700 rounded"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

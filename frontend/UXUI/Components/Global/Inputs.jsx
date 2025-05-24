import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

// 🔹 Text Input Field
export function InputField({ label, name, value, onChange, placeholder }) {
  return (
    <div className="mb-4 w-full">
      <Label htmlFor={name} className="text-pink-500 font-mono text-sm mb-1 block">
        {label}
      </Label>
      <Input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "bg-black text-teal-300 border-pink-500 font-mono placeholder:text-slate-500",
          "focus-visible:ring-2 focus-visible:ring-teal-400"
        )}
      />
    </div>
  );
}

// 🔹 Select Dropdown Field
export function SelectField({ label, name, value, onChange, options }) {
  return (
    <div className="mb-4 w-full">
      <Label htmlFor={name} className="text-pink-500 font-mono text-sm mb-1 block">
        {label}
      </Label>
      <Select
        name={name}
        value={value}
        onChange={onChange}
        className={cn(
          "bg-black text-teal-300 border-pink-500 font-mono",
          "focus-visible:ring-2 focus-visible:ring-pink-500"
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    </div>
  );
}

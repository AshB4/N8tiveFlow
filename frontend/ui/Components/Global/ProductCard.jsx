// 💠 ProductCard.jsx
export default function ProductCard({ title, tagline, platform, image, onClick }) {
  return (
    <div
      className="bg-black border border-pink-500 rounded-lg p-4 cursor-pointer hover:border-sacred transition-all shadow-md"
      onClick={onClick}
    >
      <img
        src={image}
        alt={title}
        className="w-full h-40 object-cover rounded mb-3 border border-slate-700"
      />
      <h3 className="text-xl font-bold text-pink-500 mb-1 tracking-wide">{title}</h3>
      <p className="text-sm text-slate-300 mb-2">{tagline}</p>
      <span className="text-xs px-2 py-1 bg-sacred text-black rounded">
        {platform}
      </span>
    </div>
  );
}

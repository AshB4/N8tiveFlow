// UXUI/Components/SeoCheckButton.jsx
const SeoCheckButton = ({ slug, onResult }) => {
  const handleCheck = async () => {
    const res = await fetch(`/api/check-seo?slug=${slug}`);
    const data = await res.json();
    onResult(data);
  };

  return (
    <button
      onClick={handleCheck}
      className="bg-pink-600 text-black font-bold px-4 py-2 rounded shadow-md hover:bg-pink-400"
    >
      🔍 Run SEO Check
    </button>
  );
};

export default SeoCheckButton;

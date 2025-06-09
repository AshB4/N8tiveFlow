export default function PlatformPreview({ post, gear }) {
  if (!post) return null;
  const platforms = ["x", "pinterest", "instagram", "kofi"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {platforms.map((pl) => (
        <div key={pl} className="border rounded p-2">
          <div className="font-bold mb-1">{pl.toUpperCase()}</div>
          <p className="text-sm">
            {post.variants?.[pl] || post.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/** @format */

import { useState, useEffect } from "react";
import { postToAllPlatforms } from "../scripts/postToAllPlatforms";
import seoVault from "../../../posts/seoVault.json";

const availablePlatforms = [
  "x",
  "facebook",
  "linkedin",
  "pinterest",
  "reddit",
  "tumblr",
  "onlyfans",
  "kofi",
  "discord",
  "devto",
  "hashnode",
  "producthunt",
  "amazon"
];

const getSeoDataForProduct = (productName) => {
  return seoVault[productName] || null;
};

const PostComposer = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState(null);
  const [altText, setAltText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");

  const [useAutoHashtags, setUseAutoHashtags] = useState(true);
  const [manualHashtags, setManualHashtags] = useState("");

  const [useAutoPlatformText, setUseAutoPlatformText] = useState(true);
  const [customText, setCustomText] = useState({});

  useEffect(() => {
    if (selectedProduct) {
      const seo = getSeoDataForProduct(selectedProduct);
      if (seo) {
        setTitle(seo.seo_human_pitch || "");
        setBody(seo.meta_description || "");
        setAltText(seo.alt_text_examples?.[0] || "");
        if (!useAutoHashtags && seo.hashtags?.All) {
          setManualHashtags(seo.hashtags.All.join(" "));
        }
      }
    }
  }, [selectedProduct]);

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async () => {
    const postPayload = {
      title,
      body,
      image,
      platforms: selectedPlatforms,
      scheduledAt,
      saveAsDraft,
      hashtags: useAutoHashtags ? null : manualHashtags,
      platformOverrides: useAutoPlatformText ? null : customText,
      altText
    };

    console.log("POSTING:", postPayload);
    const results = await postToAllPlatforms(postPayload, postPayload.platforms);
    console.log("Batch Post Results:", results);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Post Composer</h1>

      <label className="block mb-2">
        Select Product:
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="block p-2 border w-full mb-4"
        >
          <option value="">-- Choose One --</option>
          {Object.keys(seoVault).map((product) => (
            <option key={product} value={product}>
              {product}
            </option>
          ))}
        </select>
      </label>

      <input
        type="text"
        placeholder="Title"
        className="w-full p-2 border mb-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Write your post here..."
        className="w-full p-2 border mb-2 min-h-[100px]"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <label className="block mb-2">
        Upload Image:
        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
          className="block"
        />
      </label>

      <div className="mb-2">
        Alt Text:
        <input
          type="text"
          className="w-full p-2 border"
          placeholder="Image alt text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
        />
      </div>

      {body.length > 280 && selectedPlatforms.includes("x") && (
        <p className="text-yellow-600 font-bold">⚠️ Too long for X (limit: 280 characters)</p>
      )}

      {!image && selectedPlatforms.includes("pinterest") && (
        <p className="text-yellow-600 font-bold">⚠️ Pinterest requires an image</p>
      )}

      {!altText && image && (
        <button
          className="bg-purple-500 text-white px-3 py-1 rounded"
          onClick={() => setAltText("Generated alt text goes here...")}
        >
          🪄 Generate Alt Text
        </button>
      )}

      <div className="mb-4">
        <strong>Platforms:</strong>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          {availablePlatforms.map((p) => (
            <label key={p} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(p)}
                onChange={() => togglePlatform(p)}
                className="mr-2"
              />
              {p.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label>
          <input
            type="checkbox"
            checked={useAutoHashtags}
            onChange={() => setUseAutoHashtags(!useAutoHashtags)}
            className="mr-2"
          />
          Auto-generate hashtags
        </label>
        {!useAutoHashtags && (
          <textarea
            placeholder="#hashtag1 #hashtag2"
            className="w-full p-2 border mt-2"
            value={manualHashtags}
            onChange={(e) => setManualHashtags(e.target.value)}
          />
        )}
      </div>

      <div className="mb-4">
        <label>
          <input
            type="checkbox"
            checked={useAutoPlatformText}
            onChange={() => setUseAutoPlatformText(!useAutoPlatformText)}
            className="mr-2"
          />
          Auto-rewrite post for each platform
        </label>
        {!useAutoPlatformText && (
          <div className="grid grid-cols-1 gap-2 mt-2">
            {selectedPlatforms.map((platform) => (
              <div key={platform}>
                <label className="block font-medium mb-1">
                  {platform.toUpperCase()} Version:
                </label>
                <textarea
                  value={customText[platform] || ""}
                  onChange={(e) =>
                    setCustomText({
                      ...customText,
                      [platform]: e.target.value
                    })
                  }
                  className="w-full p-2 border"
                  placeholder={`Write custom text for ${platform}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="block mb-4">
        Schedule Post:
        <input
          type="datetime-local"
          value={scheduledAt || ""}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="block p-2 border"
        />
      </label>

      <label className="block mb-4">
        <input
          type="checkbox"
          checked={saveAsDraft}
          onChange={() => setSaveAsDraft(!saveAsDraft)}
          className="mr-2"
        />
        Save as Draft
      </label>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleSubmit}
      >
        Post It
      </button>
    </div>
  );
};

export default PostComposer;
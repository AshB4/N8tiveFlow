// | Platform  | Recommended Size           | Notes                                      |
// | --------- | -------------------------- | ------------------------------------------ |
// | Instagram | 1080x1080 (square)         | 1080x1350 (portrait), 1080x566 (landscape) |
// | Twitter/X | 1200x675 (16:9 landscape)  | Shows best at 2:1 or 16:9                  |
// | Pinterest | 1000x1500 (vertical)       | Tall pins perform best                     |
// | Facebook  | 1200x630 (shared images)   | Landscape; stories are vertical            |
// | LinkedIn  | 1200x627 (posts)           | Landscape                                  |
// | TikTok    | 1080x1920 (vertical video) | Still images possible as covers            |
// | Threads   | Similar to X/Twitter       |                                            |
// Add More

// Forgetting about compression: Some sites compress images. Show users a warning if their image is likely to look bad after upload.
// Wrong aspect ratio: Don’t just resize, crop to avoid squished photos.
// Alt text field: Don’t forget accessibility!

// Naming: Save with unique platform-friendly names (theimg4X, theimg4insta, etc).

export default function VisualsTab() {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold text-white mb-4">Visuals: Multi-Platform Image Prep</h2>
        <div className="mb-6 bg-[#23272a] p-6 rounded-xl shadow flex flex-col items-center">
          <label className="block text-gray-300 mb-2">Upload Master Image</label>
          <input type="file" accept="image/*" className="bg-[#181a1b] rounded p-2 text-white" />
        </div>
        <div className="grid grid-cols-3 gap-8">
          {/* Example: Instagram */}
          <div className="bg-[#23272a] rounded-xl shadow-lg p-4 flex flex-col items-center">
            <span className="text-[#604ae6] font-bold mb-2">Instagram (1080x1080)</span>
            {/* Image Preview Component Here */}
            <img src="theimg4insta.jpg" alt="Preview for Instagram" className="rounded shadow mb-2 w-[200px] h-[200px] object-cover" />
            <button className="bg-[#2ea043] text-white rounded-full px-4 py-1 mb-2">Approve</button>
            <textarea className="bg-[#181a1b] text-gray-100 rounded w-full p-2" placeholder="Instagram caption..."/>
          </div>
          {/* Example: Twitter/X */}
          <div className="bg-[#23272a] rounded-xl shadow-lg p-4 flex flex-col items-center">
            <span className="text-[#2ea043] font-bold mb-2">X / Twitter (1200x675)</span>
            {/* Image Preview Component Here */}
            <img src="theimg4x.png" alt="Preview for Twitter" className="rounded shadow mb-2 w-[200px] h-[112px] object-cover" />
            <button className="bg-[#604ae6] text-white rounded-full px-4 py-1 mb-2">Approve</button>
            <textarea className="bg-[#181a1b] text-gray-100 rounded w-full p-2" placeholder="X caption..."/>
          </div>
          {/* Add more for Pinterest, LinkedIn, etc. */}
        </div>
      </div>
    );
  }
  
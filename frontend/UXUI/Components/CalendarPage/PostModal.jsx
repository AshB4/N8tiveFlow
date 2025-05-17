// File: UXUI/Components/CalendarPage/PostModal.jsx
import React from "react";

const PostModal = ({ post, onClose }) => {
  if (!post) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
      <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-md border border-pink-500">
        <h2 className="text-xl font-bold text-teal-300 mb-4">{post.title}</h2>
        <p className="text-sm text-pink-300 mb-2">Platform: {post.platform}</p>
        <p className="text-sm text-teal-200 mb-4">Status: {post.status}</p>
        <div className="text-sm mb-4">{post.body || "No post body available."}</div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="bg-pink-600 text-black px-4 py-2 rounded hover:bg-pink-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostModal;

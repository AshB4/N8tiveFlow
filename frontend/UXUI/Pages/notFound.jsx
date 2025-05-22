import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-pink-500 font-mono flex flex-col items-center justify-center">
      <h1 className="text-4xl mb-4">🚫 404 – Lost in the Feed</h1>
      <p className="mb-4 text-teal-300">No page found. Even the Guilt Daemon can't help here.</p>
      <Link to="/" className="bg-pink-500 px-4 py-2 rounded hover:bg-pink-400 text-black">
        Go Home
      </Link>
    </div>
  );
}

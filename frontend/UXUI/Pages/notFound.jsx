import React from "react";
import { Link, useLocation, useNavigate, useRouteError } from "react-router-dom";
import gremlin from "../../assets/ErrorGremlin.png";

export default function ErrorPage() {
  const error = useRouteError();
  const statusCode = error?.status || 404;
  const navigate = useNavigate();
  const location = useLocation();
  const isTodayMiss = location.pathname.startsWith("/today");
  const message = isTodayMiss
    ? "Nothing scheduled today, slacker. Go queue something worth posting."
    : "No page found. Even the Guilt Daemon can't help here.";

  return (
    <div className="min-h-screen bg-black text-pink-500 font-mono flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl mb-2">🚫 Lost in the Feed 🚫</h1>
      <h2 className="text-2xl mb-4">Error Code: {statusCode}</h2>

      <img
        src={gremlin}
        alt="Error Gremlin"
        className="mx-auto max-w-md mb-6"
      />

      <p className="mb-6 text-teal-300">{message}</p>

      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          to="/"
          className="bg-pink-500 px-4 py-2 rounded hover:bg-pink-400 text-black transition-colors"
        >
          Teleport Home
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="border border-teal-500 px-4 py-2 rounded text-teal-300 hover:bg-teal-500 hover:text-black transition-colors"
        >
          Backtrack
        </button>
      </div>
    </div>
  );
}

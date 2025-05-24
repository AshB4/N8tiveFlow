import React from "react";
import { Link, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const statusCode = error?.status || 404;

  return (
    <div className="min-h-screen bg-black text-pink-500 font-mono flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl mb-2">🚫 Lost in the Feed 🚫</h1>
      <h2 className="text-2xl mb-4">Error Code: {statusCode}</h2>

      <img
        src="/assets/ErrorGremlin.png"
        alt="Error Gremlin"
        className="mx-auto max-w-md mb-6"
      />

      <p className="mb-6 text-teal-300">
        No page found. Even the Guilt Daemon can't help here.
      </p>

      <Link
        to="/"
        className="bg-pink-500 px-4 py-2 rounded hover:bg-pink-400 text-black"
      >
        Go Home
      </Link>
    </div>
  );
}

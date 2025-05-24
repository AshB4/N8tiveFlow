// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import { Toaster } from "@/Components/ui/toaster";

// Pages
import CalendarPage from "./UXUI/Pages/PostCalendar";
import PostComposer from "./UXUI/Pages/postComposer";
import ErrorPage from "./UXUI/Pages/notFound"; // This can now use useRouteError()

const router = createBrowserRouter([
  {
    path: "/",
    element: <CalendarPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/compose",
    element: <PostComposer />,
    errorElement: <ErrorPage />,
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Toaster>
      <RouterProvider router={router} />
    </Toaster>
  </React.StrictMode>
);

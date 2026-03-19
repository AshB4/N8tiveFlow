// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import { Toaster } from "@/Components/ui/toaster";

// Pages
import CalendarPage from "./UXUI/Pages/PostCalendar";
import PostComposer from "./UXUI/Pages/postComposer";
import PostLab from "./UXUI/Pages/PostLab";
import PostLib from "./UXUI/Pages/PostLib";
import TodayQueue from "./UXUI/Pages/TodayQueue";
import ChartsPage from "./UXUI/Pages/ChartsPage";
import ArchivePage from "./UXUI/Pages/ArchivePage";
import BatchPage from "./UXUI/Pages/BatchPage";
import AffiliateEnginePage from "./UXUI/Pages/AffiliateEnginePage";
import SeoPages from "./UXUI/Pages/SeoPages";
import SetupPage from "./UXUI/Pages/SetupPage";
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
    path: "/lab",
    element: <PostLab />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/lib",
    element: <PostLib />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/batch",
    element: <BatchPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/affiliate",
    element: <AffiliateEnginePage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/today",
    element: <TodayQueue />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/today/*",
    element: <TodayQueue />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/charts",
    element: <ChartsPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/archive",
    element: <ArchivePage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/setup",
    element: <SetupPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/pseo",
    element: <SeoPages />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/pseo/:slug",
    element: <SeoPages />,
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

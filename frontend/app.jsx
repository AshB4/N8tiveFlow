import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import CalendarPage from "./ui/Pages/PostCalendar";
import PostComposer from "./ui/Pages/postComposer";
import NotFound from "./ui/Pages/notFound";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/compose" element={<PostComposer />} />
        <Route path="*" element={<NotFound />} errorElement={<ErrorPage />}
/>
      </Routes>
    </Router>
  );
}

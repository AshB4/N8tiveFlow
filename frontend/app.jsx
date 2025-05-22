import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import CalendarPage from "./Components/CalendarPage/CalendarPage";
import PostComposer from "./Pages/Products/PostComposer"; // adjust if needed
import NotFound from "./Pages/NotFound"; // Optional fallback

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/compose" element={<PostComposer />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

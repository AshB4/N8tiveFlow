import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import CalendarPage from "./UXUI/Pages/PostCalendar";
import PostComposer from "./UXUI/Pages/PostComposer";
import NotFound from "./UXUI/Pages/NotFound";

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

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';

// Pages
import CalendarPage from "./UXUI/Pages/PostCalendar";
import PostComposer from "./UXUI/Pages/postComposer";
import NotFound from "./UXUI/Pages/notFound";

export default function App() {
  return (
    <Router>
      <Routes>
      
        <Route path="/" element={<CalendarPage />} />
        <Route path="/compose" element={<PostComposer />} />
        <Route path="*" element={<NotFound />} 
/>
      </Routes>
    </Router>
  );
}

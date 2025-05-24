import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';
import { Toaster } from "@/Components/ui/toaster";

// Pages
import CalendarPage from "./UXUI/Pages/PostCalendar";
import PostComposer from "./UXUI/Pages/postComposer";
import NotFound from "./UXUI/Pages/notFound";

export default function App() {
  return (
    <Toaster>
    <Router>
      
      {/* Main Application Routes */}
      <Routes>
      
        <Route path="/" element={<CalendarPage />} />
        <Route path="/compose" element={<PostComposer />} />
        <Route path="*" element={<NotFound />} 
/>
      </Routes>
    </Router>
    </Toaster>
  );
}

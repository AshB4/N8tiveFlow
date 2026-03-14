import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';
import { Toaster } from "@/Components/ui/toaster";

// Pages
import CalendarPage from "./UXUI/Pages/PostCalendar";
import PostComposer from "./UXUI/Pages/postComposer";
import PostLab from "./UXUI/Pages/PostLab";
import PostLib from "./UXUI/Pages/PostLib.jsx";
import ChartsPage from "./UXUI/Pages/ChartsPage";
import SeoPages from "./UXUI/Pages/SeoPages";
import NotFound from "./UXUI/Pages/notFound";

export default function App() {
  return (
    <Toaster>
    <Router>
      
      {/* Main Application Routes */}
      <Routes>
      
        <Route path="/" element={<CalendarPage />} />
        <Route path="/compose" element={<PostComposer />} />
        <Route path="/lab" element={<PostLab />} />
        <Route path="/lib" element={<PostLib />} />
        <Route path="/charts" element={<ChartsPage />} />
        <Route path="/pseo" element={<SeoPages />} />
        <Route path="/pseo/:slug" element={<SeoPages />} />
        <Route path="*" element={<NotFound />} 
/>
      </Routes>
    </Router>
    </Toaster>
  );
}

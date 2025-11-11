import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import Sandbox from "./pages/Sandbox";
import LearningPhase from "./pages/LearningPhase";
import SimulationPhase from "./pages/SimulationPhase";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Sandbox />} />
        <Route path="/learning" element={<LearningPhase />} />
        <Route path="/simulation" element={<SimulationPhase />} />
      </Routes>
    </Router>
  );
}

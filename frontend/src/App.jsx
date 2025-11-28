import React from "react";
import { Routes, Route } from "react-router-dom";

import Construction from "./pages/Construction.jsx";
import LearningPhase from "./pages/LearningPhase";
import SimulationPhase from "./components/SimulationPhase";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Construction />} />
      <Route path="/learning" element={<LearningPhase />} />
      <Route path="/simulation" element={<SimulationPhase />} />
    </Routes>
  );
}

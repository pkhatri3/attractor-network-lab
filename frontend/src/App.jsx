import React from "react";
import { Routes, Route } from "react-router-dom";

import Construction from "./pages/Construction.jsx";
import LearningPhase from "./pages/LearningPhase";
import SimulationPhase from "./components/SimulationPhase";
import LoadingScreen from "./components/LoadingScreen";
import { useCallback, useState } from "react";

export default function App() {
  const [backendReady, setBackendReady] = useState(false);
  const markBackendReady = useCallback(() => setBackendReady(true), []);

  if (!backendReady) {
    return <LoadingScreen onReady={markBackendReady} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Construction />} />
      <Route path="/learning" element={<LearningPhase />} />
      <Route path="/simulation" element={<SimulationPhase />} />
    </Routes>
  );
}

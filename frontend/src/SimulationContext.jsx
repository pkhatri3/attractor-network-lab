import React, { createContext, useState, useEffect, useContext } from "react";
import { GraphContext } from "./GraphContext";
import { LearningContext } from "./LearningContext";

export const SimulationContext = createContext();

export function SimulationProvider({ children }) {
  const { graphVersion } = useContext(GraphContext);
  const { learningRunVersion } = useContext(LearningContext);

  // === Core simulation state ===
  const [Atext, setAtext] = useState("");
  const [Avec, setAvec] = useState([]);
  const [AHist, setAHist] = useState([]);
  const [energyHist, setEnergyHist] = useState([]);
  const [iter, setIter] = useState(0);
  const [capacityResults, setCapacityResults] = useState([]);
  const [capacityNoiseLevel, setCapacityNoiseLevel] = useState(0);
  const [capacityIterations, setCapacityIterations] = useState(5);
  const [capacityErrorTolerance, setCapacityErrorTolerance] = useState(0);
  const [simulationNoiseLevel, setSimulationNoiseLevel] = useState(0);
  const [capacityTestActive, setCapacityTestActive] = useState(false);
  const [initialA, setInitialA] = useState(null);
  const [inputMode, setInputMode] = useState("matrix");
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState(null);
  const [layoutChoice, setLayoutChoice] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const [simulationMode, setSimulationMode] = useState("activation");

  // reset whenever upstream contexts change
  useEffect(() => {
    console.log("simulation context reset due to upstream change", {
      graphVersion,
      learningRunVersion,
    });

    setAtext("");
    setAvec([]);
    setAHist([]);
    setEnergyHist([]);
    setIter(0);
    setCapacityResults([]);
    setCapacityNoiseLevel(0);
    setCapacityErrorTolerance(0);
    setSimulationNoiseLevel(0);
    setCapacityTestActive(false);
    setInitialA(null);
    setInputMode("matrix");
    setIsSimulating(false);
    setError(null);
    setLayoutChoice(null);
    setHasRun(false);
    setSimulationMode("activation");
  }, [graphVersion, learningRunVersion]);

  return (
    <SimulationContext.Provider
      value={{
        Atext, setAtext,
        Avec, setAvec,
        AHist, setAHist,
        energyHist, setEnergyHist,
        iter, setIter,
        capacityResults, setCapacityResults,
        capacityNoiseLevel, setCapacityNoiseLevel,
        capacityIterations, setCapacityIterations,
        capacityErrorTolerance, setCapacityErrorTolerance,
        simulationNoiseLevel, setSimulationNoiseLevel,
        capacityTestActive, setCapacityTestActive,
        initialA, setInitialA,
        inputMode, setInputMode,
        isSimulating, setIsSimulating,
        error, setError,
        layoutChoice, setLayoutChoice,
        hasRun, setHasRun,
        simulationMode, setSimulationMode,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

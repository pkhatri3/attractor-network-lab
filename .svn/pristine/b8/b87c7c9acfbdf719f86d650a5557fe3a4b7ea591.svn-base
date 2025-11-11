import React, { createContext, useState, useEffect, useContext } from "react";
import { GraphContext } from "./GraphContext";

export const LearningContext = createContext();

export function LearningProvider({ children }) {
  const [WHist, setWHist] = useState([]);
  const [memories, setMemories] = useState([]);
  const [rule, setRule] = useState("standard");
  const [learningRate, setLearningRate] = useState(0.25);
  const [scale, setScale] = useState(1.0);
  const [learningComplete, setLearningComplete] = useState(false);
  const [layoutChoice, setLayoutChoice] = useState(null);
  const [memList, setMemList] = useState([]);
  const [learningRunVersion, setLearningRunVersion] = useState(0);
  const [learningColorScheme, setLearningColorScheme] = useState(
    () => localStorage.getItem("nme:cmap") || "blueWhiteRed"
  );
  const [networkId, setNetworkId] = useState(null);
  useEffect(() => {
    localStorage.setItem("nme:cmap", learningColorScheme);
  }, [learningColorScheme]);

  const { graphVersion } = useContext(GraphContext);
  

  // reset when graph changes
  useEffect(() => {
    setWHist([]);
    setMemories([]);
    setMemList([]);
    setLearningComplete(false);
    setLearningRunVersion(0);
    setLearningColorScheme("blueWhiteRed");
  }, [graphVersion]);

  const markLearningRun = () => setLearningRunVersion(v => v + 1);

  return (
    <LearningContext.Provider
      value={{
        WHist, setWHist,
        memories, setMemories,
        rule, setRule,
        learningRate, setLearningRate,
        scale, setScale,
        layoutChoice, setLayoutChoice,
        memList, setMemList,
        learningComplete, setLearningComplete,
        learningRunVersion, markLearningRun,
        learningColorScheme, setLearningColorScheme,
        learningColorScheme, setLearningColorScheme,
        networkId, setNetworkId,
      }}
    >
      {children}
    </LearningContext.Provider>
  );
}

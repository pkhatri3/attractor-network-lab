import React, { createContext, useState } from "react";

export const GraphContext = createContext();

export function GraphProvider({ children }) {
  const [network, setNetwork] = useState(null);
  const [graphVersion, setGraphVersion] = useState(0);
  const [learningVersion, setLearningVersion] = useState(0);
  const [customTemplates, setCustomTemplates] = useState([]);

  const commitGraph = (serializedGraph) => {
    // only increment if the graph actually changed
    const serialized = JSON.stringify(serializedGraph);
    const prevSerialized = JSON.stringify(network);

    if (prevSerialized !== serialized) {
      setNetwork(serializedGraph);
      setGraphVersion(v => v + 1);
      setLearningVersion(v => v + 1);
    } else {
      // graph identical so just reuse existing network
      setNetwork(serializedGraph);
    }
  };

  const markLearningRestart = () => setLearningVersion(v => v + 1);

  return (
    <GraphContext.Provider
      value={{
        network,
        commitGraph,
        graphVersion,
        learningVersion,
        markLearningRestart,
        customTemplates,
        setCustomTemplates,
      }}
    >
      {children}
    </GraphContext.Provider>
  );
}

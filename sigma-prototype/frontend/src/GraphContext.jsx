import React, { createContext, useState } from "react";

// Context to share network b/w pages
export const GraphContext = createContext();

export function GraphProvider({ children }) {
  const [network, setNetwork] = useState(null);

  return (
    <GraphContext.Provider value={{ network, setNetwork }}>
      {children}
    </GraphContext.Provider>
  );
}

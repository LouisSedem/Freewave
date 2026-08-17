"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type View = "home" | "search" | "library";

interface ViewContextType {
  view: View;
  setView: (view: View) => void;
}

const ViewContext = createContext<ViewContextType>({
  view: "home",
  setView: () => {},
});

export function useView() {
  return useContext(ViewContext);
}

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>("home");
  return (
    <ViewContext.Provider value={{ view, setView }}>
      {children}
    </ViewContext.Provider>
  );
}

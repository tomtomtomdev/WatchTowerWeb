"use client";

import { useContext } from "react";
import { SelectionContext } from "@/components/bulk/selection-provider";

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}

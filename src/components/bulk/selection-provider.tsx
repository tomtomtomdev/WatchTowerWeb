"use client";

import { createContext, useState, useCallback, type ReactNode } from "react";

interface SelectionContextType {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleWithShift: (id: string, allIds: string[], shiftKey: boolean) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const SelectionContext = createContext<SelectionContextType | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastSelected(id);
  }, []);

  const toggleWithShift = useCallback(
    (id: string, allIds: string[], shiftKey: boolean) => {
      if (shiftKey && lastSelected) {
        const startIdx = allIds.indexOf(lastSelected);
        const endIdx = allIds.indexOf(id);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          setSelected((prev) => {
            const next = new Set(prev);
            for (let i = from; i <= to; i++) {
              next.add(allIds[i]);
            }
            return next;
          });
          setLastSelected(id);
          return;
        }
      }
      toggle(id);
    },
    [lastSelected, toggle]
  );

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return (
    <SelectionContext.Provider
      value={{ selected, toggle, toggleWithShift, selectAll, clearSelection, isSelected }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { clamp } from "../utils/math";

type SelectionSubmenu = "Effects" | "InsertIntoMultitrack";

export interface WaveformSelection {
  startPercent: number;
  endPercent: number;
}

const minSelectionWidthPercent = 0.75;

export function createWaveformSelection(
  anchorPercent: number,
  focusPercent: number,
): WaveformSelection | null {
  const startPercent = clamp(Math.min(anchorPercent, focusPercent), 0, 100);
  const endPercent = clamp(Math.max(anchorPercent, focusPercent), 0, 100);

  if (endPercent - startPercent < minSelectionWidthPercent) {
    return null;
  }

  return { startPercent, endPercent };
}

export function useWaveformSelection() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [playheadPercent, setPlayheadPercent] = useState(52);
  const [selection, setSelection] = useState<WaveformSelection | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SelectionSubmenu | null>(null);
  const [collapsedSubmenu, setCollapsedSubmenu] = useState<SelectionSubmenu | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);

  function contentPercentFromPointer(event: MouseEvent | React.MouseEvent<HTMLElement>) {
    const rect = contentRef.current?.getBoundingClientRect();

    if (!rect) {
      return playheadPercent;
    }

    return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  function startPlayheadDrag(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setPlayheadPercent(contentPercentFromPointer(event));

    function handleMove(moveEvent: MouseEvent) {
      setPlayheadPercent(contentPercentFromPointer(moveEvent));
    }

    function stopDrag() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  function startSelectionDrag(event: React.MouseEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    setSelectionMenu(null);
    setActiveSubmenu(null);
    setCollapsedSubmenu(null);

    const anchorPercent = contentPercentFromPointer(event);
    setSelection(null);

    function handleMove(moveEvent: MouseEvent) {
      setSelection(createWaveformSelection(anchorPercent, contentPercentFromPointer(moveEvent)));
    }

    function stopDrag(upEvent: MouseEvent) {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);

      const nextSelection = createWaveformSelection(anchorPercent, contentPercentFromPointer(upEvent));

      if (!nextSelection) {
        setPlayheadPercent(contentPercentFromPointer(upEvent));
      }

      setSelection(nextSelection);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  function openSelectionMenu(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();

    if (!selection) {
      setSelectionMenu(null);
      return;
    }

    const pointerPercent = contentPercentFromPointer(event);

    if (pointerPercent < selection.startPercent || pointerPercent > selection.endPercent) {
      setSelectionMenu(null);
      return;
    }

    setSelectionMenu({ x: event.clientX, y: event.clientY });
    setActiveSubmenu(null);
    setCollapsedSubmenu(null);
  }

  function openSubmenu(name: SelectionSubmenu) {
    if (collapsedSubmenu !== name) {
      setActiveSubmenu(name);
    }
  }

  function closeSubmenu(name: SelectionSubmenu) {
    setActiveSubmenu((currentSubmenu) => (currentSubmenu === name ? null : currentSubmenu));
    setCollapsedSubmenu((currentSubmenu) => (currentSubmenu === name ? null : currentSubmenu));
  }

  function collapseSubmenu(name: SelectionSubmenu) {
    setActiveSubmenu((currentSubmenu) => (currentSubmenu === name ? null : currentSubmenu));
    setCollapsedSubmenu(name);
  }

  useEffect(() => {
    function closeMenu() {
      setSelectionMenu(null);
      setActiveSubmenu(null);
      setCollapsedSubmenu(null);
    }

    function closeMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenuWithEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenuWithEscape);
    };
  }, []);

  return {
    activeSubmenu,
    closeSubmenu,
    collapseSubmenu,
    contentRef,
    openSelectionMenu,
    openSubmenu,
    playheadPercent,
    selection,
    selectionMenu,
    selectionStyle: selection
      ? ({
          "--selection-start": selection.startPercent,
          "--selection-width": selection.endPercent - selection.startPercent,
          "--selection-center": (selection.startPercent + selection.endPercent) / 2,
        } as React.CSSProperties)
      : undefined,
    startPlayheadDrag,
    startSelectionDrag,
    collapsedSubmenu,
  };
}

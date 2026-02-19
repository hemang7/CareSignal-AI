"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
}

/**
 * Renders children into document.body to avoid stacking context and overflow clipping.
 * Use for dropdowns, modals, and other overlay UI.
 */
export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(typeof document !== "undefined");
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(children, document.body);
}

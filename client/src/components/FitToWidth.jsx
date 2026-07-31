// src/components/FitToWidth.jsx
//
// Scales fixed-width content down so it fits the available width.
//
// The payslip is a real A4 page (794px) and the payment statement is A4
// landscape (1123px). Those widths are deliberate — they have to be exact for
// print and PDF export to come out right. But on a phone they simply overflow.
//
// This wrapper measures the space it has and scales the content to fit, never
// scaling up past 1. The document keeps its true pixel dimensions internally,
// so printing and PDF export are unaffected; only the on-screen preview shrinks.

import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';

const FitToWidth = ({ width, children, className = '', minScale = 0.25 }) => {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const available = outer.clientWidth;
    // Never enlarge: a wide desktop should show the document at 100%.
    const next = available > 0 ? Math.max(minScale, Math.min(1, available / width)) : 1;
    // offsetHeight ignores the CSS transform, which is exactly what we want —
    // it is the document's true height, which we then scale ourselves.
    const nextHeight = Math.round(inner.offsetHeight * next);

    // Setting the outer height resizes an element the observer is watching, so
    // write state only on a real change or the observer feeds back into itself.
    setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    setHeight((prev) => (Math.abs(prev - nextHeight) <= 1 ? prev : nextHeight));
  }, [width, minScale]);

  // Layout effect so the first paint is already correct — no visible jump.
  useLayoutEffect(measure, [measure, children]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    // The document's own height can change (more rows, longer notes).
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={outerRef}
      className={className}
      style={{ width: '100%', height: height || undefined, overflow: 'hidden' }}
    >
      <div
        ref={innerRef}
        style={{
          width,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          // Centre the document when it is not being scaled down.
          margin: scale === 1 ? '0 auto' : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FitToWidth;

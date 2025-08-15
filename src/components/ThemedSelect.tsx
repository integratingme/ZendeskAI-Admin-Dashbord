"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function ThemedSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
  ariaLabel,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Set highlighted to selected item or first
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      // Focus the list for keyboard nav
      listRef.current?.focus();
    }
  }, [open, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        onChange(options[highlightedIndex].value);
        setOpen(false);
        buttonRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className="w-full p-3 rounded-lg border transition-colors text-left focus:outline-none"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
      >
        <span>{selectedLabel || <span style={{ opacity: 0.6 }}>{placeholder}</span>}</span>
      </button>

      {open && (
        <ul
          ref={listRef}
          tabIndex={-1}
          role="listbox"
          aria-activedescendant={highlightedIndex >= 0 ? `themed-option-${highlightedIndex}` : undefined}
          className="absolute z-[70] mt-1 max-h-60 w-full overflow-auto rounded-lg shadow-lg themed-scroll"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
          }}
          onKeyDown={handleKeyDown}
        >
          {options.map((opt, idx) => {
            const isSelected = value === opt.value;
            const isHighlighted = highlightedIndex === idx;
            const bg = isHighlighted ? "var(--accent)" : "transparent";
            const color = isHighlighted ? "white" : "var(--foreground)";
            return (
              <li
                id={`themed-option-${idx}`}
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className="cursor-pointer px-3 py-2 text-sm"
                style={{
                  background: bg,
                  color,
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => e.preventDefault()} // prevent button blur before click
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

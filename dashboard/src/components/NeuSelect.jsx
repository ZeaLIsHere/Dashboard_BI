import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function NeuSelect({ id, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const labelId = useId();
  const listboxId = useId();

  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const curIdx = options.findIndex((o) => o.value === value);
        const nextIdx =
          e.key === 'ArrowDown'
            ? (curIdx + 1) % options.length
            : (curIdx - 1 + options.length) % options.length;
        onChange(options[nextIdx].value);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, options, value, onChange]);

  return (
    <div className="filter-group" ref={wrapRef}>
      <label id={labelId} htmlFor={id} className="filter-label">
        {label}
      </label>
      <div className="neu-select-wrap">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`neu-select-trigger ${open ? 'is-open' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${labelId} ${id}`}
          aria-controls={listboxId}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="neu-select-text">{selected?.label}</span>
          <ChevronDown size={16} className={`neu-select-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
        </button>

        {open && (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className="neu-select-menu"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`neu-select-option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface CustomSelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  label: string;
  icon?: React.ReactNode;
  options: CustomSelectOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  onBlur?: React.FocusEventHandler;
  ref?: React.Ref<HTMLButtonElement>;
  name?: string;
  className?: string;
}

export function CustomSelect({
  label,
  icon,
  options,
  value,
  onChange,
  placeholder,
  onBlur,
  ref,
  name,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectId = useId();
  const triggerId = `custom-select-trigger-${selectId}`;
  const listboxId = `custom-select-listbox-${selectId}`;

  const listOptions = placeholder
    ? [{ label: placeholder, value: '' }, ...options]
    : options;
  const selectedValue = value ?? '';
  const selectedOption = listOptions.find((option) => option.value === selectedValue);
  const selectedIndex = Math.max(0, listOptions.findIndex((option) => option.value === selectedValue));

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const moveSelection = (direction: 1 | -1) => {
    if (listOptions.length === 0) return;
    const nextIndex = Math.min(listOptions.length - 1, Math.max(0, selectedIndex + direction));
    onChange(listOptions[nextIndex].value);
  };

  return (
    <div ref={containerRef} className={`custom-select ${className}`}>
      {icon && <span className="custom-select__icon">{icon}</span>}
      <button
        ref={ref}
        id={triggerId}
        type="button"
        name={name}
        className={`field-select custom-select__trigger h-12 ${selectedValue ? '' : 'custom-select__trigger--placeholder'}`}
        aria-label={label}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              moveSelection(event.key === 'ArrowDown' ? 1 : -1);
            }
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen((open) => !open);
          }
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`custom-select__chevron h-4 w-4 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={listboxId} className="custom-select__menu" role="listbox" aria-label={label}>
          {listOptions.map((option) => {
            const isSelected = option.value === selectedValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="custom-select__option"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

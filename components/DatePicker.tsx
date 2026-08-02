"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  onBlur?: React.FocusEventHandler;
  ref?: React.Ref<HTMLButtonElement>;
}

export function DatePicker({ value, onChange, label, placeholder, onBlur, ref }: DatePickerProps) {
  const t = useTranslations('Common');
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parseInputDate(value) || new Date());
  const pickerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const selectedDate = parseInputDate(value);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const todayValue = toInputDate(new Date());
  const monthLabel = viewMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdays = Array.from({ length: 7 }, (_, index) => (
    new Date(2021, 7, index + 1).toLocaleDateString(locale, { weekday: 'short' })
  ));
  const days = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, index) => (
    index < firstDayOfMonth ? null : index - firstDayOfMonth + 1
  ));
  const triggerLabel = value
    ? selectedDate?.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : placeholder ?? t('pickDate');

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
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

  const toggleOpen = () => {
    if (!isOpen) {
      const rect = pickerRef.current?.getBoundingClientRect();
      setOpenAbove(!!rect && window.innerHeight - rect.bottom < 330);
    }
    setIsOpen((open) => !open);
  };

  const moveMonth = (offset: number) => {
    setViewMonth(new Date(year, month + offset, 1));
  };

  return (
    <div ref={pickerRef} className="date-picker">
      <button
        ref={ref}
        type="button"
        className={`date-picker__trigger ${value ? 'date-picker__trigger--selected' : ''}`}
        aria-label={label}
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onBlur={onBlur}
        onClick={() => {
          if (selectedDate) setViewMonth(selectedDate);
          toggleOpen();
        }}
      >
        <Calendar className="h-4 w-4" aria-hidden="true" />
        <span>{triggerLabel}</span>
        <ChevronDown className={`date-picker__chevron h-4 w-4 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={popoverId}
          className={`date-picker__popover ${openAbove ? 'date-picker__popover--above' : ''}`}
          role="dialog"
          aria-label={label}
        >
          <div className="date-picker__header">
            <strong>{monthLabel}</strong>
            <div className="date-picker__month-actions">
              <button type="button" onClick={() => moveMonth(-1)} aria-label={t('previousMonth')}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => moveMonth(1)} aria-label={t('nextMonth')}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="date-picker__weekdays">
            {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
          </div>
          <div className="date-picker__days">
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
              const dayValue = toInputDate(new Date(year, month, day));
              const isSelected = dayValue === value;
              const isToday = dayValue === todayValue;
              return (
                <button
                  key={dayValue}
                  type="button"
                  className={`date-picker__day ${isSelected ? 'date-picker__day--selected' : ''} ${isToday ? 'date-picker__day--today' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(dayValue);
                    setIsOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button
              type="button"
              className="date-picker__clear"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              {t('clearDate')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseInputDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

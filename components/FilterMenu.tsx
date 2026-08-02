"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, Filter } from "lucide-react";
import { useTranslations } from "next-intl";

export interface FilterMenuOption {
  id: string;
  label: string;
  active: boolean;
  href?: string;
  onSelect?: () => void;
}

interface FilterMenuProps {
  options: FilterMenuOption[];
  activeLabel?: string;
  desktopExtra?: ReactNode;
  mobileExtra?: ReactNode;
  desktopClassName?: string;
  desktopVariant?: "filter-bar" | "range-switcher";
}

export function FilterMenu({
  options,
  activeLabel,
  desktopExtra,
  mobileExtra,
  desktopClassName = "",
  desktopVariant = "filter-bar",
}: FilterMenuProps) {
  const t = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selectedOption = options.find((option) => option.active);
  const selectedLabel = activeLabel || selectedOption?.label || t("filters");

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectOption = (option: FilterMenuOption) => {
    option.onSelect?.();
    setIsOpen(false);
  };

  const toggleMenu = () => {
    if (!isOpen) {
      const trigger = menuRef.current?.getBoundingClientRect();
      setOpenAbove(!!trigger && window.innerHeight - trigger.bottom < 360);
    }
    setIsOpen((open) => !open);
  };

  return (
    <div ref={menuRef} className="filter-menu-shell">
      <div className={`filter-menu-shell__desktop ${desktopClassName}`}>
        <div className={desktopVariant}>
          {desktopVariant === "filter-bar" && <Filter className="filter-bar__icon" aria-hidden="true" />}
          {options.map((option) => (
            option.href ? (
              <Link
                key={option.id}
                href={option.href}
                className={`${option.active ? "is-active" : ""} whitespace-nowrap`}
              >
                {option.label}
              </Link>
            ) : (
              <button
                key={option.id}
                type="button"
                onClick={option.onSelect}
                className={`${option.active ? "is-active" : ""} whitespace-nowrap`}
              >
                {option.label}
              </button>
            )
          ))}
        </div>
        {desktopExtra}
      </div>

      <div className="filter-menu-shell__mobile">
        <button
          type="button"
          className="filter-menu__trigger"
          aria-label={t("filters")}
          aria-controls={menuId}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={toggleMenu}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          <span>{t("filters")}</span>
          <strong>{selectedLabel}</strong>
          <ChevronDown className={`filter-menu__chevron h-4 w-4 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <div
            id={menuId}
            className={`filter-menu__popover ${openAbove ? "filter-menu__popover--above" : ""}`}
            role="menu"
            aria-label={t("filters")}
          >
            {options.map((option) => (
              option.href ? (
                <Link
                  key={option.id}
                  href={option.href}
                  role="menuitemradio"
                  aria-checked={option.active}
                  onClick={() => setIsOpen(false)}
                  className={`filter-menu__option ${option.active ? "is-active" : ""}`}
                >
                  <span>{option.label}</span>
                  {option.active && <Check className="filter-menu__check" aria-hidden="true" />}
                </Link>
              ) : (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={option.active}
                  onClick={() => selectOption(option)}
                  className={`filter-menu__option ${option.active ? "is-active" : ""}`}
                >
                  <span>{option.label}</span>
                  {option.active && <Check className="filter-menu__check" aria-hidden="true" />}
                </button>
              )
            ))}
            {mobileExtra && <div className="filter-menu__extra">{mobileExtra}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

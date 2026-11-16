"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  formatWIBDateDisplay,
  formatWIBTimeDisplay,
  parseTagList,
  stringifyTagList,
} from "./adminUtils";

export function SidebarDefaultDateTimeWidget() {
  const [currentTime, setCurrentTime] = useState<string>(() =>
    formatWIBTimeDisplay(new Date())
  );
  const [currentDate, setCurrentDate] = useState<string>(() =>
    formatWIBDateDisplay(new Date())
  );

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(formatWIBTimeDisplay(now));
      setCurrentDate(formatWIBDateDisplay(now));
    };
    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pt-0.5">
      <span>{currentDate}</span>
      <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
      <span>{currentTime} WIB</span>
    </div>
  );
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "items",
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  if (totalItems === 0 || totalPages <= 1) return null;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="px-7 py-4 border-t border-zinc-900/[0.06] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
        Showing <strong className="text-zinc-900 dark:text-white">{startItem}</strong> –{" "}
        <strong className="text-zinc-900 dark:text-white">{endItem}</strong> of{" "}
        <strong className="text-zinc-900 dark:text-white">{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-35 flex items-center gap-1 whitespace-nowrap transition"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" /> Prev
        </button>

        <span className="px-2 text-xs font-mono text-zinc-500 whitespace-nowrap">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-35 flex items-center gap-1 whitespace-nowrap transition"
        >
          Next <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}

interface DropdownTagPickerProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  options: Array<{ id: string; name: string; title?: string | null }>;
  selectPlaceholder?: string;
  onManage?: () => void;
  manageLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function DropdownTagPicker({
  label,
  subLabel,
  value,
  onChange,
  disabled = false,
  options = [],
  selectPlaceholder = "Select from directory...",
  onManage,
  manageLabel = "+ Manage in Directory",
  icon: Icon,
}: DropdownTagPickerProps) {
  const tags = parseTagList(value);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange(stringifyTagList([...tags, trimmed]));
    }
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(stringifyTagList(tags.filter((_, idx) => idx !== indexToRemove)));
  };

  const availableOptions = options.filter(
    (opt) => !tags.some((t) => t.toLowerCase() === opt.name.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span>{label}</span>
          <span className="text-[11px] text-zinc-400 font-normal">
            ({tags.length} selected)
          </span>
        </label>
        <div className="flex items-center gap-2">
          {subLabel && <span className="text-[10px] text-zinc-400">{subLabel}</span>}
          {onManage && !disabled && (
            <button
              type="button"
              onClick={onManage}
              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition underline"
            >
              {manageLabel}
            </button>
          )}
        </div>
      </div>

      {!disabled && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addTag(e.target.value);
          }}
          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">+ {selectPlaceholder}</option>
          {availableOptions.map((opt) => (
            <option key={opt.id} value={opt.name} className="bg-white dark:bg-zinc-900">
              {opt.name} {opt.title ? `(${opt.title})` : ""}
            </option>
          ))}
        </select>
      )}

      <div className="min-h-[38px] p-2 rounded-xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 flex flex-wrap items-center gap-1.5">
        {tags.length === 0 ? (
          <span className="text-[11px] text-zinc-400 italic px-1">
            None selected yet. Select from the directory dropdown above.
          </span>
        ) : (
          tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 shadow-2xs"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(idx)}
                  className="hover:opacity-70 rounded-full p-0.5 text-zinc-400 hover:text-red-500 transition"
                  title={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

interface SingleSelectDirectoryPickerProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (val: string) => void;
  options: Array<{ id: string; name: string }>;
  disabled?: boolean;
  onManage?: () => void;
  manageLabel?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function SingleSelectDirectoryPicker({
  label,
  subLabel,
  value,
  onChange,
  options = [],
  disabled = false,
  onManage,
  manageLabel = "+ Manage in Directory",
  placeholder = "Select from directory...",
  icon: Icon,
}: SingleSelectDirectoryPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-2">
          {subLabel && <span className="text-[10px] text-zinc-400">{subLabel}</span>}
          {onManage && !disabled && (
            <button
              type="button"
              onClick={onManage}
              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition underline"
            >
              {manageLabel}
            </button>
          )}
        </div>
      </div>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.name} className="bg-white dark:bg-zinc-900">
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

interface MultiTagInputProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder: string;
  disabled?: boolean;
  quickSuggestions?: string[];
  icon?: React.ComponentType<{ className?: string }>;
  chipColor?: "zinc" | "chrome";
}

export function MultiTagInput({
  label,
  subLabel,
  value,
  onChange,
  placeholder,
  disabled = false,
  quickSuggestions = [],
  icon: Icon,
  chipColor = "zinc",
}: MultiTagInputProps) {
  const [draft, setDraft] = useState("");
  const tags = parseTagList(value);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange(stringifyTagList([...tags, trimmed]));
    }
    setDraft("");
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(stringifyTagList(tags.filter((_, idx) => idx !== indexToRemove)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span>{label}</span>
          <span className="text-[10px] text-zinc-400 font-normal">
            ({tags.length} added)
          </span>
        </label>
        {subLabel && <span className="text-[10px] text-zinc-400">{subLabel}</span>}
      </div>

      <div
        className={`min-h-[42px] p-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex flex-wrap items-center gap-1.5 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              chipColor === "chrome"
                ? "bg-zinc-200 dark:bg-white/15 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-white/20"
                : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10 shadow-xs"
            }`}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="hover:opacity-70 rounded-full p-0.5 transition"
                title={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <div className="flex-1 min-w-[150px] flex items-center gap-1.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                tags.length === 0 ? placeholder : "+ Add another (press Enter)..."
              }
              className="w-full bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 px-1 py-1"
            />
            {draft.trim() && (
              <button
                type="button"
                onClick={() => addTag(draft)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-semibold shrink-0 shadow-2xs hover:opacity-90 transition"
              >
                + Add
              </button>
            )}
          </div>
        )}
      </div>

      {!disabled && quickSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-zinc-400">Quick suggestions:</span>
          {quickSuggestions
            .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
            .map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addTag(s)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

interface DynamicItemListBuilderProps {
  label: string;
  subLabel?: string;
  addButtonLabel: string;
  placeholderPrefix: string;
  items: string[];
  onChange: (nextItems: string[]) => void;
  disabled?: boolean;
}

export function DynamicItemListBuilder({
  label,
  subLabel,
  addButtonLabel,
  placeholderPrefix,
  items,
  onChange,
  disabled = false,
}: DynamicItemListBuilderProps) {
  const safeItems = items && items.length > 0 ? items : [""];

  const handleUpdate = (index: number, value: string) => {
    const next = [...safeItems];
    next[index] = value;
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...safeItems, ""]);
  };

  const handleRemove = (index: number) => {
    if (safeItems.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(safeItems.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            {label}
          </label>
          {subLabel && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {subLabel}
            </p>
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium flex items-center gap-1.5 hover:opacity-90 transition self-start sm:self-center shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addButtonLabel}</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {safeItems.map((item, idx) => {
          const isEvenRow = idx % 2 === 1;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                isEvenRow
                  ? "bg-zinc-300/65 dark:bg-zinc-700/70 border-zinc-400/70 dark:border-zinc-600"
                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                  isEvenRow
                    ? "bg-white text-zinc-950 border border-zinc-500 dark:bg-zinc-950 dark:text-white dark:border-zinc-400"
                    : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                }`}
              >
                {idx + 1}
              </span>

              <input
                type="text"
                disabled={disabled}
                value={item}
                onChange={(e) => handleUpdate(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!disabled) handleAdd();
                  }
                }}
                placeholder={`${placeholderPrefix}...`}
                className={`flex-1 px-3.5 py-2 rounded-lg border text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isEvenRow
                    ? "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-600"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10"
                }`}
              />

              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                  title="Remove item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

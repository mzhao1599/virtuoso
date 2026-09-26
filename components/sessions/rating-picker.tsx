"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type Focus = "clear_goals" | "mid" | "noodling";
export type Entropy = "few_measures" | "in_between" | "whole_piece";
export type Enjoyment = "progress" | "ok" | "stuck";

type Tone = "good" | "mid" | "low";

interface Option<T extends string> {
  value: T;
  label: string;
  tone: Tone;
}

export const FOCUS_OPTIONS: Option<Focus>[] = [
  { value: "clear_goals", label: "Clear goals", tone: "good" },
  { value: "mid", label: "Mid", tone: "mid" },
  { value: "noodling", label: "Noodling", tone: "low" },
];
export const ENTROPY_OPTIONS: Option<Entropy>[] = [
  { value: "few_measures", label: "Few measures", tone: "good" },
  { value: "in_between", label: "In between", tone: "mid" },
  { value: "whole_piece", label: "Whole piece", tone: "low" },
];
export const ENJOYMENT_OPTIONS: Option<Enjoyment>[] = [
  { value: "progress", label: "Progress", tone: "good" },
  { value: "ok", label: "OK", tone: "mid" },
  { value: "stuck", label: "Stuck", tone: "low" },
];

const ACTIVE: Record<Tone, string> = {
  good: "bg-emerald-50 border-emerald-300 text-emerald-800",
  mid: "bg-amber-50 border-amber-300 text-amber-800",
  low: "bg-rose-50 border-rose-300 text-rose-800",
};

interface RatingPickerProps<T extends string> {
  label: string;
  hint?: string;
  options: Option<T>[];
  value: T | "";
  onChange: (value: T | "") => void;
  disabled?: boolean;
}

/** Optional single choice; choosing the selected option again clears it. */
export function RatingPicker<T extends string>({ label, hint, options, value, onChange, disabled }: RatingPickerProps<T>) {
  const id = useId();
  return (
    <div>
      <p id={`${id}-label`} className="block text-sm font-medium mb-2">
        {label}
        {hint && <span className="ml-1.5 font-normal text-muted-foreground">{hint}</span>}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex gap-2">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => onChange(checked ? "" : option.value)}
              className={cn(
                "flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                checked ? ACTIVE[option.tone] : "bg-white border-input text-foreground hover:bg-accent"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

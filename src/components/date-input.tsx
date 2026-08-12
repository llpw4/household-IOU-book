"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toDateInputValue, tryParseDateInputValue } from "@/lib/utils";

export function DateInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: Date;
  onChange: (date: Date) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => toDateInputValue(value));

  function commitDate(raw: string) {
    const parsed = tryParseDateInputValue(raw);
    if (!parsed) {
      return false;
    }

    onChange(parsed);
    setText(toDateInputValue(parsed));
    return true;
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) {
      return;
    }

    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }

    picker.focus();
    picker.click();
  }

  return (
    <div className="relative flex gap-2">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="YYYY-MM-DD"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);

          const parsed = tryParseDateInputValue(next);
          if (parsed) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          if (!commitDate(text)) {
            setText(toDateInputValue(value));
          }
        }}
        className="min-w-0 flex-1"
      />

      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={toDateInputValue(value)}
        onChange={(event) => {
          commitDate(event.target.value);
        }}
      />

      <Button
        type="button"
        variant="outline"
        aria-label="选择日期"
        onClick={openPicker}
        className="shrink-0 px-3"
      >
        选择
      </Button>
    </div>
  );
}

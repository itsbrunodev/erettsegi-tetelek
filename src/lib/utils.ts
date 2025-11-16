import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Thesis } from "./types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  if (!date) return "";

  const trimmed = date.trim();

  if (/^Kr\.?\s*e\.?\s*\d{1,2}\.?\s*(sz\.|század)?$/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ").trim();
  }
  if (/^\d{1,2}\.?\s*(sz\.|század)$/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ").trim();
  }

  if (/^Kr\.?\s*e\.?\s*\d{1,4}$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ").trim();
  }

  const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
  const monthPattern = /^\d{4}-\d{2}$/;
  const yearPattern = /^\d{4}$/;

  try {
    const options = dayPattern.test(trimmed)
      ? ({ year: "numeric", month: "long", day: "numeric" } as const)
      : monthPattern.test(trimmed)
        ? ({ year: "numeric", month: "long" } as const)
        : yearPattern.test(trimmed)
          ? ({ year: "numeric" } as const)
          : null;

    if (!options) return trimmed;

    return new Intl.DateTimeFormat("hu", options).format(new Date(trimmed));
  } catch {
    return date;
  }
}

function dateToSortValue(dateStr: string): number {
  if (!dateStr) return Number.POSITIVE_INFINITY;

  const trimmed = dateStr.trim();

  const bceCenturyMatch = trimmed.match(
    /Kr\.?\s*e\.?\s*(\d{1,2})\.?\s*(sz\.|század)/i,
  );
  if (bceCenturyMatch) {
    const century = Number.parseInt(bceCenturyMatch[1]);
    return -(century * 100 - 50);
  }

  const bceYearMatch = trimmed.match(/Kr\.?\s*e\.?\s*(\d{1,4})$/i);
  if (bceYearMatch) {
    return -Number.parseInt(bceYearMatch[1]);
  }

  const centuryMatch = trimmed.match(/^(\d{1,2})\.?\s*(sz\.|század)$/i);
  if (centuryMatch) {
    const century = Number.parseInt(centuryMatch[1]);
    return (century - 1) * 100 + 50;
  }

  if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(trimmed)) {
    try {
      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const dayOfYear = Math.floor(
          (date.getTime() - new Date(year, 0, 0).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return year + dayOfYear / 366;
      }
    } catch {}
  }

  return Number.POSITIVE_INFINITY;
}

export function sortChronologically(theses: Thesis[]): Thesis[] {
  return [...theses].sort((a, b) => {
    const aDate = a.data.startDate?.date || a.data.endDate?.date || "";
    const bDate = b.data.startDate?.date || b.data.endDate?.date || "";

    const aValue = dateToSortValue(aDate);
    const bValue = dateToSortValue(bDate);

    return aValue - bValue;
  });
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}

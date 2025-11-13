import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Thesis } from "./types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  if (!date) return "";

  const trimmed = date.trim();

  // Handle centuries (e.g. "14. sz.", "19. század", "Kr. e. 5. sz.")
  if (/^Kr\.?\s*e\.?\s*\d{1,2}\.?\s*(sz\.|század)?$/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ").trim(); // normalize spacing
  }
  if (/^\d{1,2}\.?\s*(sz\.|század)$/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ").trim();
  }

  // Handle "Kr. e." with specific years (e.g. "Kr. e. 356")
  if (/^Kr\.?\s*e\.?\s*\d{1,4}$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ").trim();
  }

  // choose options by pattern
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
    // fallback to date string if parsing fails
    return date;
  }
}

/**
 * Converts a date string to a numeric value for sorting
 * Lower numbers = earlier in history
 * Handles: BCE dates, centuries, ISO dates (YYYY-MM-DD, YYYY-MM, YYYY)
 */
function dateToSortValue(dateStr: string): number {
  if (!dateStr) return Number.POSITIVE_INFINITY; // No date goes to the end

  const trimmed = dateStr.trim();

  // Handle BCE centuries (e.g., "Kr. e. 5. sz.")
  const bceСenturyMatch = trimmed.match(
    /Kr\.?\s*e\.?\s*(\d{1,2})\.?\s*(sz\.|század)/i,
  );
  if (bceСenturyMatch) {
    const century = Number.parseInt(bceСenturyMatch[1]);
    // BCE 5th century = -500 to -401, use middle point
    return -(century * 100 - 50);
  }

  // Handle BCE years (e.g., "Kr. e. 356")
  const bceYearMatch = trimmed.match(/Kr\.?\s*e\.?\s*(\d{1,4})$/i);
  if (bceYearMatch) {
    return -Number.parseInt(bceYearMatch[1]);
  }

  // Handle CE centuries (e.g., "11. sz.", "14. század")
  const centuryMatch = trimmed.match(/^(\d{1,2})\.?\s*(sz\.|század)$/i);
  if (centuryMatch) {
    const century = Number.parseInt(centuryMatch[1]);
    // 11th century = 1001-1100, use middle point
    return (century - 1) * 100 + 50;
  }

  // Handle ISO date formats
  if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(trimmed)) {
    try {
      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) {
        // Return year with fractional part for month/day precision
        const year = date.getFullYear();
        const dayOfYear = Math.floor(
          (date.getTime() - new Date(year, 0, 0).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return year + dayOfYear / 366;
      }
    } catch {
      // Fall through to return Infinity
    }
  }

  // Unknown format - put at the end
  return Number.POSITIVE_INFINITY;
}

/**
 * Sorts an array of theses in chronological order
 * Uses startDate for sorting, falls back to endDate if startDate is missing
 */
export function sortChronologically(theses: Thesis[]): Thesis[] {
  return [...theses].sort((a, b) => {
    const aDate = a.data.startDate?.date || a.data.endDate?.date || "";
    const bDate = b.data.startDate?.date || b.data.endDate?.date || "";

    const aValue = dateToSortValue(aDate);
    const bValue = dateToSortValue(bDate);

    return aValue - bValue;
  });
}

export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Ensure 32bit integer
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 80%)`; // Using HSL for pleasant, consistent colors
}

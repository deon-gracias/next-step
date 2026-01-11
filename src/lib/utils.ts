import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitialsFromUsername(username?: string | null, limit = 2) {
  if (!username) return "";

  const parts = username.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "";

  return parts
    .slice(0, limit)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

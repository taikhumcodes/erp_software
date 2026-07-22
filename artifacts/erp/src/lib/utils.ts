import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKWD(value: string | number): string {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return `${numeric.toFixed(3)} KWD`;
}

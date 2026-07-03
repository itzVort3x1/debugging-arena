import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with Tailwind merge semantics - later utilities win.
 * Use everywhere we need conditional className composition.
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

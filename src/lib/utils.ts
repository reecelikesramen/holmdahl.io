import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function tagSlug(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, "-")
}

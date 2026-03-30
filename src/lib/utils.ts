import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs)); 
}
/** this file contains utility functions for handling Tailwind CSS classes
 * it does not contain any logic related to the application itself,
 * but it is used throughout the application to handle class names in a consistent way
 * it does this by using the clsx library to combine class names and 
 * the tailwind-merge library to merge Tailwind CSS classes
 * twMerge is used to ensure that conflicting Tailwind CSS classes are resolved correctly,
 * for example, if you have "bg-red-500" and "bg-blue-500" in the same class list, 
 * twMerge will resolve this conflict by keeping only the last one, which is "bg-blue-500"
 * this allows you to easily override Tailwind CSS classes without having to worry about conflicts
 */
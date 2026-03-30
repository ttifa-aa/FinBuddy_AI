import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

/**
 * Toast Notification System
 *
 * This module implements a comprehensive toast notification system for the FinBuddy application.
 * It provides a way to display temporary, non-intrusive messages to users about various events,
 * actions, and states within the application. The system uses a reducer pattern for state management
 * and supports features like auto-dismissal, custom actions, and multiple toast types.
 *
 * Key Features:
 * - Multiple toast variants (default, destructive, success)
 * - Auto-dismissal with configurable timeouts
 * - Custom actions within toasts
 * - State persistence across component re-renders
 * - TypeScript support with full type safety
 *
 * Architecture:
 * - Uses a reducer pattern for predictable state management
 * - Global state with pub/sub pattern for component synchronization
 * - Timeout queue for managing toast lifecycle
 * - Unique ID generation for toast identification
 */

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

/**
 * Generate a unique ID for toast notifications
 * Uses a counter that wraps around to ensure uniqueness within the session
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

/**
 * Timeout management for toast auto-removal
 * Maps toast IDs to their removal timeouts for cleanup purposes
 */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Queue a toast for removal after the specified delay
 * This creates a timeout that will automatically remove the toast from state
 *
 * @param toastId - The ID of the toast to queue for removal
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Reducer function for managing toast state
 * Handles all state transitions based on dispatched actions
 *
 * @param state - Current toast state
 * @param action - Action to process
 * @returns New state after applying the action
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

/**
 * Global state management for toasts
 * Uses a simple pub/sub pattern to notify all subscribers of state changes
 */
const listeners: Array<(state: State) => void> = [];

/**
 * Current toast state stored in memory
 * This persists across component re-renders and provides the source of truth
 */
let memoryState: State = { toasts: [] };

/**
 * Dispatch function for toast actions
 * Updates the global state and notifies all listeners of changes
 *
 * @param action - The action to dispatch
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

/**
 * Create and display a new toast notification
 * This is the main API function for showing toasts to users
 *
 * @param props - Toast properties (title, description, variant, etc.)
 * @returns Object with methods to control the toast (dismiss, update)
 */
function toast({ ...props }: Toast) {
  const id = genId();

  /**
   * Update the current toast with new properties
   * Allows modifying the toast content after creation
   *
   * @param props - New properties to update
   */
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });

  /**
   * Dismiss the current toast
   * Marks the toast as closed and schedules its removal
   */
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

/**
 * React hook for accessing the toast system
 * Provides access to current toasts and toast management functions
 *
 * @returns Object containing toast state and control functions
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };

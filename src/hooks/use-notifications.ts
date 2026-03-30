// Notifications Hook - Real-time Notification Management
// This module provides React hooks for managing user notifications with real-time updates
// Uses Supabase for data persistence and real-time subscriptions
// Supports notification fetching, unread counting, and dismissal functionality

import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

// ── TYPE DEFINITIONS ───────────────────────────────────────────────────────
// Notification data structure matching the Supabase notifications table
export interface Notification {
  id: string;           // Unique notification identifier
  user_id: string;      // ID of the user who owns this notification
  message: string;      // The notification message text
  level: "info" | "warning" | "critical"; // Severity level for styling
  dismissed: boolean;   // Whether the user has dismissed this notification
  created_at: string;   // ISO timestamp when notification was created
}

// ── MAIN NOTIFICATIONS HOOK ────────────────────────────────────────────────
// Hook for fetching and managing user notifications with real-time updates
export function useNotifications() {
  const { user } = useAuth(); // Get current authenticated user
  const queryClient = useQueryClient(); // React Query client for cache management

  // ── NOTIFICATIONS QUERY ────────────────────────────────────────────────────
  // Fetch notifications for the current user using React Query
  const query = useQuery({
    queryKey: ["notifications", user?.id], // Cache key includes user ID
    queryFn: async () => {
      // Fetch notifications from Supabase, ordered by creation date (newest first)
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id) // Filter to current user's notifications
        .order("created_at", { ascending: false }) // Newest first
        .limit(50); // Limit to prevent excessive data loading

      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user, // Only run query when user is authenticated
  });

  // ── REAL-TIME SUBSCRIPTION ────────────────────────────────────────────────
  // Set up Supabase real-time subscription for new notifications
  useEffect(() => {
    if (!user) return; // Don't subscribe if no authenticated user

    // Create a unique channel for this user's notifications
    const channel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        "postgres_changes", // Listen for database changes
        {
          event: "INSERT", // Only listen for new notifications
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`, // Only notifications for this user
        },
        () => {
          // When new notification arrives, invalidate the cache to refetch
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe(); // Start the subscription

    // ── CLEANUP ──────────────────────────────────────────────────────────────
    // Remove the subscription when component unmounts or user changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query; // Return the React Query result object
}

// ── UNREAD COUNT HOOK ──────────────────────────────────────────────────────
// Hook for getting the count of unread (non-dismissed) notifications
export function useUnreadCount() {
  const { data: notifications = [] } = useNotifications(); // Get notifications
  // Count notifications that haven't been dismissed
  return notifications.filter((n) => !n.dismissed).length;
}

// ── DISMISS NOTIFICATION HOOK ──────────────────────────────────────────────
// Hook for marking a notification as dismissed
export function useDismissNotification() {
  const queryClient = useQueryClient(); // React Query client

  return useMutation({
    mutationFn: async (id: string) => {
      // Update the notification in Supabase to mark as dismissed
      const { error } = await supabase
        .from("notifications")
        .update({ dismissed: true } as any) // Type assertion for Supabase
        .eq("id", id); // Target specific notification by ID

      if (error) throw error;
    },
    // On successful dismissal, invalidate cache to refetch notifications
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

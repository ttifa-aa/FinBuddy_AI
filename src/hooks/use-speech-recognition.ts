// Speech Recognition Hook - Voice Input for Expense Tracking
// This custom React hook provides speech-to-text functionality for voice expense input
// Uses the Web Speech API to convert spoken words into text transcripts
// Handles browser compatibility and provides a clean interface for voice commands

import { useState, useCallback, useRef } from "react";

// ── HOOK INTERFACE ─────────────────────────────────────────────────────────
// TypeScript interface defining the hook's return value structure
interface SpeechRecognitionHook {
  isListening: boolean;     // Whether speech recognition is currently active
  transcript: string;       // The recognized speech converted to text
  startListening: () => void; // Function to start speech recognition
  stopListening: () => void;  // Function to stop speech recognition
  isSupported: boolean;    // Whether the browser supports speech recognition
}

// ── HOOK IMPLEMENTATION ───────────────────────────────────────────────────
// Custom hook that provides speech-to-text functionality
export function useSpeechRecognition(): SpeechRecognitionHook {
  // ── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false); // Listening status
  const [transcript, setTranscript] = useState("");      // Recognized text
  const recognitionRef = useRef<any>(null);             // Reference to recognition instance

  // ── BROWSER COMPATIBILITY ─────────────────────────────────────────────────
  // Check for Speech Recognition API support (cross-browser compatibility)
  // Supports both standard SpeechRecognition and webkit prefixed version
  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  // Boolean flag indicating if speech recognition is supported in this browser
  const isSupported = !!SpeechRecognition;

  // ── START LISTENING FUNCTION ──────────────────────────────────────────────
  // Callback to initialize and start speech recognition
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return; // Exit if not supported

    // Create new speech recognition instance
    const recognition = new SpeechRecognition();

    // ── RECOGNITION CONFIGURATION ────────────────────────────────────────────
    recognition.continuous = false;     // Single utterance mode (stops after speech)
    recognition.interimResults = false; // Only return final results (not partial)
    recognition.lang = "en-US";         // Set language to US English

    // ── EVENT HANDLERS ──────────────────────────────────────────────────────
    // Handle successful speech recognition
    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript; // Extract final transcript
      setTranscript(result);     // Update transcript state
      setIsListening(false);     // Stop listening indicator
    };

    // Handle recognition errors
    recognition.onerror = () => {
      setIsListening(false); // Stop listening on error
    };

    // Handle recognition end (either by user or automatically)
    recognition.onend = () => {
      setIsListening(false); // Ensure listening state is cleared
    };

    // ── START RECOGNITION ───────────────────────────────────────────────────
    recognitionRef.current = recognition; // Store reference for cleanup
    recognition.start();                  // Begin speech recognition
    setIsListening(true);                // Update listening state
  }, [SpeechRecognition]);

  // ── STOP LISTENING FUNCTION ───────────────────────────────────────────────
  // Callback to stop active speech recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // Stop the recognition process
      setIsListening(false);         // Clear listening state
    }
  }, []);

  // ── RETURN HOOK INTERFACE ─────────────────────────────────────────────────
  // Return the complete hook interface for component consumption
  return { isListening, transcript, startListening, stopListening, isSupported };
}

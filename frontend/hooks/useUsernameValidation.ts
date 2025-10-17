import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface UseUsernameValidationProps {
  username: string;
  originalUsername?: string; // For edit profile (skip check if unchanged)
  minLength?: number;
}

interface ValidationResult {
  isValid: boolean;
  error: string | null;
  isChecking: boolean;
}

const USERNAME_REGEX = /^[a-z0-9_.]+$/;

export function useUsernameValidation({
  username,
  originalUsername,
  minLength = 3,
}: UseUsernameValidationProps): ValidationResult {
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check if username is taken (skip if unchanged)
  const shouldCheck =
    username.length >= minLength &&
    username !== originalUsername &&
    USERNAME_REGEX.test(username);

  const usernameExists = useQuery(
    api.users.checkUsername,
    shouldCheck ? { username } : "skip",
  );

  useEffect(() => {
    // Empty username
    if (!username) {
      setError("Username is required");
      setIsChecking(false);
      return;
    }

    // Too short
    if (username.length < minLength) {
      setError(`Username must be at least ${minLength} characters`);
      setIsChecking(false);
      return;
    }

    // Invalid characters
    if (!USERNAME_REGEX.test(username)) {
      setError(
        "Username can only contain lowercase letters, numbers, underscores, and periods",
      );
      setIsChecking(false);
      return;
    }

    // Starts with underscore or period
    if (username.startsWith("_") || username.startsWith(".")) {
      setError("Username cannot start with an underscore or period");
      setIsChecking(false);
      return;
    }

    // Same as original (for edit profile)
    if (originalUsername && username === originalUsername) {
      setError(null);
      setIsChecking(false);
      return;
    }

    // Check availability
    if (usernameExists === undefined) {
      setError(null);
      setIsChecking(true);
    } else if (usernameExists === true) {
      setError("This username is already taken. Please try another one.");
      setIsChecking(false);
    } else {
      setError(null);
      setIsChecking(false);
    }
  }, [username, originalUsername, minLength, usernameExists]);

  return {
    isValid: !error && !isChecking,
    error,
    isChecking,
  };
}

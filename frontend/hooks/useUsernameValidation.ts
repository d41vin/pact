import { useMemo } from "react";
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
  // Check if username is taken (skip if unchanged)
  const shouldCheck =
    username.length >= minLength &&
    username !== originalUsername &&
    USERNAME_REGEX.test(username);

  const usernameExists = useQuery(
    api.users.checkUsername,
    shouldCheck ? { username } : "skip",
  );

  // Compute validation state directly from props
  const validationResult = useMemo(() => {
    // Empty username
    if (!username) {
      return {
        error: "Username is required",
        isChecking: false,
      };
    }

    // Too short
    if (username.length < minLength) {
      return {
        error: `Username must be at least ${minLength} characters`,
        isChecking: false,
      };
    }

    // Invalid characters
    if (!USERNAME_REGEX.test(username)) {
      return {
        error:
          "Username can only contain lowercase letters, numbers, underscores, and periods",
        isChecking: false,
      };
    }

    // Starts with underscore or period
    if (username.startsWith("_") || username.startsWith(".")) {
      return {
        error: "Username cannot start with an underscore or period",
        isChecking: false,
      };
    }

    // Same as original (for edit profile)
    if (originalUsername && username === originalUsername) {
      return {
        error: null,
        isChecking: false,
      };
    }

    // Check availability
    if (usernameExists === undefined) {
      return {
        error: null,
        isChecking: true,
      };
    } else if (usernameExists === true) {
      return {
        error: "This username is already taken. Please try another one.",
        isChecking: false,
      };
    } else {
      return {
        error: null,
        isChecking: false,
      };
    }
  }, [username, originalUsername, minLength, usernameExists]);

  return {
    isValid: !validationResult.error && !validationResult.isChecking,
    error: validationResult.error,
    isChecking: validationResult.isChecking,
  };
}

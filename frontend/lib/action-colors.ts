/**
 * Action Button Color System
 * 
 * Centralized color definitions for all home page action buttons and their related UI elements.
 * Each action has a consistent color scheme used across:
 * - Action button gradients
 * - Notification styles
 * - Detailed modals/sheets
 * - Recent activity feed items
 * - Status badges
 * - Interactive elements
 */

export const ACTION_COLORS = {
    send: {
        name: "Send",
        // Button gradient: blue
        gradient: {
            from: "red-500",
            to: "blue-600",
            class: "from-blue-500 to-blue-600",
        },
        // Light backgrounds for modals/sections
        lightGradient: {
            from: "blue-50",
            to: "indigo-50",
            class: "from-blue-50 to-indigo-50",
        },
        // Text colors
        text: {
            primary: "text-blue-600",
            secondary: "text-blue-700",
            light: "text-blue-500",
        },
        // Background colors
        bg: {
            solid: "bg-blue-500",
            light: "bg-blue-50",
            lighter: "bg-blue-100",
        },
        // Badge colors
        badge: {
            bg: "bg-blue-100",
            text: "text-blue-800",
        },
        // Activity feed icon background
        iconBg: "bg-blue-500",
        // Hex values for when you need raw colors
        hex: {
            primary: "#3B82F6",    // blue-500
            dark: "#2563EB",       // blue-600
            light: "#EFF6FF",      // blue-50
            lighter: "#DBEAFE",    // blue-100
        },
    },

    receive: {
        name: "Receive",
        // Button gradient: green
        gradient: {
            from: "green-500",
            to: "green-600",
            class: "from-green-500 to-green-600",
        },
        // Light backgrounds for modals/sections
        lightGradient: {
            from: "green-50",
            to: "emerald-50",
            class: "from-green-50 to-emerald-50",
        },
        // Text colors
        text: {
            primary: "text-green-600",
            secondary: "text-green-700",
            light: "text-green-500",
        },
        // Background colors
        bg: {
            solid: "bg-green-500",
            light: "bg-green-50",
            lighter: "bg-green-100",
        },
        // Badge colors
        badge: {
            bg: "bg-green-100",
            text: "text-green-800",
        },
        // Activity feed icon background
        iconBg: "bg-green-500",
        // Hex values
        hex: {
            primary: "#10B981",    // green-500
            dark: "#059669",       // green-600
            light: "#F0FDF4",      // green-50
            lighter: "#D1FAE5",    // green-100
        },
    },

    request: {
        name: "Request",
        // Button gradient: amber
        gradient: {
            from: "amber-500",
            to: "amber-600",
            class: "from-amber-500 to-amber-600",
        },
        // Light backgrounds for modals/sections
        lightGradient: {
            from: "amber-50",
            to: "yellow-50",
            class: "from-amber-50 to-yellow-50",
        },
        // Text colors
        text: {
            primary: "text-amber-600",
            secondary: "text-amber-700",
            light: "text-amber-500",
        },
        // Background colors
        bg: {
            solid: "bg-amber-500",
            light: "bg-amber-50",
            lighter: "bg-amber-100",
        },
        // Badge colors
        badge: {
            bg: "bg-amber-100",
            text: "text-amber-800",
        },
        // Activity feed icon background
        iconBg: "bg-amber-500",
        // Hex values
        hex: {
            primary: "#F59E0B",    // amber-500
            dark: "#D97706",       // amber-600
            light: "#FFFBEB",      // amber-50
            lighter: "#FEF3C7",    // amber-100
        },
    },

    paymentLink: {
        name: "Payment Link",
        // Button gradient: purple
        gradient: {
            from: "purple-500",
            to: "purple-600",
            class: "from-purple-500 to-purple-600",
        },
        // Light backgrounds for modals/sections
        lightGradient: {
            from: "purple-50",
            to: "violet-50",
            class: "from-purple-50 to-violet-50",
        },
        // Text colors
        text: {
            primary: "text-purple-600",
            secondary: "text-purple-700",
            light: "text-purple-500",
        },
        // Background colors
        bg: {
            solid: "bg-purple-500",
            light: "bg-purple-50",
            lighter: "bg-purple-100",
        },
        // Badge colors
        badge: {
            bg: "bg-purple-100",
            text: "text-purple-800",
        },
        // Activity feed icon background
        iconBg: "bg-purple-500",
        // Hex values
        hex: {
            primary: "#A855F7",    // purple-500
            dark: "#9333EA",       // purple-600
            light: "#FAF5FF",      // purple-50
            lighter: "#F3E8FF",    // purple-100
        },
    },

    claimLink: {
        name: "Claim Link",
        // Button gradient: pink
        gradient: {
            from: "pink-500",
            to: "pink-600",
            class: "from-pink-500 to-pink-600",
        },
        // Light backgrounds for modals/sections
        lightGradient: {
            from: "pink-50",
            to: "rose-50",
            class: "from-pink-50 to-rose-50",
        },
        // Text colors
        text: {
            primary: "text-pink-600",
            secondary: "text-pink-700",
            light: "text-pink-500",
        },
        // Background colors
        bg: {
            solid: "bg-pink-500",
            light: "bg-pink-50",
            lighter: "bg-pink-100",
        },
        // Badge colors
        badge: {
            bg: "bg-pink-100",
            text: "text-pink-800",
        },
        // Activity feed icon background
        iconBg: "bg-pink-500",
        // Hex values
        hex: {
            primary: "#EC4899",    // pink-500
            dark: "#DB2777",       // pink-600
            light: "#FDF2F8",      // pink-50
            lighter: "#FCE7F3",    // pink-100
        },
    },

    splitBill: {
        name: "Split Bill",
        // Button gradient: teal
        gradient: {
            from: "teal-500",
            to: "teal-600",
            class: "from-teal-500 to-teal-600",
        },
        // Light backgrounds for modals/sections
        lightGradient: {
            from: "teal-50",
            to: "cyan-50",
            class: "from-teal-50 to-cyan-50",
        },
        // Text colors
        text: {
            primary: "text-teal-600",
            secondary: "text-teal-700",
            light: "text-teal-500",
        },
        // Background colors
        bg: {
            solid: "bg-teal-500",
            light: "bg-teal-50",
            lighter: "bg-teal-100",
        },
        // Badge colors
        badge: {
            bg: "bg-teal-100",
            text: "text-teal-800",
        },
        // Activity feed icon background
        iconBg: "bg-teal-500",
        // Hex values
        hex: {
            primary: "#14B8A6",    // teal-500
            dark: "#0D9488",       // teal-600
            light: "#F0FDFA",      // teal-50
            lighter: "#CCFBF1",    // teal-100
        },
    },
} as const;

// Type exports for better TypeScript support
export type ActionType = keyof typeof ACTION_COLORS;
export type ActionColor = typeof ACTION_COLORS[ActionType];

/**
 * Utility function to get action colors by action type
 * @param action The action type
 * @returns The color configuration for the action
 * 
 * @example
 * const sendColors = getActionColors('send');
 * <div className={`bg-linear-to-br ${sendColors.gradient.class}`}>
 */
export function getActionColors(action: ActionType): ActionColor {
    return ACTION_COLORS[action];
}

/**
 * Get the full gradient class string for an action button
 * @param action The action type
 * @returns The complete Tailwind gradient class string
 * 
 * @example
 * <Button className={`bg-linear-to-br ${getActionGradient('send')}`}>
 */
export function getActionGradient(action: ActionType): string {
    return ACTION_COLORS[action].gradient.class;
}

/**
 * Get the light gradient class string for modal/section backgrounds
 * @param action The action type
 * @returns The complete Tailwind light gradient class string
 * 
 * @example
 * <div className={`bg-linear-to-br ${getActionLightGradient('send')}`}>
 */
export function getActionLightGradient(action: ActionType): string {
    return ACTION_COLORS[action].lightGradient.class;
}

/**
 * Get badge classes for an action
 * @param action The action type
 * @returns Object with bg and text classes
 * 
 * @example
 * const badge = getActionBadge('send');
 * <Badge className={`${badge.bg} ${badge.text}`}>Completed</Badge>
 */
export function getActionBadge(action: ActionType) {
    return ACTION_COLORS[action].badge;
}

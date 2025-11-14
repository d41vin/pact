import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePactModal from "../create-pact-modal";
import { Id } from "@/convex/_generated/dataModel";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock @reown/appkit/react
vi.mock("@reown/appkit/react", () => ({
  useAppKitAccount: () => ({
    address: "0x123456789",
  }),
}));

// Mock convex/react
const mockUseMutation = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (fn: unknown) => mockUseMutation(fn),
  useQuery: (fn: unknown, args: unknown) => mockUseQuery(fn, args),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockMembers = [
  {
    _id: "user1" as Id<"users">,
    name: "Alice Johnson",
    username: "alice",
    profileImageUrl: "/alice.jpg",
  },
  {
    _id: "user2" as Id<"users">,
    name: "Bob Smith",
    username: "bob",
    profileImageUrl: "/bob.jpg",
  },
];

const mockTemplates = [
  {
    _id: "template1" as Id<"pacts">,
    name: "Group Fund",
    description: "Pooled savings for group expenses",
    type: "group" as const,
    category: "system" as const,
    icon: "wallet",
    color: "#3B82F6",
    isActive: true,
    version: "1.0.0",
    config: {
      requiredFields: ["instanceName"],
      optionalFields: ["goal", "deadline"],
      minMembers: 1,
    },
  },
  {
    _id: "template2" as Id<"pacts">,
    name: "Expense Split",
    description: "Split bills and expenses equally",
    type: "group" as const,
    category: "system" as const,
    icon: "split",
    color: "#10B981",
    isActive: true,
    version: "1.0.0",
    config: {
      requiredFields: ["instanceName", "splitMethod"],
      optionalFields: ["autoSettle", "reminderEnabled"],
      minMembers: 2,
    },
  },
];

describe("CreatePactModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    groupId: "group1" as Id<"groups">,
    groupName: "Test Group",
    members: mockMembers,
    accentColor: "#3B82F6",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(mockTemplates);
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("renders modal with template selection", async () => {
    render(<CreatePactModal {...defaultProps} />);

    expect(screen.getByText("Create New Pact")).toBeInTheDocument();
    expect(screen.getByText("Choose a template and configure your pact")).toBeInTheDocument();
    expect(screen.getByText("Select Pact Template")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Group Fund")).toBeInTheDocument();
      expect(screen.getByText("Expense Split")).toBeInTheDocument();
    });
  });

  it("shows loading state when templates are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<CreatePactModal {...defaultProps} />);

    expect(screen.getByText("Select Pact Template")).toBeInTheDocument();
    const loader = document.querySelector(".animate-spin");
    expect(loader).toBeInTheDocument();
  });

  it("shows empty state when no templates are available", () => {
    mockUseQuery.mockReturnValue([]);
    render(<CreatePactModal {...defaultProps} />);

    expect(screen.getByText("No pact templates available")).toBeInTheDocument();
  });

  it("allows selecting a template and shows configuration fields", async () => {
    const user = userEvent.setup();
    render(<CreatePactModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Group Fund")).toBeInTheDocument();
    });

    const groupFundButton = screen.getByText("Group Fund").closest("button");
    expect(groupFundButton).toBeInTheDocument();
    await user.click(groupFundButton!);

    await waitFor(() => {
      expect(screen.getByLabelText("Pact Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Goal Amount (Optional)")).toBeInTheDocument();
      expect(screen.getByText("Participants (Optional)")).toBeInTheDocument();
    });

    const pactNameInput = screen.getByLabelText("Pact Name") as HTMLInputElement;
    expect(pactNameInput.value).toBe("Group Fund");
  });

  it("validates required fields before submission", async () => {
    const user = userEvent.setup();
    render(<CreatePactModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Group Fund")).toBeInTheDocument();
    });

    const groupFundButton = screen.getByText("Group Fund").closest("button");
    await user.click(groupFundButton!);

    await waitFor(() => {
      const pactNameInput = screen.getByLabelText("Pact Name") as HTMLInputElement;
      expect(pactNameInput).toBeInTheDocument();
    });

    const pactNameInput = screen.getByLabelText("Pact Name") as HTMLInputElement;
    await user.clear(pactNameInput);

    // Check that the create button is disabled when pact name is empty
    const createButton = screen.getByRole("button", { name: /create pact/i });
    expect(createButton).toBeDisabled();
  });

  it("successfully creates a pact with valid data", async () => {
    const { toast } = await import("sonner");
    const mockCreatePact = vi.fn().mockResolvedValue("pact1");
    mockUseMutation.mockReturnValue(mockCreatePact);

    const user = userEvent.setup();
    render(<CreatePactModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Group Fund")).toBeInTheDocument();
    });

    const groupFundButton = screen.getByText("Group Fund").closest("button");
    await user.click(groupFundButton!);

    await waitFor(() => {
      expect(screen.getByLabelText("Pact Name")).toBeInTheDocument();
    });

    const pactNameInput = screen.getByLabelText("Pact Name") as HTMLInputElement;
    await user.clear(pactNameInput);
    await user.type(pactNameInput, "Vacation Fund");

    const goalInput = screen.getByLabelText("Goal Amount (Optional)") as HTMLInputElement;
    await user.type(goalInput, "1000");

    const createButton = screen.getByRole("button", { name: /create pact/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockCreatePact).toHaveBeenCalledWith({
        userAddress: "0x123456789",
        groupId: "group1",
        pactId: "template1",
        instanceName: "Vacation Fund",
        config: {
          goal: 1000,
          participants: [],
        },
      });
      expect(toast.success).toHaveBeenCalledWith("Vacation Fund created successfully!");
    });
  });

  it("handles pact creation errors", async () => {
    const { toast } = await import("sonner");
    const mockCreatePact = vi.fn().mockRejectedValue(new Error("Failed to create pact"));
    mockUseMutation.mockReturnValue(mockCreatePact);

    const user = userEvent.setup();
    render(<CreatePactModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Group Fund")).toBeInTheDocument();
    });

    const groupFundButton = screen.getByText("Group Fund").closest("button");
    await user.click(groupFundButton!);

    await waitFor(() => {
      expect(screen.getByLabelText("Pact Name")).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", { name: /create pact/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create pact");
    });
  });

  it("allows selecting participants", async () => {
    const user = userEvent.setup();
    render(<CreatePactModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Group Fund")).toBeInTheDocument();
    });

    const groupFundButton = screen.getByText("Group Fund").closest("button");
    await user.click(groupFundButton!);

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    });

    const aliceCheckbox = screen.getByText("Alice Johnson").closest("label")?.querySelector("input");
    expect(aliceCheckbox).toBeInTheDocument();
    await user.click(aliceCheckbox!);

    expect(aliceCheckbox).toBeChecked();
  });

  it("resets form when cancelled", async () => {
    const user = userEvent.setup();
    render(<CreatePactModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Group Fund")).toBeInTheDocument();
    });

    const groupFundButton = screen.getByText("Group Fund").closest("button");
    await user.click(groupFundButton!);

    await waitFor(() => {
      expect(screen.getByLabelText("Pact Name")).toBeInTheDocument();
    });

    const pactNameInput = screen.getByLabelText("Pact Name") as HTMLInputElement;
    await user.clear(pactNameInput);
    await user.type(pactNameInput, "Test Pact");

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});

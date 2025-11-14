import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PactsOverview from "../pacts-overview";
import { Id } from "@/convex/_generated/dataModel";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock @reown/appkit/react
vi.mock("@reown/appkit/react", () => ({
  useAppKitAccount: () => ({
    address: "0x123456789",
  }),
}));

// Mock convex/react
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (fn: unknown, args: unknown) => mockUseQuery(fn, args),
  useMutation: (fn: unknown) => mockUseMutation(fn),
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

const mockPacts = [
  {
    _id: "pact1" as Id<"groupPacts">,
    groupId: "group1" as Id<"groups">,
    pactId: "template1" as Id<"pacts">,
    instanceName: "Vacation Fund",
    createdBy: "user1" as Id<"users">,
    createdAt: Date.now() - 86400000, // 1 day ago
    status: "active" as const,
    config: {
      goal: 1000,
      deadline: undefined,
      participants: ["user1" as Id<"users">, "user2" as Id<"users">],
      settings: {},
    },
    balance: 500,
    totalContributions: 500,
    totalWithdrawals: 0,
    lastActivityAt: Date.now() - 3600000, // 1 hour ago
    template: {
      _id: "template1" as Id<"pacts">,
      name: "Group Fund",
      description: "Pooled savings",
      type: "group" as const,
      category: "system" as const,
      icon: "wallet",
      color: "#3B82F6",
      isActive: true,
      version: "1.0.0",
      config: {
        requiredFields: ["instanceName"],
        optionalFields: ["goal"],
        minMembers: 1,
      },
    },
    creator: {
      _id: "user1" as Id<"users">,
      name: "Alice",
      username: "alice",
      userAddress: "0x123",
      _creationTime: Date.now(),
    },
    participantCount: 2,
  },
  {
    _id: "pact2" as Id<"groupPacts">,
    groupId: "group1" as Id<"groups">,
    pactId: "template2" as Id<"pacts">,
    instanceName: "Expense Split",
    createdBy: "user2" as Id<"users">,
    createdAt: Date.now() - 172800000, // 2 days ago
    status: "active" as const,
    config: {
      goal: undefined,
      deadline: undefined,
      participants: ["user1" as Id<"users">],
      settings: {},
    },
    balance: 250,
    totalContributions: 300,
    totalWithdrawals: 50,
    lastActivityAt: Date.now() - 7200000, // 2 hours ago
    template: {
      _id: "template2" as Id<"pacts">,
      name: "Expense Split",
      description: "Split bills",
      type: "group" as const,
      category: "system" as const,
      icon: "split",
      color: "#10B981",
      isActive: true,
      version: "1.0.0",
      config: {
        requiredFields: ["instanceName"],
        optionalFields: [],
        minMembers: 2,
      },
    },
    creator: {
      _id: "user2" as Id<"users">,
      name: "Bob",
      username: "bob",
      userAddress: "0x456",
      _creationTime: Date.now(),
    },
    participantCount: 1,
  },
];

describe("PactsOverview", () => {
  const defaultProps = {
    groupId: "group1" as Id<"groups">,
    groupName: "Test Group",
    members: mockMembers,
    accentColor: "#3B82F6",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(mockPacts);
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("renders pacts overview with header", () => {
    render(<PactsOverview {...defaultProps} />);

    expect(screen.getByText("Pacts")).toBeInTheDocument();
    expect(screen.getByText("Financial tools for group coordination")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create pact/i })).toBeInTheDocument();
  });

  it("shows loading skeletons when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<PactsOverview {...defaultProps} />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state when data is null", () => {
    mockUseQuery.mockReturnValue(null);
    render(<PactsOverview {...defaultProps} />);

    expect(screen.getByText("Failed to Load Pacts")).toBeInTheDocument();
    expect(screen.getByText("There was an error loading the pacts for this group.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows empty state when no pacts exist", () => {
    mockUseQuery.mockReturnValue([]);
    render(<PactsOverview {...defaultProps} />);

    expect(screen.getByText("No Active Pacts")).toBeInTheDocument();
    expect(screen.getByText(/Create your first pact to start coordinating finances/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create your first pact/i })).toBeInTheDocument();
  });

  it("renders pact cards with correct data", () => {
    render(<PactsOverview {...defaultProps} />);

    expect(screen.getByText("Vacation Fund")).toBeInTheDocument();
    expect(screen.getByText("Expense Split")).toBeInTheDocument();

    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("$250.00")).toBeInTheDocument();

    expect(screen.getByText("2 participants")).toBeInTheDocument();
    expect(screen.getByText("1 participant")).toBeInTheDocument();
  });

  it("displays goal progress when goal is set", () => {
    render(<PactsOverview {...defaultProps} />);

    expect(screen.getByText("Goal: $1000.00")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("navigates to pact detail when card is clicked", async () => {
    const user = userEvent.setup();
    render(<PactsOverview {...defaultProps} />);

    const vacationFundCard = screen.getByText("Vacation Fund").closest("button");
    expect(vacationFundCard).toBeInTheDocument();

    await user.click(vacationFundCard!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/groups/group1/pacts/pact1");
    });
  });

  it("opens create modal when create button is clicked", async () => {
    const user = userEvent.setup();
    render(<PactsOverview {...defaultProps} />);

    const createButton = screen.getByRole("button", { name: /create pact/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Pact")).toBeInTheDocument();
    });
  });

  it("respects canCreatePacts permission", () => {
    render(<PactsOverview {...defaultProps} canCreatePacts={false} />);

    const createButton = screen.getByRole("button", { name: /create pact/i });
    expect(createButton).toBeDisabled();
  });

  it("uses external modal state when provided", () => {
    const onCreateModalOpenChange = vi.fn();
    render(
      <PactsOverview
        {...defaultProps}
        createModalOpen={true}
        onCreateModalOpenChange={onCreateModalOpenChange}
      />,
    );

    expect(screen.getByText("Create New Pact")).toBeInTheDocument();
  });

  it("formats timestamps correctly", () => {
    render(<PactsOverview {...defaultProps} />);

    expect(screen.getByText(/1h ago/)).toBeInTheDocument();
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
  });

  it("handles pacts without templates gracefully", () => {
    const pactsWithoutTemplate = [
      {
        ...mockPacts[0],
        template: null,
      },
    ];
    mockUseQuery.mockReturnValue(pactsWithoutTemplate);

    render(<PactsOverview {...defaultProps} />);

    expect(screen.getByText("Vacation Fund")).toBeInTheDocument();
  });
});

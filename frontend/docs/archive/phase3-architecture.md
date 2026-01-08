# Phase 3 - Pacts System Architecture

## System Overview

The Pacts system enables groups to create programmable financial agreements on Hedera. Each pact type has specific logic and smart contract integration.

---

## Database Schema Updates

### Enhanced `pacts` Table

```typescript
pacts: {
  name: string,                    // Pact template name
  description: string,             // What it does
  type: "personal" | "group",     // Scope
  category: "system" | "private" | "community",
  icon: string,                    // Icon identifier
  color: string,                   // Hex color
  contractAddress?: string,        // Hedera contract
  creatorId?: Id<"users"),        // Who created (for private)
  isActive: boolean,               // Available for use
  version: string,                 // e.g. "1.0.0"
  config: {                        // Template configuration
    requiredFields: string[],      // Fields users must provide
    optionalFields: string[],      // Optional configuration
    minMembers?: number,           // Minimum participants
    maxMembers?: number,           // Maximum participants
  }
}
```

### Enhanced `groupPacts` Table

```typescript
groupPacts: {
  groupId: Id<"groups">,
  pactId: Id<"pacts">,
  instanceName: string,            // User's name for this instance
  createdBy: Id<"users">,
  createdAt: number,
  status: "active" | "paused" | "completed" | "cancelled",

  // Configuration
  config: {
    goal?: number,                 // Target amount
    deadline?: number,             // Timestamp
    participants: Id<"users">[],   // Who's involved
    settings: any,                 // Pact-specific settings
  },

  // Financial State
  balance: number,                 // Current balance
  totalContributions: number,      // Sum of all deposits
  totalWithdrawals: number,        // Sum of all withdrawals

  // Hedera Integration
  hederaAccountId?: string,        // Associated Hedera account
  contractState?: any,             // Current contract state

  // Metadata
  lastActivityAt: number,
}
```

### New `pactTransactions` Table

```typescript
pactTransactions: {
  pactInstanceId: Id<"groupPacts">,
  userId: Id<"users">,
  type: "deposit" | "withdrawal" | "transfer" | "fee",
  amount: number,

  // Hedera
  hederaTransactionId?: string,    // On-chain transaction
  hederaTimestamp?: number,
  status: "pending" | "confirmed" | "failed",

  // Context
  description?: string,
  metadata?: any,                  // Pact-specific data

  // Timestamps
  createdAt: number,
  confirmedAt?: number,
}
```

### New `pactParticipants` Table

```typescript
pactParticipants: {
  pactInstanceId: Id<"groupPacts">,
  userId: Id<"users">,
  role: "creator" | "participant",

  // Contributions
  totalContributed: number,
  totalWithdrawn: number,
  netPosition: number,             // contributed - withdrawn

  // Status
  isActive: boolean,
  joinedAt: number,
  leftAt?: number,
}
```

### New `pactActions` Table

```typescript
pactActions: {
  pactInstanceId: Id<"groupPacts">,
  userId: Id<"users">,
  actionType: string,              // e.g. "split_expense", "request_loan"
  actionData: any,                 // Type-specific data
  status: "pending" | "approved" | "rejected" | "completed",

  // Approval (for actions requiring consensus)
  requiredApprovals?: number,
  approvals: Id<"users">[],
  rejections: Id<"users">[],

  createdAt: number,
  resolvedAt?: number,
}
```

---

## Pact Types Implementation

### 1. Group Fund

**Purpose:** Pooled savings for shared expenses

**Features:**

- All members can contribute
- Goal-based tracking
- Admin-approved withdrawals
- Transaction history

**Config:**

```typescript
{
  goal?: number,
  allowContributions: boolean,
  withdrawalApprovalRequired: boolean,
  minContribution?: number,
}
```

### 2. Expense Split

**Purpose:** Split bills and expenses equally or by custom ratios

**Features:**

- Add expenses with description
- Auto-calculate splits
- Track who owes whom
- Settlement tracking

**Config:**

```typescript
{
  splitMethod: "equal" | "custom" | "proportional",
  autoSettle: boolean,
  reminderEnabled: boolean,
}
```

### 3. Loan Pool

**Purpose:** Internal lending with tracked repayments

**Features:**

- Members can request loans
- Approval voting system
- Repayment schedules
- Interest tracking (optional)

**Config:**

```typescript
{
  maxLoanAmount: number,
  interestRate?: number,
  repaymentPeriod: number,        // days
  votingThreshold: number,        // % approval needed
}
```

### 4. Investment Club

**Purpose:** Pool funds for group investments

**Features:**

- Contribution tracking
- Investment proposals
- Profit/loss distribution
- Exit mechanism

**Config:**

```typescript
{
  minimumInvestment: number,
  lockPeriod?: number,             // days
  profitDistribution: "proportional" | "equal",
  votingRequired: boolean,
}
```

---

## API Design

### Mutations

#### Pact Management

- `createPactInstance` - Create a pact from template
- `updatePactInstance` - Update configuration
- `pausePactInstance` - Temporarily pause
- `completePactInstance` - Mark as complete
- `cancelPactInstance` - Cancel and return funds

#### Transactions

- `contributeToPact` - Add funds
- `withdrawFromPact` - Remove funds (if allowed)
- `transferWithinPact` - Move funds between participants

#### Actions (Pact-specific)

- `submitExpense` - Add expense to split
- `requestLoan` - Request loan from pool
- `proposeInvestment` - Propose investment
- `voteOnAction` - Approve/reject action

### Queries

- `listGroupPacts` - All pacts for a group
- `getPactInstance` - Details of specific pact
- `getPactTransactions` - Transaction history
- `getPactParticipants` - Member contributions
- `getPactActions` - Pending/completed actions
- `calculateBalances` - Current balances per user

---

## Hedera Integration Strategy

### Phase 3A: Backend Foundation (Current)

- Database schema
- CRUD operations
- Business logic
- **Mock Hedera calls** (return success)

### Phase 3B: Hedera Integration (Next)

- Smart contract deployment
- Transaction signing
- Balance verification
- Event listening

### Phase 3C: Advanced Features (Later)

- Multi-sig wallets
- Automated distributions
- Dispute resolution
- Audit logs

---

## Security Considerations

1. **Transaction Validation**
   - Verify sufficient balance
   - Check participant permissions
   - Validate amount limits

2. **Access Control**
   - Only participants can transact
   - Role-based permissions
   - Admin approvals where needed

3. **State Consistency**
   - Atomic operations
   - Balance reconciliation
   - Failed transaction handling

4. **Audit Trail**
   - Log all actions
   - Immutable transaction records
   - Track approval history

---

## Implementation Order

### Week 1: Foundation

1. ✅ Schema definition (this document)
2. ⏳ Database tables in Convex
3. ⏳ Base mutations (create, update, delete)
4. ⏳ Base queries (list, get, calculate)

### Week 2: Pact Types

1. ⏳ Group Fund implementation
2. ⏳ Expense Split implementation
3. ⏳ Loan Pool implementation
4. ⏳ Investment Club implementation

### Week 3: Integration

1. ⏳ UI components for pact management
2. ⏳ Transaction flows
3. ⏳ Action approval system
4. ⏳ Mock Hedera integration

### Week 4: Polish

1. ⏳ Error handling
2. ⏳ Loading states
3. ⏳ Real-time updates
4. ⏳ Testing

---

## Success Metrics

- [ ] Create all 4 pact types
- [ ] Deposit/withdraw flows working
- [ ] Transaction history accurate
- [ ] Balance calculations correct
- [ ] Approval system functional
- [ ] Mock Hedera integration complete
- [ ] UI matches mock pacts design

---

**Status:** Architecture defined ✅  
**Next:** Implement database schema in Convex

# Mylo (MonEX) — Complete Feature Documentation

> **Version**: Current Build  
> **Stack**: React 18 + Vite + Tailwind CSS + TypeScript + Supabase (Lovable Cloud) + Capacitor  
> **Languages**: Uzbek (O'zbekcha), Russian (Русский), English  
> **Currency Default**: UZS (Uzbek So'm)

---

## Table of Contents

1. [App Architecture Overview](#1-app-architecture-overview)
2. [Onboarding Flow](#2-onboarding-flow)
3. [Authentication](#3-authentication)
4. [Bottom Navigation](#4-bottom-navigation)
5. [Home Screen](#5-home-screen)
6. [Transactions Screen (Activity)](#6-transactions-screen-activity)
7. [AI Screen](#7-ai-screen)
8. [More Screen (Tools Hub)](#8-more-screen-tools-hub)
9. [Goals Screen](#9-goals-screen)
10. [Analytics Screen](#10-analytics-screen)
11. [Limits (Budgets) Screen](#11-limits-budgets-screen)
12. [Accounts Screen](#12-accounts-screen)
13. [Reports Screen](#13-reports-screen)
14. [Subscriptions Screen](#14-subscriptions-screen)
15. [Recurring Transactions Screen](#15-recurring-transactions-screen)
16. [Bill Split Screen](#16-bill-split-screen)
17. [Net Worth Screen](#17-net-worth-screen)
18. [Investments Screen](#18-investments-screen)
19. [Cash Flow Screen](#19-cash-flow-screen)
20. [Envelopes (Budget Envelopes) Screen](#20-envelopes-budget-envelopes-screen)
21. [Debt Assessment Screen](#21-debt-assessment-screen)
22. [Debt Payoff Screen](#22-debt-payoff-screen)
23. [Settings Screen](#23-settings-screen)
24. [Help Screen](#24-help-screen)
25. [Learn Screen](#25-learn-screen)
26. [AI Features (Modals)](#26-ai-features-modals)
27. [Notifications System](#27-notifications-system)
28. [Telegram Integration](#28-telegram-integration)
29. [Voice Input](#29-voice-input)
30. [Receipt Scanner](#30-receipt-scanner)
31. [Data & Storage](#31-data--storage)
32. [Edge Functions (Backend)](#32-edge-functions-backend)

---

## 1. App Architecture Overview

### File Structure
- **`src/App.tsx`** — Root router with routes: `/` (main app), `/auth`, `/telegram-auth`, `/privacy`, `/terms`
- **`src/components/HamyonApp.tsx`** — Main app shell. Manages screen routing via `activeScreen` state (not URL-based), lazy-loads all screens, handles modals (Add Transaction, Notifications)
- **`src/context/AppContext.tsx`** — Global state provider: user data, transactions, limits, goals, theme, language, currency, auth state
- **`src/pages/Index.tsx`** — Entry point that renders `HamyonApp`

### Navigation Model
The app uses a **single-page screen switcher** (not React Router for internal screens). The `activeScreen` state in `AppContext` determines which screen component renders. The `ScreenType` union type defines all possible screens:

```
home | transactions | categories | limits | goals | debts | analytics | ai | recurring | settings | accounts | debt-assessment | reports | subscriptions | subscriptions-add | bill-split | net-worth | investments | envelopes | cash-flow | debt-payoff | more | help | learn
```

### Page Transitions
All screen changes use Framer Motion with slide + fade animations (250ms ease-out enter, 200ms ease-in exit).

---

## 2. Onboarding Flow

**File**: `src/components/OnboardingFlow.tsx`

### What it does
First-time user experience. Shown when `onboardingComplete` is `false` in AppContext.

### Steps (in order)
1. **Language Selection** — User picks Uzbek, Russian, or English
2. **Onboarding Questions** (`OnboardingQuestions.tsx`) — 5 questions to personalize the experience:
   - Financial goal (save more, track spending, pay off debt, invest)
   - Monthly income range
   - Biggest spending category
   - Preferred tracking method
   - Notification preferences
3. **Auth Choice** — User chooses to sign in/sign up or continue as guest
4. **Completion** — Sets `onboardingComplete = true`, stores in localStorage

### Key behaviors
- Questions can be skipped
- Language choice persists to app settings
- Answers personalize quick-add presets and category defaults

---

## 3. Authentication

**Files**: `src/pages/Auth.tsx`, `src/pages/TelegramAuth.tsx`, `src/hooks/useAuth.ts`, `src/lib/auth.ts`

### Features
- **Email + Password** sign up and sign in
- **Telegram Mini App** authentication (auto-detected)
- **Guest mode** — Full functionality with local storage only
- **Profile creation** — Auto-creates a `profiles` row on first sign-in
- **Session management** — Supabase auth session with auto-refresh

### Database tables involved
- `profiles` — User metadata (name, email, avatar, telegram_id, biometric_enabled, pin_hash)

---

## 4. Bottom Navigation

**File**: `src/components/BottomNav.tsx`

### Tabs (left to right)
| Tab | Icon | Screen | Purpose |
|-----|------|--------|---------|
| Home | 🏠 | `home` | Dashboard overview |
| Activity | 📊 | `transactions` | Transaction history |
| **+ (Center FAB)** | ➕ | — | Opens Add Transaction modal |
| AI | 🧠 | `ai` | AI insights & tools |
| More | ⋯ | `more` | All tools & features |

### Screen-to-tab mapping
- `home` → Home tab highlighted
- `transactions` → Activity tab highlighted
- `ai`, `debt-assessment`, `cash-flow`, `net-worth`, `investments` → AI tab highlighted
- Everything else → More tab highlighted

---

## 5. Home Screen

**File**: `src/components/HomeScreen.tsx`

### Sections (top to bottom)

#### 5.1 Header
- **User avatar** (first letter of name) + greeting
- **Voice Input button** — Opens voice transaction recorder
- **Sync button** — Pulls latest data from cloud

#### 5.2 Balance Card
- Shows current total balance in UZS
- Calculated from sum of all transactions

#### 5.3 Today Summary (2 cards)
- **Today's Expenses** — Sum of today's negative transactions
- **Today's Income** — Sum of today's positive transactions

#### 5.4 Week Insight Card
- **Week spending total** with percentage change vs last week
- Green arrow ↓ if spending decreased, red arrow ↑ if increased

#### 5.5 AI Insights Widget
- **File**: `src/components/AIInsightsWidget.tsx`
- Shows AI-generated spending insights
- Calls the `insights` edge function
- Displays warnings, patterns, predictions, suggestions, achievements
- "See more" opens full AI Copilot panel

#### 5.6 Telegram Integration Card
- If authenticated but Telegram not linked → Shows "Connect Telegram" CTA
- If Telegram linked → Shows connected status with username

#### 5.7 Quick Action Buttons
- **Add Expense** — Opens Add Transaction modal (expense mode)
- **Add Income** — Opens Add Transaction modal (income mode)

#### 5.8 Monthly Budgets Section
- Shows top 3 budget limits with progress bars
- Category icon, name, spent/total amounts, percentage
- Red styling when over budget (≥100%)
- "View All" → navigates to Limits screen

#### 5.9 Quick Add Section
- 4 preset buttons for common expenses (coffee ☕, restaurant 🍽️, taxi 🚕, shopping 🛍️)
- Each shows category icon + amount
- **Long press to edit** — Adjust the preset amount with ±stepper
- Amounts saved to localStorage

#### 5.10 AI Modals (accessible from Home)
- AI Copilot Panel
- Finance Planner Modal
- Budget Simulator Modal

---

## 6. Transactions Screen (Activity)

**File**: `src/components/TransactionsScreen.tsx`

### Features
- **Full transaction history** grouped by date
- **Search** — Filter by description text
- **Category filter** — Filter by expense category
- **Type filter** — Show expenses, income, or all
- **Date range filter** — Custom date range selection
- **Transaction details** — Tap to view/edit
- **Edit transaction** — Opens AddTransactionModal in edit mode
- **Delete transaction** — Swipe or button to remove

### Add Transaction Modal
**File**: `src/components/AddTransactionModal.tsx`
- **Type selector**: Expense / Income / Debt
- **Amount input** with currency display
- **Category picker** with icons and colors
- **Description** text field
- **Date picker** (defaults to today)
- **Time** (auto-captured)
- **Account selector** (if multiple accounts exist)
- **For transfers**: Source and destination account pickers
- **Edit mode**: Pre-fills all fields, allows updating or deleting

---

## 7. AI Screen

**File**: `src/components/AIScreen.tsx`

### What it does
Dedicated screen for AI-powered financial insights and tools.

### Sections

#### 7.1 AI Insights Feed
- Fetches insights from the `insights` edge function
- Categories: **Warning**, **Pattern**, **Prediction**, **Suggestion**, **Achievement**
- Severity levels: low, medium, high, critical
- Each insight has title, message, and optional action button
- Pull-to-refresh to get new insights

#### 7.2 AI Tool Cards
- **AI Financial Copilot** → Opens AICopilotPanel
- **Finance Planner** → Opens FinancePlannerModal
- **Budget Simulator** → Opens BudgetSimulatorModal

#### 7.3 Quick Stats
- Monthly spending summary
- Top spending category
- Savings rate calculation

---

## 8. More Screen (Tools Hub)

**File**: `src/components/MoreScreen.tsx`

### What it does
Central hub for all app tools and features, organized in sections.

### AI Features Section (top)
| Feature | Description |
|---------|-------------|
| **AI Financial Copilot** | Chat-based AI advisor analyzing your spending behavior, patterns, and providing personalized recommendations |
| **Finance Planner** | AI generates financial goals and step-by-step plans based on your income/expenses |
| **Budget Simulator** | "What if" scenario calculator — see impact of daily habits on monthly/yearly budget |
| **Spending Challenge** | Weekly no-spend goals with streak tracking |

### All Tools Grid (15 tools)
| Tool | Screen | Description |
|------|--------|-------------|
| **Goals** | `goals` | Set and track savings goals with progress bars |
| **Analytics** | `analytics` | Visual charts and breakdowns of spending patterns |
| **Limits** | `limits` | Set monthly spending limits per category |
| **Accounts** | `accounts` | Manage multiple accounts (bank, wallet, cash, card, savings) |
| **Reports** | `reports` | Monthly financial reports with detailed breakdowns |
| **Subscriptions** | `subscriptions` | Track recurring subscriptions with renewal reminders |
| **Recurring** | `recurring` | Manage auto-repeating transactions (daily/weekly/monthly/yearly) |
| **Bill Split** | `bill-split` | Split expenses among friends with settlement tracking |
| **Net Worth** | `net-worth` | Track total assets minus liabilities over time |
| **Investments** | `investments` | Portfolio tracker for stocks, crypto, ETFs, mutual funds |
| **Cash Flow** | `cash-flow` | Forecast future balance based on recurring income/expenses |
| **Envelopes** | `envelopes` | Envelope budgeting system — allocate money to spending categories |
| **Debt Assessment** | `debt-assessment` | Evaluate if you can afford new debt (debt-to-income ratio) |
| **Debt Payoff** | `debt-payoff` | Snowball vs Avalanche debt repayment strategy calculator |
| **Settings** | `settings` | App configuration and preferences |

### Smart Features
- **Search bar** — Filter tools by name or description
- **Frequently Used** — Auto-tracks tool usage, shows top 4 most-used tools as quick access chips
- Tool usage data persisted in localStorage

---

## 9. Goals Screen

**File**: `src/components/GoalsScreen.tsx`

### What it does
Track savings goals with visual progress indicators.

### Features
- **Create goal**: Name, target amount, current amount, emoji, optional deadline
- **Progress bar** with percentage
- **Add/withdraw funds** from goals
- **Goal cards** showing emoji, name, progress, remaining amount
- **Deadline tracking** with days remaining
- **Database-synced** when authenticated (goals table)

### Data Model
```typescript
interface Goal {
  id: string;
  name: string;
  target: number;      // Target amount
  current: number;     // Current saved amount
  emoji: string;       // Display emoji
  deadline?: string;   // Optional target date
  remote?: boolean;    // Synced to cloud
}
```

---

## 10. Analytics Screen

**File**: `src/components/AnalyticsScreen.tsx`

### What it does
Visual breakdown of spending and income patterns using Recharts.

### Features
- **Pie chart** — Category breakdown of expenses
- **Bar chart** — Daily/weekly/monthly spending trends
- **Time period selector** — This week, this month, last month, custom range
- **Top categories** list with amounts and percentages
- **Income vs Expenses** comparison
- **Spending trends** over time

---

## 11. Limits (Budgets) Screen

**File**: `src/components/LimitsScreen.tsx`

### What it does
Set monthly spending limits per category and track progress.

### Features
- **Create limit**: Select category + set monthly amount
- **Progress bars** per category showing spent vs limit
- **Over-budget warnings** when spending exceeds limit (red styling)
- **Edit/delete** existing limits
- **Database-synced** when authenticated (limits table)

### Data Model
```typescript
interface Limit {
  id: string;
  categoryId: string;  // Links to expense category
  amount: number;      // Monthly limit amount
  remote?: boolean;
}
```

---

## 12. Accounts Screen

**File**: `src/components/AccountsScreen.tsx`

### What it does
Manage multiple financial accounts and track balances.

### Features
- **Account types**: Bank, Wallet, Cash, Card, Savings
- **Create account**: Name, type, initial balance, currency, emoji, color
- **Transfer between accounts** — Move money between accounts
- **Per-account balance** tracking
- **Default account** selection
- **Account-specific transaction filtering**

### Data Model
```typescript
interface Account {
  id: string;
  name: string;
  type: "bank" | "wallet" | "cash" | "card" | "savings";
  balance: number;
  currency: string;
  emoji: string;
  color: string;
  isDefault?: boolean;
}
```

---

## 13. Reports Screen

**File**: `src/components/ReportsScreen.tsx`

### What it does
Generate detailed monthly financial reports.

### Features
- **Month/year selector**
- **Summary card**: Total income, total expenses, net savings
- **Category breakdown table** with amounts and percentages
- **Daily spending chart**
- **Top 5 largest expenses**
- **Month-over-month comparison**

---

## 14. Subscriptions Screen

**File**: `src/components/SubscriptionsScreen.tsx`

### What it does
Track recurring subscriptions and their costs.

### Features
- **Add subscription**: Name, amount, frequency (weekly/monthly/yearly), next billing date, category, emoji
- **Reminder settings** — Days before renewal to notify
- **Auto-renew toggle**
- **Active/inactive toggle** for each subscription
- **Monthly cost summary** — Total subscription spending
- **Upcoming renewals** list

### Data Model
```typescript
interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: "weekly" | "monthly" | "yearly";
  nextBillingDate: string;
  category: string;
  emoji: string;
  active: boolean;
  reminderDays: number;
  autoRenew: boolean;
}
```

---

## 15. Recurring Transactions Screen

**File**: `src/components/RecurringScreen.tsx`

### What it does
Manage automatically repeating transactions.

### Features
- **Create recurring transaction**: Type (expense/income), amount, category, description, frequency, start date
- **Frequencies**: Daily, Weekly, Monthly, Yearly
- **Active/pause toggle**
- **Next occurrence date** display
- **Auto-generation** of transactions on due dates
- **Edit/delete** recurring items

### Data Model
```typescript
interface RecurringTransaction {
  id: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  categoryId: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextDate: string;
  active: boolean;
  emoji?: string;
  accountId?: string;
}
```

---

## 16. Bill Split Screen

**File**: `src/components/BillSplitScreen.tsx`

### What it does
Split expenses among multiple people and track who owes what.

### Features
- **Create bill**: Title, total amount, who paid, date
- **Add participants** with names
- **Split methods**: Equal split, custom amounts
- **Settlement tracking** — Mark participants as paid
- **Bill history** with settled/unsettled status

### Data Model
```typescript
interface BillSplit {
  id: string;
  title: string;
  totalAmount: number;
  currency: string;
  date: string;
  paidBy: string;
  participants: BillParticipant[];
  settled: boolean;
}
```

---

## 17. Net Worth Screen

**File**: `src/components/NetWorthScreen.tsx`

### What it does
Track total net worth (assets minus liabilities) over time.

### Features
- **Net worth calculation**: Sum of all accounts + investments − debts
- **Historical snapshots** — Track changes over time
- **Breakdown view**: Accounts, investments, debts separately
- **Trend chart** showing net worth trajectory

### Data Model
```typescript
interface NetWorthSnapshot {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: {
    accounts: Record<string, number>;
    investments: Record<string, number>;
    debts: Record<string, number>;
  };
}
```

---

## 18. Investments Screen

**File**: `src/components/InvestmentsScreen.tsx`

### What it does
Track investment portfolio with real-time price updates.

### Features
- **Add investment**: Symbol, name, type, quantity, purchase price, purchase date
- **Investment types**: Stock, Crypto, ETF, Mutual Fund
- **Live price fetching** via `get-stock-price` edge function (Alpha Vantage API)
- **Gain/loss calculation** per holding and total portfolio
- **Portfolio summary**: Total value, total gain, gain percentage

### Data Model
```typescript
interface Investment {
  id: string;
  symbol: string;        // e.g., "AAPL", "BTC"
  name: string;
  type: "stock" | "crypto" | "etf" | "mutual_fund";
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  currency: string;
}
```

---

## 19. Cash Flow Screen

**File**: `src/components/CashFlowScreen.tsx`

### What it does
Forecast future account balance based on known income and expenses.

### Features
- **Projected balance chart** over next 30/60/90 days
- **Upcoming inflows** — Scheduled income (salary, recurring income)
- **Upcoming outflows** — Bills, subscriptions, recurring expenses
- **Cash flow events timeline**
- **Warning indicators** for projected negative balances

### Data Model
```typescript
interface CashFlowForecast {
  date: string;
  projectedBalance: number;
  inflows: number;
  outflows: number;
  events: CashFlowEvent[];
}
```

---

## 20. Envelopes (Budget Envelopes) Screen

**File**: `src/components/EnvelopesScreen.tsx`

### What it does
Envelope budgeting system — allocate money into virtual "envelopes" for different spending categories.

### Features
- **Create envelope**: Name, emoji, allocated amount, linked categories, color, period (weekly/monthly)
- **Spending tracker** per envelope (allocated vs spent)
- **Visual progress** — How much of each envelope is used
- **Category linking** — Map expense categories to envelopes
- **Period reset** — Envelopes reset weekly or monthly

### Data Model
```typescript
interface BudgetEnvelope {
  id: string;
  name: string;
  emoji: string;
  allocated: number;
  spent: number;
  categoryIds: string[];
  color: string;
  period: "weekly" | "monthly";
}
```

---

## 21. Debt Assessment Screen

**File**: `src/components/DebtAssessmentScreen.tsx`

### What it does
Evaluate whether you can afford to take on new debt.

### Features
- **Input monthly income and expenses**
- **List existing debts** with amounts, interest rates, monthly payments
- **Debt types**: Loan, Credit Card, Mortgage, Personal
- **New loan calculator** — Enter proposed loan amount and monthly payment
- **Debt-to-Income (DTI) ratio** calculation
- **Affordability verdict** — "Can afford" / "Cannot afford" with explanation
- **Recommendations** list

### Data Model
```typescript
interface DebtAssessment {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebts: DebtItem[];
  newLoanAmount: number;
  newLoanMonthlyPayment: number;
  debtToIncomeRatio: number;
  canAfford: boolean;
  recommendations: string[];
}
```

---

## 22. Debt Payoff Screen

**File**: `src/components/DebtPayoffScreen.tsx`

### What it does
Plan debt repayment using proven strategies.

### Features
- **Two strategies**:
  - **Snowball** — Pay smallest debt first (psychological wins)
  - **Avalanche** — Pay highest interest rate first (save money)
- **Monthly payment input** — How much you can put toward debt
- **Payoff timeline** — When each debt will be paid off
- **Interest savings comparison** — How much each strategy saves
- **Payment schedule** — Month-by-month breakdown per debt

### Data Model
```typescript
interface DebtPayoffPlan {
  strategy: "snowball" | "avalanche";
  debts: DebtItem[];
  monthlyPayment: number;
  totalInterestSaved: number;
  payoffDate: string;
  schedule: DebtPaymentSchedule[];
}
```

---

## 23. Settings Screen

**File**: `src/components/SettingsScreen.tsx`

### Sections & Functions

#### 23.1 Profile Card
- **User avatar** — First letter of name
- **Name display** — Full name or email
- **Email display** — For authenticated users
- **Sign Out / Sign In button**
- **Plan badge** — Shows "Standard" plan
- **Sync status** — "Synced" with cloud indicator

#### 23.2 Main Settings Group
| Setting | What it does |
|---------|-------------|
| **Language** | Switch between Uzbek, Russian, English. Opens picker modal. |
| **Theme** | Light, Dark, or Auto (system). Opens picker modal. |
| **Currency** | Change display currency. Supports UZS, USD, EUR, RUB, KZT, and more. Opens picker modal. |
| **Haptics & Notifications** | Navigate to haptic feedback intensity and notification settings. |

#### 23.3 Telegram Integration Group (authenticated only)
| Function | What it does |
|---------|-------------|
| **Link Telegram** | Generates a 6-character code valid for 10 minutes. User sends code to @mylo_uz_aibot to link accounts. |
| **Open Bot** | Opens Telegram to the @mylo_uz_aibot chat |
| **Unlink** | Removes Telegram connection from account |
| **Status display** | Shows linked Telegram username or ID |

#### 23.4 Data & Sync Group
| Function | What it does |
|---------|-------------|
| **Sync Data** | Pull latest data from cloud (or show "Local" if guest mode) |
| **Export CSV** | Downloads all transactions as a CSV file with category names and amounts |
| **Quick Setup** | Re-runs onboarding flow to change language, quick-add presets, and preferences |

#### 23.5 Help & Support Group
| Function | What it does |
|---------|-------------|
| **Help** | Opens Help screen with searchable FAQ articles |
| **Learn** | Opens Learn screen with financial education articles |

#### 23.6 Danger Zone
| Function | What it does |
|---------|-------------|
| **Reset Local Data** | Clears all local transactions, limits, goals, and balance. Shows confirmation dialog with cancel/delete options. Does NOT delete cloud data. |

---

## 24. Help Screen

**File**: `src/components/HelpScreen.tsx`

### What it does
Searchable FAQ and help articles organized by category.

### Categories
- **Basics** — Adding transactions, voice input, keyboard shortcuts
- **Budgeting** — Setting limits, understanding analytics
- **Goals** — Creating and managing savings goals
- **Advanced** — Accounts, subscriptions, investments, notifications, settings

### Features
- **Search bar** — Filter articles by title or content
- **Expandable articles** — Tap to read full content
- **Multi-language** — All content available in UZ/RU/EN
- **Tags** for improved search matching

---

## 25. Learn Screen

**File**: `src/components/LearnScreen.tsx`

### What it does
Financial literacy education with articles and reading progress.

### Categories
- **Budgeting** — Basics, 50/30/20 rule, envelope method
- **Saving** — Emergency funds, compound interest
- **Investing** — Stock market basics, diversification
- **Debt** — Good vs bad debt, repayment strategies

### Features
- **Read time estimates** per article
- **Difficulty levels**: Beginner, Intermediate, Advanced
- **Reading progress tracking** — Mark articles as read (stored in localStorage)
- **Search and filter** by category
- **Star/bookmark** articles

---

## 26. AI Features (Modals)

### 26.1 AI Financial Copilot
**File**: `src/components/AICopilotPanel.tsx`

- **Chat interface** — Ask questions about your finances
- **Behavioral analysis** — Detects spending patterns and anomalies
- **Personalized advice** — Based on your actual transaction data
- **Backend**: `ai-copilot` edge function
- Sends transaction history, limits, goals for context

### 26.2 Finance Planner
**File**: `src/components/FinancePlannerModal.tsx`

- **AI-generated financial plans** based on your data
- **Goal suggestions** — What to save for and how much
- **Timeline calculations** — When you can reach goals at current rate
- **Backend**: `finance-planner` edge function

### 26.3 Budget Simulator
**File**: `src/components/BudgetSimulatorModal.tsx`

- **"What if" scenarios** — See impact of daily spending habits
- **Savings Projection mode** — Select daily expenses (coffee, lunch) and calculate monthly/yearly/5-year savings
- **Input**: Daily cost + days per week
- **Output**: Monthly savings, yearly savings, 5-year projection
- **Local calculation** — No API call needed

### 26.4 Spending Challenge
**File**: `src/components/SpendingChallengeScreen.tsx`

- **Weekly no-spend challenges** — Set goals to not spend on specific days
- **Streak tracking** — Count consecutive successful days
- **Progress display** — Visual calendar of challenge days
- **Local storage** persistence via `useSpendingChallenges` hook

---

## 27. Notifications System

### Smart Notifications
**File**: `src/hooks/useSmartNotifications.ts`

Automatically generated notifications based on financial events:

| Type | Trigger |
|------|---------|
| `budget_alert` | Spending approaches or exceeds a budget limit |
| `bill_reminder` | Upcoming bill or subscription payment |
| `anomaly` | Unusual spending pattern detected |
| `goal_progress` | Milestone reached on a savings goal |
| `debt_warning` | Debt-to-income ratio too high |
| `subscription_reminder` | Subscription renewal approaching |
| `investment_alert` | Significant price change in portfolio |

### Notifications Panel
**File**: `src/components/NotificationsPanel.tsx`
- Bell icon on Home screen with unread badge count
- Full-screen panel with notification list
- Mark as read / Clear all
- Severity indicators: info, warning, critical

### Push Notifications
**File**: `src/hooks/usePushNotifications.ts`
- Capacitor Push Notifications plugin for mobile
- Service worker (`sw.js`) for web push
- `send-push-notification` edge function for server-triggered push
- `daily-push-check` edge function for scheduled daily summaries

### Local Notifications
**File**: `src/hooks/useLocalNotifications.ts`
- Capacitor Local Notifications for reminders
- Budget alerts and subscription reminders

---

## 28. Telegram Integration

### Overview
Users can link their Mylo account to a Telegram bot (@mylo_uz_aibot) to add transactions via chat.

### How linking works
1. In Settings → Telegram → "Link Telegram"
2. App generates a 6-character code (valid 10 minutes)
3. User sends code to @mylo_uz_aibot on Telegram
4. Bot verifies code and links accounts
5. Future messages to bot create transactions in Mylo

### Backend functions
| Function | Purpose |
|----------|---------|
| `telegram-bot` | Webhook handler for incoming Telegram messages |
| `telegram-webhook` | Processes bot commands and transaction parsing |
| `telegram-auth` | Handles Telegram Mini App authentication |
| `telegram-setup` | Configures webhook URL with Telegram API |
| `telegram-daily-summary` | Sends daily spending summary to linked Telegram users |
| `link-telegram-code` | Verifies linking codes and connects accounts |

### Database tables
- `telegram_users` — Links Telegram IDs to Mylo user IDs, stores linking codes
- `telegram_transactions` — Transactions created via Telegram bot (synced to main transactions table)

### Sync
**File**: `src/lib/telegramSync.ts`
- `sync_telegram_transactions` database function syncs Telegram-created transactions to main transactions table

---

## 29. Voice Input

**File**: `src/components/VoiceInput.tsx`

### What it does
Record voice descriptions of transactions, AI parses them into structured data.

### How it works
1. User taps microphone button on Home screen
2. Records audio via browser MediaRecorder API
3. Sends audio to `parse-voice` edge function
4. AI extracts: amount, category, type (expense/income), description
5. Creates transaction automatically

### Backend
- `parse-voice` edge function — Processes audio, returns parsed transaction data

---

## 30. Receipt Scanner

**File**: `src/components/ReceiptScanner.tsx`

### What it does
Take a photo of a receipt and AI extracts transaction details.

### How it works
1. User takes photo or selects image
2. Image sent to `scan-receipt` edge function
3. AI extracts: merchant, amount, date, items, category
4. Pre-fills Add Transaction form with extracted data

### Backend
- `scan-receipt` edge function — OCR + AI processing of receipt images

---

## 31. Data & Storage

### Local Storage Keys
| Key | What it stores |
|-----|---------------|
| `mylo_onboarding` | Onboarding completion flag |
| `mylo_quickAdds` | Quick-add presets |
| `hamyon_quickAdds` | Quick-add amounts (Home screen) |
| `hamyon_tool_usage` | Tool usage frequency counts |
| `hamyon_learn_progress` | Learn articles read status |

### Cloud Storage (Supabase Tables)
| Table | Purpose |
|-------|---------|
| `transactions` | All financial transactions |
| `limits` | Budget limits per category |
| `goals` | Savings goals |
| `profiles` | User profile data |
| `telegram_users` | Telegram account linking |
| `telegram_transactions` | Transactions from Telegram bot |

### Data Sync
**File**: `src/hooks/useSupabaseData.ts`
- Authenticated users → data synced to Supabase
- Guest users → data stored in localStorage only
- `syncFromRemote()` pulls latest cloud data
- Bi-directional sync on transaction create/update/delete

### Export
**File**: `src/lib/exportData.ts`
- **CSV export** — Downloads all transactions with categories, dates, amounts
- Respects current language for category names
- Includes currency formatting

---

## 32. Edge Functions (Backend)

All edge functions are deployed on Supabase and called via `src/lib/api.ts`.

| Function | Purpose | Auth Required |
|----------|---------|:---:|
| `ai-copilot` | AI chat for financial advice | No |
| `finance-planner` | AI financial plan generation | No |
| `insights` | AI spending insights and anomaly detection | Yes |
| `scan-receipt` | OCR receipt scanning | No |
| `parse-voice` | Voice-to-transaction parsing | No |
| `get-stock-price` | Live stock/crypto prices (Alpha Vantage) | No |
| `send-push-notification` | Send push notification to user device | Yes |
| `daily-push-check` | Scheduled daily notification check | No |
| `telegram-bot` | Telegram bot webhook handler | No |
| `telegram-webhook` | Process Telegram messages | No |
| `telegram-auth` | Telegram Mini App auth | No |
| `telegram-setup` | Configure Telegram webhook | No |
| `telegram-daily-summary` | Daily summary to Telegram | No |
| `link-telegram-code` | Verify Telegram linking codes | No |

### API Client
**File**: `src/lib/api.ts`
- Central API client for all edge function calls
- Handles auth tokens, error codes (429 rate limit, 402 credits exhausted)
- Push notifications use local Supabase URL (where user_devices table lives)

---

## Appendix: Utility Libraries

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | localStorage helpers, number formatting (formatUZS), date utilities |
| `src/lib/utils.ts` | Tailwind class merging (cn function) |
| `src/lib/constants.ts` | Category definitions, colors, icons |
| `src/lib/exportData.ts` | CSV export functionality, currency list |
| `src/lib/notifications.ts` | Notification scheduling helpers |
| `src/lib/pushTriggers.ts` | Push notification trigger logic |
| `src/lib/anomalyDetector.ts` | Spending anomaly detection algorithms |
| `src/lib/historicalAnalysis.ts` | Historical spending trend analysis |
| `src/lib/telegram.ts` | Telegram Mini App detection and utilities |
| `src/lib/telegramSync.ts` | Telegram transaction sync logic |
| `src/lib/auth.ts` | Authentication helpers |

---

## Appendix: Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state and methods |
| `useCurrency` | Currency formatting and conversion |
| `useHaptic` | Haptic feedback (light, medium, heavy) |
| `useLocalNotifications` | Capacitor local notification scheduling |
| `usePullToRefresh` | Pull-to-refresh gesture handler |
| `usePushNotifications` | Push notification registration and handling |
| `useSmartNotifications` | Auto-generated financial notifications |
| `useSpendingChallenges` | Spending challenge state management |
| `useSupabaseData` | Cloud data sync and CRUD operations |
| `use-mobile` | Mobile device detection |
| `use-toast` | Toast notification display |

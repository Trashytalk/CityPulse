# CityPulse Web Dashboard

The web dashboard for the CityPulse platform, built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - UI component library
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Recharts** - Charts and analytics

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env.local` file:
```bash
cp .env.example .env.local
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, verify)
│   ├── (dashboard)/      # User dashboard pages
│   ├── (admin)/          # Admin panel pages
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   └── ui/               # Reusable UI components
└── lib/
    ├── api.ts            # API client
    ├── auth-store.ts     # Auth state management
    └── utils.ts          # Utility functions
```

## Features

### User Dashboard
- **Overview** - Stats cards, recent sessions, wallet summary
- **Sessions** - Collection history with filters
- **Wallet** - Balances, transactions, withdrawals
- **Achievements** - Progress tracking and rewards
- **Settings** - Profile and payout methods

### Admin Panel
- **Overview** - Platform analytics and quick actions
- **Users** - User management with search/filter
- **Withdrawals** - Pending withdrawal queue
- **Analytics** - Charts and trends

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript check

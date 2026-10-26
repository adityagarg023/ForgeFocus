# ForgeFocus — Deep Work Tracker

Plan focus sessions, track actual working time, and review your productivity.

## Features

- Countdown timer with pause, resume, and overtime (stopwatch mode)
- Session history stored locally in the browser (localStorage)
- Email/password authentication via Clerk (optional — the timer works anonymously)
- Profile page with lifetime focus stats

## Prerequisites

- Node.js 18+ (Node 22 recommended)
- A free [Clerk](https://clerk.com) account for authentication

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Clerk

1. Create a free account at [clerk.com](https://clerk.com) and create a new application.
2. Go to **API Keys** in your Clerk dashboard.
3. Copy your **Publishable Key** (`pk_...`) and **Secret Key** (`sk_...`).
4. Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/
```

**Note:** Email/password is the default sign-in method. You can enable
additional providers from the Clerk dashboard if desired.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How auth works

- The timer and session history work **without signing in** — data is stored
  in localStorage on the user's device.
- The header shows **Sign in** / **Sign up** buttons when logged out, and a
  user avatar menu when logged in.
- Dedicated `/sign-in` and `/sign-up` pages use Clerk's prebuilt components.
- The `/profile` page shows account details and lifetime focus stats when
  signed in, and a sign-in prompt when signed out.
- Sign-out is available from the user avatar menu in the header.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | Lint with ESLint |

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- React 19 + Tailwind CSS v4
- Clerk for authentication
- Vitest for unit testing
- JetBrains Mono font

## Deploy

The easiest way to deploy is on [Vercel](https://vercel.com). Make sure to add
all the Clerk environment variables in your Vercel project settings.

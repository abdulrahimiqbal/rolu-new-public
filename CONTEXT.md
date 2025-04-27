# Rolu Application Context

## 1. Overview

Rolu is an educational gaming platform built with Next.js 14 (App Router). It features a 3-lane runner game integrated with educational quizzes, supporting multiple brands (white-labeling), World ID authentication, Rolu token/XP rewards, localization, and an admin dashboard.

## 2. Core Technologies

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI:** React, Tailwind CSS, shadcn/ui
- **Database:** Prisma (likely PostgreSQL)
- **Authentication:** World ID + JWTs (via Cookies)
- **State:** TanStack Query (Server), React Context (Global Client), `useState`/`useReducer` (Local)
- **Localization:** `next-i18next` / Next.js i18n
- **Assets:** Game assets hosted on Cloudinary (links in DB).

## 3. Architecture & Key Directories

- `/app`: Next.js App Router, page components, layouts.
- `/components`: Reusable UI components (`/ui`, `/game`, `/quiz`, `/brand`, `/admin`).
- `/lib`: Shared utilities, Prisma client (`/lib/prisma`), auth helpers (`/lib/auth`), reward calcs (`/lib/game-rewards`).
- `/api`: Backend API routes (Next.js Route Handlers).
- `/hooks`: Custom React hooks.
- `/contexts`: Global state (e.g., `AuthProvider`).
- `/prisma`: Database schema, migrations.
- `/public`: Static files (non-game assets).
- `/styles`: Global styles, Tailwind config.
- `/locales`: Translation files.

## 4. Data Flow

1.  **UI Interaction:** User interacts with components (`/components`).
2.  **Data Fetching:** Client Components use hooks (`useEffect`, TanStack Query) to call `/api` routes. Server Components fetch data directly (e.g., using Prisma).
3.  **API Handling:** `/api` routes receive requests, use Prisma (`/lib/prisma`) to interact with DB, perform logic, return JSON.
4.  **DB Interaction:** Prisma executes SQL against the database.
5.  **UI Update:** Data updates state (TanStack Query cache, Context, `useState`), triggering re-renders.

## 5. Authentication

- World ID Mini Kit for verification/login.
- Backend API validates proof, creates session (JWT in `rolu_user_data` cookie).
- `AuthProvider` (`/contexts`) manages user state globally (`useAuth` hook).
- `withAuth` HOC protects routes.
- `/api/verify-check` confirms verification status.

## 6. Key Features & Modules

- **Game (`GameContainer`):** Core runner logic, state machine, integrates `QuizModal`, calls `/api/game/submit`.
- **Quizzes (`QuizModal`, `/lib/quiz-service`, `/api/metrics/quiz/*`):** Brand-specific quizzes fetched, answers recorded (`QuizResponse` table), metrics calculated server-side.
- **Promo Cards (`PromoCardsCarousel`, `/api/promotional-cards`):** Fetches/displays cards + dynamic quiz metrics from `/api/metrics/quiz/batch`.
- **Rewards (`/lib/game-rewards`, `/api/game/submit`):** Calculates Rolu/XP based on game/quiz performance; `/api/game/submit` updates `User` balance.
- **Branding (`/api/game/brands`, Theme):** Fetches brand config, applies themes dynamically.
- **Admin (`/app/admin`, `/components/admin`):** CRUD operations for core content via dedicated APIs. 
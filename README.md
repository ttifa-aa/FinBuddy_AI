# Budget Buddy AI

A personal finance tracker with AI-powered chat analytics, budget alerts, spending forecasts, and email notifications.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Edge Functions)
- **AI Chat**: OpenAI GPT-4o-mini
- **Email**: Resend
- **Deployment**: Vercel

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/budget-buddy-ai.git
cd budget-buddy-ai
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migrations/00000000000000_consolidated_schema.sql`
3. Copy your **Project URL** and **anon key** from Project Settings → API

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### 4. Run Locally

```bash
npm run dev
# http://localhost:8080
```

### 5. Deploy Edge Functions

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase secrets set RESEND_API_KEY=re_...
```

### 6. Deploy to Vercel

Import your GitHub repo at [vercel.com/new](https://vercel.com/new) and add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Features

- 📊 Dashboard with spending metrics and charts
- 💬 AI chat assistant (asks questions about your finances, logs expenses by voice or text)
- 🔔 Real-time budget alerts (in-app + email at 80/90/100% thresholds)
- 📈 Spending forecasts and predictions
- 🌍 Multi-currency support
- 🌙 Dark/light theme
- 📧 Daily email reminders via Resend

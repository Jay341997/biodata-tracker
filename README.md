# Biodata Tracker MVP

Web app to track biodata PDFs, call progress, follow-ups, priorities, and hold cases.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- File-backed JSON store for local MVP persistence
- API routes for profile workflow and interaction logs

## MVP Features

- Manual single/bulk PDF upload
- Basic field extraction fallback + manual review/edit before save
- Workflow board: New, Called, Follow Up, Hold, Closed
- Priority management: High, Medium, Low
- Follow-up reminders: today, overdue, high-priority pending
- Interaction timeline for each profile
- Search across name/city/education/occupation/contact

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

## Data Model

- Runtime model/types are defined in `src/lib/types.ts`
- SQL reference schema is available in `docs/schema.sql`
- Local data persists in `data/store.json` (created automatically)
- On Vercel runtime, app uses `/tmp/biodata-store.json` (ephemeral per instance)

## API Endpoints

- `GET /api/profiles` - list profiles + reminder counters + high-priority pending count
- `POST /api/profiles` - create profile
- `POST /api/profiles/upload` - upload PDFs and get extracted previews
- `GET /api/profiles/:id` - profile details + interaction logs
- `PATCH /api/profiles/:id` - update status/priority/follow-up/hold and append interaction log

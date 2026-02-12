# WatchTower Web

A web-based API health monitoring dashboard. Track uptime, response times, and get notified when your endpoints go down or recover.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57)

## Features

- **Real-time monitoring** — Track multiple API endpoints with configurable polling intervals (5m, 15m, 1h, 12h, 24h)
- **Live dashboard** — Status cards with color-coded health indicators (healthy/failing/expired/unknown) and next-poll countdown timer
- **Search & filter** — Filter endpoints by name or status directly from dashboard summary cards
- **Response time charts** — Historical performance visualization with Recharts
- **Response & request body viewer** — Inspect full request/response payloads on the endpoint detail page
- **Browser notifications** — Get alerted when endpoints go down or recover
- **cURL import** — Paste a cURL command to instantly create a monitored endpoint
- **Postman import** — Upload a Postman collection to bulk-import endpoints
- **Bulk actions** — Multi-select endpoints to check, enable, disable, or delete in batch
- **Delete all** — One-click removal of all endpoints with confirmation
- **Automatic token refresh** — RSA-encrypted apply-code login flow with configurable refresh interval
- **Dynamic variable substitution** — Use `{{accessToken}}` and `{{userId}}` placeholders in endpoint URLs and bodies
- **Settings page** — Configure login credentials, token refresh interval, and test the login flow
- **Dark mode** — Automatic theme based on system preference

## Quick Start

```bash
# Clone and enter the project
git clone <repo-url> watchtower-web
cd watchtower-web

# One-step setup and start
./start.sh
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Manual Setup

```bash
# Install dependencies and initialize database
npm install
npx prisma db push

# Start Next.js dev server + background worker
npm run dev:all
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────┐
│   Browser    │◄───►│  Next.js API │◄───►│ SQLite │
│  (React 19)  │     │   Routes     │     │  (DB)  │
└─────────────┘     └──────────────┘     └────────┘
                                              ▲
                    ┌──────────────┐           │
                    │   Worker     │───────────┘
                    │  (Node.js)   │
                    └──────────────┘
```

- **Frontend** polls the API every 5 seconds for live updates
- **Worker** runs as a standalone Node.js process, checking endpoints on their configured intervals
- **SQLite** stores all endpoints and health check results locally

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server only |
| `npm run dev:worker` | Start background worker only (with watch mode) |
| `npm run dev:all` | Start both Next.js and worker concurrently |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run worker` | Start worker (production) |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio GUI |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Dashboard
│   ├── endpoints/[id]/page.tsx   # Endpoint detail view
│   └── api/
│       ├── endpoints/            # CRUD + import + bulk operations
│       └── cron/check/           # Optional external cron trigger
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # App shell, header, sidebar
│   ├── dashboard/                # Grid view, status cards
│   ├── endpoints/                # Detail view, charts, history
│   ├── add-endpoint/             # Create dialog (manual/cURL/Postman)
│   └── bulk/                     # Multi-select + bulk actions
├── hooks/                        # Data fetching, notifications, selection
└── lib/
    ├── db.ts                     # Prisma client singleton
    ├── types.ts                  # TypeScript types
    └── services/                 # Health check, cURL/Postman parsers
prisma/
└── schema.prisma                 # Database schema
worker.ts                         # Background health check process
```

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/endpoints` | List all endpoints with status |
| `POST` | `/api/endpoints` | Create a new endpoint |
| `GET` | `/api/endpoints/:id` | Get endpoint details |
| `PUT` | `/api/endpoints/:id` | Update an endpoint |
| `DELETE` | `/api/endpoints/:id` | Delete an endpoint |
| `POST` | `/api/endpoints/:id/check` | Trigger immediate health check |
| `GET` | `/api/endpoints/:id/results` | Get paginated check history |
| `POST` | `/api/endpoints/import` | Import from cURL or Postman |
| `POST` | `/api/endpoints/bulk` | Bulk check/enable/disable/delete |
| `GET` | `/api/settings` | Get global settings |
| `PUT` | `/api/settings` | Update global settings |
| `POST` | `/api/settings/login` | Test login and retrieve tokens |

## Tech Stack

- **[Next.js 15](https://nextjs.org/)** — App Router, React 19, API routes
- **[TypeScript](https://www.typescriptlang.org/)** — End-to-end type safety
- **[Prisma 5](https://www.prisma.io/)** — Database ORM with SQLite
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** + **[Radix UI](https://www.radix-ui.com/)** — Accessible components
- **[Recharts](https://recharts.org/)** — Response time charts
- **[Lucide](https://lucide.dev/)** — Icons

## License

MIT

# Postgres starter

A small CRUD REST API backed by [Dockhold](https://dockhold.eu)'s managed
Postgres. Enable the database add-on and Dockhold injects `DATABASE_URL` — the
app creates its table on startup and gives you full create/read/update/delete.

[![Deploy to Dockhold](https://img.shields.io/badge/Deploy%20to-Dockhold-2563eb?style=for-the-badge)](https://app.dockhold.eu/new?repo=https://github.com/dockhold/postgres-starter)

## Deploy it

1. Click **Use this template** (or fork this repo).
2. [Deploy it](https://app.dockhold.eu/new?repo=https://github.com/dockhold/postgres-starter),
   and **check "Add a managed database"** so `DATABASE_URL` is injected.
3. It goes live at `https://<your-app>.dockhold.app`. Data persists across
   restarts and deploys, because it's in Postgres — not the container filesystem.

## API

| Route | Description |
|-------|-------------|
| `GET /api/items` | List items, newest first |
| `GET /api/items/:id` | Get one |
| `POST /api/items` | Create — body `{ "title": "buy milk" }` |
| `PATCH /api/items/:id` | Update `title` and/or `done` |
| `DELETE /api/items/:id` | Delete |

## How it works

- `DATABASE_URL` is read from the environment ([`db.js`](db.js)); the schema is
  created on startup with `CREATE TABLE IF NOT EXISTS`.
- All queries are **parameterized** — input is never interpolated into SQL.
- Writes are **rate-limited per IP**, bodies are capped at 10 kB, and inputs are
  validated. The endpoints are public (no auth) by default — to require a token,
  see [making an app private](https://dockhold.eu/docs/recipes/deploy-a-full-stack-app#lock-the-api-down-to-your-app).

No build step, so Dockhold runs it directly — no Dockerfile needed.

## Run it locally

```bash
npm install
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres PORT=3000 npm start
# curl http://localhost:3000/api/items
```

## Full walkthrough

[Connect a Postgres database](https://dockhold.eu/docs/recipes/connect-a-postgres-database)
— how the managed database works (`DATABASE_URL`, persistence, pgvector).

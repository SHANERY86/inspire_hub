# Collector Service (External API Example)

This is a separate FastAPI service that connects to PostgreSQL directly and reads/writes the existing `inspiration` table.

It is intentionally small so you can see the moving parts of an external Python API service.

## Endpoints

- `GET /health`
- `GET /inspirations?limit=50`
- `POST /token` (JWT login)
- `POST /inspirations` (requires Bearer token)

## Setup

From project root:

```bash
cd collector_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set database URL (optional if local defaults already match):

```bash
export COLLECTOR_DATABASE_URL="postgresql+psycopg2://sryan:<password>@localhost:5432/inspire_hub"
```

Set JWT/auth environment values:

```bash
export COLLECTOR_JWT_SECRET="replace-with-a-long-random-secret"
export COLLECTOR_JWT_EXPIRE_MINUTES="60"
```

Bootstrap first service account (written to `api_clients` table on startup):

```bash
export COLLECTOR_BOOTSTRAP_CLIENT_ID="collector-client"
export COLLECTOR_BOOTSTRAP_CLIENT_SECRET="collector-dev-secret"
```

Run service:

```bash
uvicorn app.main:app --reload --port 8001
```

Then open:

- Swagger docs: `http://127.0.0.1:8001/docs`
- Health: `http://127.0.0.1:8001/health`

## Example Request

1) Get access token:

```bash
curl -X POST http://127.0.0.1:8001/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=collector-client&password=collector-dev-secret"
```

Response shape:

```json
{"access_token":"<jwt>","token_type":"bearer"}
```

2) Use token for write request:

```bash
curl -X POST http://127.0.0.1:8001/inspirations \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "External Service Test",
    "essence": "Writing from FastAPI",
    "source_type": "book"
  }'
```

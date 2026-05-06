# API Notes (v1)

Base prefix: `/api/v1/`

These endpoints are powered by DRF `ModelViewSet`s and use paginated list responses.

## Inspirations

Resource URL: `/api/v1/inspirations/`

- `GET /api/v1/inspirations/` — list inspirations (paginated)
- `POST /api/v1/inspirations/` — create inspiration
- `GET /api/v1/inspirations/<id>/` — retrieve one
- `PATCH /api/v1/inspirations/<id>/` — partial update
- `DELETE /api/v1/inspirations/<id>/` — delete

### Create Required Fields

- `source_title` (string)
- `essence` (string)
- `source_type` (string)

Optional fields: `quote`, `user_thoughts`, `reference`.

## Screenshots

Resource URL: `/api/v1/screenshots/`

- `GET /api/v1/screenshots/` — list screenshots (paginated)
- `POST /api/v1/screenshots/` — create screenshot (multipart)
- `GET /api/v1/screenshots/<id>/` — retrieve one
- `DELETE /api/v1/screenshots/<id>/` — delete

### Create Required Fields

- `inspiration` (integer id of an existing inspiration)
- `image` (uploaded file)

Optional field: `extracted_text`.

### Filtering

- `GET /api/v1/screenshots/?inspiration=<id>`
  - Returns screenshots linked to that inspiration id.
  - Uses `django-filter` (`NumberFilter` on `inspiration_id`).
  - Non-integer values return `400`.

## Error Behavior (Current)

- `400 Bad Request`
  - Missing required fields on create
  - Invalid field values (for example bad foreign key id or invalid filter type)
- `404 Not Found`
  - Retrieve/delete on non-existent resource id

## Example `curl` Requests

List inspirations:

```bash
curl -s http://127.0.0.1:8000/api/v1/inspirations/
```

Create inspiration:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/inspirations/ \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Atomic Habits",
    "essence": "Systems beat goals",
    "source_type": "book"
  }'
```

Create screenshot:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/screenshots/ \
  -F "inspiration=1" \
  -F "image=@/absolute/path/to/image.jpg"
```

Filter screenshots by inspiration:

```bash
curl -s "http://127.0.0.1:8000/api/v1/screenshots/?inspiration=1"
```

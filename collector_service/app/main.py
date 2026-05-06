from datetime import datetime, timezone

from fastapi import Depends, FastAPI
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from .auth import bootstrap_api_clients_table, login_for_access_token, require_current_user
from .database import SessionLocal
from .models import Inspiration
from .schemas import InspirationCreate, InspirationRead

app = FastAPI(title="Inspire Collector Service", version="0.1.0")


@app.on_event("startup")
def startup() -> None:
    bootstrap_api_clients_table()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/token")
def token(form_data: OAuth2PasswordRequestForm = Depends()) -> dict[str, str]:
    return login_for_access_token(form_data)


@app.get("/inspirations", response_model=list[InspirationRead])
def list_inspirations(limit: int = 50) -> list[Inspiration]:
    limit = min(max(limit, 1), 200)
    with SessionLocal() as db:
        rows = db.execute(select(Inspiration).order_by(Inspiration.date.desc()).limit(limit))
        return rows.scalars().all()


@app.post("/inspirations", response_model=InspirationRead, status_code=201)
def create_inspiration(
    payload: InspirationCreate,
    _: str = Depends(require_current_user),
) -> Inspiration:
    with SessionLocal() as db:
        # Django's auto_now_add is app-level; set date explicitly for external inserts.
        row = Inspiration(**payload.model_dump(), date=datetime.now(timezone.utc))
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

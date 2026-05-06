import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select

from .database import SessionLocal, engine
from .models import ApiClient

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

JWT_SECRET_KEY = os.getenv("COLLECTOR_JWT_SECRET", "change-me-in-env")
JWT_ALGORITHM = os.getenv("COLLECTOR_JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("COLLECTOR_JWT_EXPIRE_MINUTES", "60"))
BOOTSTRAP_CLIENT_ID = os.getenv("COLLECTOR_BOOTSTRAP_CLIENT_ID", "")
BOOTSTRAP_CLIENT_SECRET = os.getenv("COLLECTOR_BOOTSTRAP_CLIENT_SECRET", "")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_secret(secret: str) -> str:
    return pwd_context.hash(secret)


def bootstrap_api_clients_table() -> None:
    ApiClient.__table__.create(bind=engine, checkfirst=True)
    if not BOOTSTRAP_CLIENT_ID or not BOOTSTRAP_CLIENT_SECRET:
        return

    with SessionLocal() as db:
        existing = db.execute(
            select(ApiClient).where(ApiClient.client_id == BOOTSTRAP_CLIENT_ID)
        ).scalar_one_or_none()
        if existing is None:
            db.add(
                ApiClient(
                    client_id=BOOTSTRAP_CLIENT_ID,
                    client_secret_hash=hash_secret(BOOTSTRAP_CLIENT_SECRET),
                    is_active=True,
                )
            )
            db.commit()


def authenticate_client(client_id: str, client_secret: str) -> ApiClient | None:
    with SessionLocal() as db:
        client = db.execute(
            select(ApiClient).where(ApiClient.client_id == client_id, ApiClient.is_active.is_(True))
        ).scalar_one_or_none()
        if client is None:
            return None
        if not verify_password(client_secret, client.client_secret_hash):
            return None
        return client


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> dict[str, str]:
    client = authenticate_client(form_data.username, form_data.password)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client_id or client_secret",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=client.client_id)
    return {"access_token": access_token, "token_type": "bearer"}


def require_current_user(token: str = Depends(oauth2_scheme)) -> str:
    auth_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise auth_exception from exc

    subject = payload.get("sub")
    if subject is None:
        raise auth_exception
    with SessionLocal() as db:
        client = db.execute(
            select(ApiClient).where(ApiClient.client_id == subject, ApiClient.is_active.is_(True))
        ).scalar_one_or_none()
        if client is None:
            raise auth_exception
    return subject

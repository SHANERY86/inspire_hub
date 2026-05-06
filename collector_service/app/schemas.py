from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InspirationCreate(BaseModel):
    source_title: str
    essence: str
    source_type: str
    quote: str | None = None
    user_thoughts: str | None = None
    reference: str | None = None


class InspirationRead(BaseModel):
    id: int
    source_title: str
    essence: str
    source_type: str
    date: datetime
    quote: str | None = None
    user_thoughts: str | None = None
    reference: str | None = None

    model_config = ConfigDict(from_attributes=True)

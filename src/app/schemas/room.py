from typing import Optional

from pydantic import BaseModel, PositiveInt

from app.schemas import Campus


class RoomCreate(BaseModel):
    name: str
    campus_id: Optional[PositiveInt] = None


class Room(RoomCreate):
    id: PositiveInt
    campus: Optional[Campus] = None

    class Config:
        orm_mode = True


class RoomInfo(BaseModel):
    room: Room
    purpose: str
    workload: float

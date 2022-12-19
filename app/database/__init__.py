from fastapi import Depends

from app.database.connection import Base, get_session
from app.database.facade import DBFacade
from app.database.interface import DBFacadeInterface


def get_db_facade(db_facade: DBFacade = Depends(DBFacade)) -> DBFacadeInterface:
    """Зависимость для получения фасада БД"""
    return db_facade
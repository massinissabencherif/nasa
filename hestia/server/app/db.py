import os
from pathlib import Path
from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

DB_PATH = Path(os.environ.get("HESTIA_DB_PATH", str(Path(__file__).resolve().parent.parent / "hestia.db")))
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def reset_db() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

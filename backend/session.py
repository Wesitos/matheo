from sqlalchemy import create_engine
from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
)
from sqlalchemy.engine.url import URL

from os import environ as env

from models import Base as Base

Base.metadata.bind = create_engine(URL(**dict(
    drivername=env.get('DB_DRIVER', 'postgresql+psycopg2'),
    host=env.get('DB_HOST', '127.0.0.1'),
    database=env.get('DB_DATABASE', 'mercadito'),
    username=env.get('DB_USER', 'mercadito'),
    password=env.get('DB_PASSWORD', 'mercadito'),
)))

db_session = scoped_session(
    sessionmaker(
        autocommit=False,
        autoflush=False,
    )
)

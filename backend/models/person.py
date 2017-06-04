from sqlalchemy import (
    String,
)

from .common import (
    Base,
    NColumn,
)


class Person(Base):
    name = NColumn(String(80))

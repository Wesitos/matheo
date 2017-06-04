from sqlalchemy import (
    Column, Integer
)

from sqlalchemy.ext.declarative import (
    declarative_base,
    declared_attr
)

from functools import partial
from inflection import underscore


class Base(object):
    @declared_attr
    def __tablename__(cls):
        return underscore(cls.__name__)
    id = Column(Integer, primary_key=True)


Base = declarative_base(cls=Base)

NColumn = partial(Column, nullable=False)

from sqlalchemy import (
    Integer, String,
)

from .common import (
    Base,
    NColumn,
)


class Tax(Base):
    name = NColumn(String(60))
    fixed_value = NColumn(Integer)
    percentage_value = NColumn(Integer)

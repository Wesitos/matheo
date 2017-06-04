from sqlalchemy import (
    Column,
    Integer, String,
    ForeignKey,
    Table,
)

from sqlalchemy.orm import (
    relationship,
)
from .common import (
    Base,
    NColumn,
)

association_table = Table(
    'product_tax_association', Base.metadata,
    Column('product_id', Integer, ForeignKey('product.id')),
    Column('tax_id', Integer, ForeignKey('tax.id'))
)


class Product(Base):
    name = NColumn(String(120))
    price = NColumn(Integer)

    # Relations
    taxes = relationship('Tax', secondary=association_table)

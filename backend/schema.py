from graphene import (
    Schema,
    relay,
    ObjectType,
)

from graphene_sqlalchemy import (
    SQLAlchemyObjectType,
    SQLAlchemyConnectionField,
)

from models import (
    Product as ProductModel,
    Tax as TaxModel,
    Person as PersonModel,
)


class Product(SQLAlchemyObjectType):
    class Meta:
        model = ProductModel
        interfaces = (relay.Node,)


class Tax(SQLAlchemyObjectType):
    class Meta:
        model = TaxModel
        interfaces = (relay.Node,)


class Person(SQLAlchemyObjectType):
    class Meta:
        model = PersonModel
        interfaces = (relay.Node,)


class Query(ObjectType):
    allProducts = SQLAlchemyConnectionField(Product)
    allTaxes = SQLAlchemyConnectionField(Tax)
    allPeople = SQLAlchemyConnectionField(Person)


schema = Schema(query=Query, types=[Product, Tax, Person])

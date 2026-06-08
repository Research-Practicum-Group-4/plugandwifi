from sqlalchemy import (
    Column, 
    Integer, 
    String,
    Text,
    TIMESTAMP,
    text
)
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key = True,
        index = True
    )

    full_name = Column(
        Text,
        nullable = False
    )

    email = Column(
        Text,
        unique = True,
        nullable = False
    )

    password_hash = Column(
        Text,
        nullable = False
    )

    role = Column(
        Text,
        server_default = "user"
    )

    created_at = Column(
        TIMESTAMP,
        server_default = text(
            "CURRENT_TIMESTAMP"
        )
    )



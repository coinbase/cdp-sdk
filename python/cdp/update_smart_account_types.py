from pydantic import BaseModel


class UpdateSmartAccountOptions(BaseModel):
    """Options for updating an EVM smart account."""

    """An optional name for the smart account. Smart account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Smart account names must be unique across all EVM smart accounts in the developer's CDP Project."""
    name: str | None = None

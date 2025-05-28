from typing import Literal

from pydantic import BaseModel, ConfigDict
from solana.rpc.api import Client as SolanaClient

from cdp.actions.solana.utils import Network


class TransferOptions(BaseModel):
    """The options for the transfer."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    from_account: str
    to_account: str
    amount: int
    token: str | Literal["sol", "usdc"]
    network: Network | SolanaClient

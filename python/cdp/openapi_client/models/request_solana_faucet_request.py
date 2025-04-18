# coding: utf-8

"""
    Coinbase Developer Platform APIs

    The Coinbase Developer Platform APIs - leading the world's transition onchain.

    The version of the OpenAPI document: 2.0.0
    Contact: cdp@coinbase.com
    Generated by OpenAPI Generator (https://openapi-generator.tech)

    Do not edit the class manually.
"""  # noqa: E501


from __future__ import annotations
import pprint
import re  # noqa: F401
import json

from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator
from typing import Any, ClassVar, Dict, List
from typing_extensions import Annotated
from typing import Optional, Set
from typing_extensions import Self

class RequestSolanaFaucetRequest(BaseModel):
    """
    RequestSolanaFaucetRequest
    """ # noqa: E501
    address: Annotated[str, Field(strict=True)] = Field(description="The address to request funds to, which is a base58-encoded string.")
    token: StrictStr = Field(description="The token to request funds for.")
    __properties: ClassVar[List[str]] = ["address", "token"]

    @field_validator('address')
    def address_validate_regular_expression(cls, value):
        """Validates the regular expression"""
        if not re.match(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$", value):
            raise ValueError(r"must validate the regular expression /^[1-9A-HJ-NP-Za-km-z]{32,44}$/")
        return value

    @field_validator('token')
    def token_validate_enum(cls, value):
        """Validates the enum"""
        if value not in set(['sol', 'usdc']):
            raise ValueError("must be one of enum values ('sol', 'usdc')")
        return value

    model_config = ConfigDict(
        populate_by_name=True,
        validate_assignment=True,
        protected_namespaces=(),
    )


    def to_str(self) -> str:
        """Returns the string representation of the model using alias"""
        return pprint.pformat(self.model_dump(by_alias=True))

    def to_json(self) -> str:
        """Returns the JSON representation of the model using alias"""
        # TODO: pydantic v2: use .model_dump_json(by_alias=True, exclude_unset=True) instead
        return json.dumps(self.to_dict())

    @classmethod
    def from_json(cls, json_str: str) -> Optional[Self]:
        """Create an instance of RequestSolanaFaucetRequest from a JSON string"""
        return cls.from_dict(json.loads(json_str))

    def to_dict(self) -> Dict[str, Any]:
        """Return the dictionary representation of the model using alias.

        This has the following differences from calling pydantic's
        `self.model_dump(by_alias=True)`:

        * `None` is only added to the output dict for nullable fields that
          were set at model initialization. Other fields with value `None`
          are ignored.
        """
        excluded_fields: Set[str] = set([
        ])

        _dict = self.model_dump(
            by_alias=True,
            exclude=excluded_fields,
            exclude_none=True,
        )
        return _dict

    @classmethod
    def from_dict(cls, obj: Optional[Dict[str, Any]]) -> Optional[Self]:
        """Create an instance of RequestSolanaFaucetRequest from a dict"""
        if obj is None:
            return None

        if not isinstance(obj, dict):
            return cls.model_validate(obj)

        _obj = cls.model_validate({
            "address": obj.get("address"),
            "token": obj.get("token")
        })
        return _obj



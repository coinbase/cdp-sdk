from cdp.analytics import track_action
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.validate_end_user_access_token_request import (
    ValidateEndUserAccessTokenRequest,
)


class EndUserClient:
    """The EndUserClient class is responsible for CDP API calls for the end user."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def validate_access_token(
        self,
        access_token: str,
    ):
        """Validate an end user's access token.

        Args:
            access_token (str): The access token to validate.

        """
        track_action(action="validate_access_token")

        return await self.api_clients.end_user.validate_end_user_access_token(
            validate_end_user_access_token_request=ValidateEndUserAccessTokenRequest(
                access_token=access_token,
            ),
        )

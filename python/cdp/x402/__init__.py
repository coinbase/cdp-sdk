"""x402: An internet native payments protocol."""

import tempfile
from pathlib import Path

from cdp.x402.x402 import (
    AuthHeaders,
    CDPAuthProvider,
    FacilitatorConfig,
    FacilitatorConfigV2,
    create_facilitator_config,
    create_facilitator_config_v2,
    facilitator,
)


def _show_notice_once():
    """Show the notice message only once per Python environment."""
    notice_file = Path(tempfile.gettempdir()) / ".x402_notice_shown"

    if not notice_file.exists():
        notice = """
\033[33m⚠️  NOTICE:\033[0m
By taking steps to use the search functionality within the x402 Bazaar, you agree to the CDP TOS and that the x402 Bazaar is provided AS-IS.
CDP TOS: (https://www.coinbase.com/legal/developer-platform/terms-of-service)
The endpoints have not been reviewed by Coinbase, so please ensure that you trust them prior to sending funds."""
        try:
            print(notice)
            notice_file.touch()
        except Exception:
            # If we can't write the file or use colors, fall back to basic notice
            print("""
⚠️  NOTICE:
By taking steps to use the search functionality within the x402 Bazaar, you agree to the CDP TOS and that the x402 Bazaar is provided AS-IS.
CDP TOS: (https://www.coinbase.com/legal/developer-platform/terms-of-service)
The endpoints have not been reviewed by Coinbase, so please ensure that you trust them prior to sending funds.""")


_show_notice_once()

__all__ = [
    # V1 API
    "FacilitatorConfig",
    "create_facilitator_config",
    "facilitator",
    # V2 API
    "AuthHeaders",
    "CDPAuthProvider",
    "FacilitatorConfigV2",
    "create_facilitator_config_v2",
]

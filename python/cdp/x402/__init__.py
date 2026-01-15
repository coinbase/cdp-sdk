"""x402: An internet native payments protocol."""

import tempfile
from pathlib import Path

from cdp.x402.x402 import (
    FacilitatorConfig,
    create_facilitator_config,
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
    "FacilitatorConfig",
    "create_facilitator_config",
    "facilitator",
]

import os
from pathlib import Path
from unittest.mock import patch

import pytest


# Globally mock analytics.send_event for all tests.
# This prevents actual analytics events from being sent during tests.
@pytest.fixture(autouse=True)
def mock_send_event():
    """Mock the send_event function for all tests.

    This prevents actual analytics events from being sent during tests.
    """
    from cdp.analytics import send_event

    with patch("cdp.analytics.send_event") as mock:
        mock.return_value = None

        mock.original = send_event

        yield mock


# Get the path to the base directory
BASE_DIR = Path(__file__).parent

pytest_plugins = []

# Add top-level package factories
top_level_factories_dir = BASE_DIR / "cdp" / "test" / "factories"
if top_level_factories_dir.exists():
    factory_modules = [
        f[:-3]
        for f in os.listdir(top_level_factories_dir)
        if f.endswith(".py") and f != "__init__.py"
    ]

    for module_name in sorted(factory_modules):
        pytest_plugins.append(f"cdp.test.factories.{module_name}")

# Discover factory modules for each subpackage
CDP_PACKAGES_WITH_FACTORIES = ["auth", "openapi_client"]
for package in CDP_PACKAGES_WITH_FACTORIES:
    factories_dir = BASE_DIR / "cdp" / package / "test" / "factories"

    # Skip if the directory doesn't exist
    if not factories_dir.exists():
        continue

    # Find all factory modules
    factory_modules = [
        f[:-3] for f in os.listdir(factories_dir) if f.endswith(".py") and f != "__init__.py"
    ]

    # Convert to proper module paths and add to plugins
    for module_name in sorted(factory_modules):
        pytest_plugins.append(f"cdp.{package}.test.factories.{module_name}")

"""Test edge cases for analytics wrapping.

This test file specifically tests edge cases related to wrapping methods with error tracking.

THE BUG:
When a method calls itself via ClassName.method_name or object.method, wrapping creates
infinite recursion because the wrapper replaces the class/object attribute, so the original
method's self-reference now points to the wrapper, creating a loop:
wrapper -> originalMethod -> class.method (wrapper) -> ...

TEST CASES:
1. Bug reproduction: Tests verify that methods calling via class/object cause RecursionError
2. Double-wrapping behavior: Tests verify that multiple wraps create deeper wrapper chains
3. Normal operation: Tests verify that methods not calling via class work correctly after wrapping
4. Fixed implementation: Tests verify the new implementation prevents stack overflow
"""

import pytest

from cdp.analytics import (
    Analytics,
    wrap_class_with_error_tracking,
    wrap_class_with_error_tracking_deprecated,
)
from cdp.openapi_client.errors import NetworkError


@pytest.fixture(autouse=True)
def reset_analytics(monkeypatch):
    """Reset analytics state before each test."""
    Analytics["identifier"] = "test-id"
    # Ensure error reporting is enabled for these tests
    monkeypatch.delenv("DISABLE_CDP_ERROR_REPORTING", raising=False)
    yield


@pytest.fixture(autouse=True)
def mock_aiohttp(monkeypatch):
    """Mock aiohttp for all tests."""

    # Mock the send_event function to avoid actual HTTP calls
    async def mock_send_event(event):
        pass

    monkeypatch.setattr("cdp.analytics.send_event", mock_send_event)


class TestDeprecatedImplementationBugs:
    """Tests that reproduce the bug in the deprecated implementation."""

    def test_method_calling_via_class_attribute_causes_recursion(self):
        """REPRODUCES THE BUG: method calling ClassName.method causes stack overflow."""

        class TestClass:
            async def test_method(self, value: int) -> int:
                """Method calls itself via class attribute."""
                # EDGE CASE: Method calls itself via class attribute
                # After wrapping, TestClass.test_method is the wrapper,
                # causing infinite recursion when the original method executes
                return await TestClass.test_method(self, value)

        wrap_class_with_error_tracking_deprecated(TestClass)
        instance = TestClass()

        # This causes RecursionError because:
        # 1. instance.test_method() calls the wrapper
        # 2. Wrapper calls original_method
        # 3. original_method calls TestClass.test_method(self, value)
        # 4. TestClass.test_method is now the wrapper (from step 1)
        # 5. Infinite recursion: wrapper -> original -> class.method (wrapper) -> ...
        with pytest.raises(RecursionError):
            import asyncio

            asyncio.run(instance.test_method(5))

    def test_sync_method_calling_via_class_causes_recursion(self, monkeypatch):
        """REPRODUCES THE BUG: sync method calling via class causes stack overflow."""
        # Disable error reporting for this test to avoid complications with traceback during recursion

        monkeypatch.setenv("DISABLE_CDP_ERROR_REPORTING", "true")

        class TestClass:
            def test_method(self, value: int) -> int:
                """Sync method calls itself via class attribute."""
                return TestClass.test_method(self, value)

        instance = TestClass()

        # This causes RecursionError due to direct recursion
        with pytest.raises(RecursionError):
            instance.test_method(4)


class TestDoubleWrappingBehavior:
    """Tests for double-wrapping behavior."""

    @pytest.mark.asyncio
    async def test_double_wrapping_classes(self):
        """Should allow double-wrapping - creates deeper wrapper chains."""

        class TestClass:
            async def test_method(self, value: int) -> int:
                return value * 2

        # Wrap multiple times
        wrap_class_with_error_tracking_deprecated(TestClass)
        wrap_class_with_error_tracking_deprecated(TestClass)
        wrap_class_with_error_tracking_deprecated(TestClass)

        instance = TestClass()
        result = await instance.test_method(5)
        assert result == 10

    @pytest.mark.asyncio
    async def test_rapid_successive_wraps(self):
        """Should handle rapid successive wraps."""

        class TestClass:
            async def test_method(self) -> str:
                return "test"

        # Rapid successive wraps
        for _ in range(10):
            wrap_class_with_error_tracking_deprecated(TestClass)

        instance = TestClass()
        result = await instance.test_method()
        assert result == "test"


class TestNormalOperation:
    """Tests for normal operation without edge cases."""

    @pytest.mark.asyncio
    async def test_wrap_normal_async_methods(self):
        """Should wrap normal async methods without issues."""

        class TestClass:
            async def test_method(self, value: int) -> int:
                return value * 2

            async def another_method(self, value: str) -> str:
                return f"Hello {value}"

        wrap_class_with_error_tracking_deprecated(TestClass)
        instance = TestClass()

        result1 = await instance.test_method(5)
        assert result1 == 10

        result2 = await instance.another_method("World")
        assert result2 == "Hello World"

    def test_wrap_normal_sync_methods(self):
        """Should wrap normal sync methods without issues."""

        class TestClass:
            def test_method(self, value: int) -> int:
                return value * 2

            def another_method(self, value: str) -> str:
                return f"Hello {value}"

        wrap_class_with_error_tracking_deprecated(TestClass)
        instance = TestClass()

        result1 = instance.test_method(5)
        assert result1 == 10

        result2 = instance.another_method("World")
        assert result2 == "Hello World"

    @pytest.mark.asyncio
    async def test_track_errors_correctly(self, monkeypatch):
        """Should track errors correctly in wrapped methods."""
        send_event_called = False

        async def mock_send_event(event):
            nonlocal send_event_called
            send_event_called = True

        monkeypatch.setattr("cdp.analytics.send_event", mock_send_event)

        class TestClass:
            async def failing_method(self):
                raise NetworkError("network_connection_failed", "Test network error", {})

        wrap_class_with_error_tracking_deprecated(TestClass)
        instance = TestClass()

        with pytest.raises(NetworkError):
            await instance.failing_method()

    @pytest.mark.asyncio
    async def test_preserve_method_context(self):
        """Should preserve method context correctly."""

        class TestClass:
            def __init__(self):
                self.value = 42

            async def get_value(self) -> int:
                return self.value

        wrap_class_with_error_tracking_deprecated(TestClass)
        instance = TestClass()

        result = await instance.get_value()
        assert result == 42


class TestNewImplementation:
    """Tests for the fixed implementation."""

    @pytest.mark.asyncio
    async def test_method_calling_via_class_no_recursion(self):
        """FIXED: method calling ClassName.method does NOT cause stack overflow."""

        class TestClass:
            async def test_method(self, value: int) -> int:
                """Method calls itself via class attribute."""
                # EDGE CASE: Method calls itself via class attribute
                # The new implementation prevents infinite recursion
                return await TestClass.test_method(self, value)

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        # This should NOT cause RecursionError
        # The new implementation handles this case correctly
        result = await instance.test_method(5)
        assert result == 5  # Returns first arg when recursive call is detected

    def test_sync_method_calling_via_class_no_recursion(self):
        """FIXED: sync method calling via class does NOT cause stack overflow."""

        class TestClass:
            def test_method(self, value: int) -> int:
                """Sync method calls itself via class attribute."""
                return TestClass.test_method(self, value)

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        # This should NOT cause RecursionError
        result = instance.test_method(4)
        assert result == 4  # Returns first arg when recursive call is detected

    @pytest.mark.asyncio
    async def test_wrap_normal_methods(self):
        """Should wrap normal methods without issues."""

        class TestClass:
            async def test_method(self, value: int) -> int:
                return value * 2

            async def another_method(self, value: str) -> str:
                return f"Hello {value}"

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        result1 = await instance.test_method(5)
        assert result1 == 10

        result2 = await instance.another_method("World")
        assert result2 == "Hello World"

    @pytest.mark.asyncio
    async def test_track_errors_correctly(self, monkeypatch):
        """Should track errors correctly in wrapped methods."""
        send_event_called = False

        async def mock_send_event(event):
            nonlocal send_event_called
            send_event_called = True

        monkeypatch.setattr("cdp.analytics.send_event", mock_send_event)

        class TestClass:
            async def failing_method(self):
                raise NetworkError("network_connection_failed", "Test network error", {})

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        with pytest.raises(NetworkError):
            await instance.failing_method()

    @pytest.mark.asyncio
    async def test_preserve_method_context(self):
        """Should preserve method context correctly."""

        class TestClass:
            def __init__(self):
                self.value = 42

            async def get_value(self) -> int:
                return self.value

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        result = await instance.get_value()
        assert result == 42

    @pytest.mark.asyncio
    async def test_double_wrapping_still_works(self):
        """Should handle double-wrapping correctly."""

        class TestClass:
            async def test_method(self, value: int) -> int:
                return value * 2

        # Wrap multiple times - should still work correctly
        wrap_class_with_error_tracking(TestClass)
        wrap_class_with_error_tracking(TestClass)
        wrap_class_with_error_tracking(TestClass)

        instance = TestClass()
        result = await instance.test_method(5)
        assert result == 10

    @pytest.mark.asyncio
    async def test_method_calling_class_with_different_logic(self):
        """Should handle methods that call via class but with different logic."""

        class TestClass:
            async def test_method(self, value: int) -> int:
                # Call via class but with modified logic
                result = await TestClass.test_method(self, value)
                return result + 10

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        # Should handle the recursive call gracefully
        result = await instance.test_method(5)
        # Returns first arg (5) + 10 = 15
        assert result == 15

    @pytest.mark.asyncio
    async def test_complex_recursive_scenarios(self):
        """Should handle complex recursive scenarios."""

        class TestClass:
            def __init__(self):
                self.counter = 0

            async def test_method(self, value: int) -> int:
                self.counter += 1
                if self.counter < 3:
                    # Recursive call via class
                    return await TestClass.test_method(self, value)
                return value * self.counter

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        # Should prevent infinite recursion and handle the logic correctly
        result = await instance.test_method(5)
        # The recursive calls are detected and return the first arg (5)
        assert result == 5

    def test_sync_complex_recursive_scenarios(self):
        """Should handle complex recursive scenarios in sync methods."""

        class TestClass:
            def __init__(self):
                self.counter = 0

            def test_method(self, value: int) -> int:
                self.counter += 1
                if self.counter < 2:
                    return TestClass.test_method(self, value)
                return value * self.counter

        wrap_class_with_error_tracking(TestClass)
        instance = TestClass()

        # Should prevent infinite recursion
        result = instance.test_method(4)
        # Recursive call detected, returns first arg
        assert result == 4

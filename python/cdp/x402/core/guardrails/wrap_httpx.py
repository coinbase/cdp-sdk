"""Settlement-aware HTTP transports for the x402 payment protocol."""

from __future__ import annotations

import json
import logging
from typing import Any, cast

from x402.http import PAYMENT_RESPONSE_HEADER, X_PAYMENT_RESPONSE_HEADER

from cdp.x402.core.guardrails.apply import get_spend_controls_registry

logger = logging.getLogger(__name__)

_PAYMENT_RESPONSE_HEADERS = (X_PAYMENT_RESPONSE_HEADER, PAYMENT_RESPONSE_HEADER)


def _is_settled(response_ok: bool, headers: Any) -> bool:
    """True when the response indicates on-chain settlement succeeded."""
    from x402.http.utils import decode_payment_response_header

    for name in _PAYMENT_RESPONSE_HEADERS:
        raw = headers.get(name)
        if raw is not None:
            if not raw:
                return False
            try:
                settle = decode_payment_response_header(raw)
                return getattr(settle, "success", None) is True
            except Exception:
                return False
    return response_ok


def cdp_x402_httpx_transport(
    client: Any,
    transport: Any = None,
) -> Any:
    """Create an httpx ``AsyncBaseTransport`` with settlement-aware spend tracking."""
    try:
        from x402.http.clients.httpx import x402AsyncTransport
    except ImportError as exc:
        raise ImportError(
            "httpx support requires the httpx package. Install with: pip install x402[httpx]"
        ) from exc

    class _CdpSettlementAwareTransport(x402AsyncTransport):
        async def handle_async_request(self, request: Any) -> Any:
            from x402.http.clients.httpx import x402AsyncTransport as _Base

            response = await self._transport.handle_async_request(request)
            if response.status_code != 402:
                return response
            if request.extensions.get(_Base.RETRY_KEY):
                return response

            payment_payload = None
            registry = None

            try:
                await response.aread()

                def get_header(name: str) -> str | None:
                    return cast(str | None, response.headers.get(name))

                body = None
                try:
                    body = response.json()
                except (json.JSONDecodeError, ValueError):
                    pass

                payment_required = self._http_client.get_payment_required_response(get_header, body)
                payment_payload = await self._client.create_payment_payload(payment_required)
                registry = get_spend_controls_registry(self._client)
                payment_headers = self._http_client.encode_payment_signature_header(payment_payload)

                import httpx

                new_headers = dict(request.headers)
                new_headers.update(payment_headers)
                new_headers["Access-Control-Expose-Headers"] = "PAYMENT-RESPONSE,X-PAYMENT-RESPONSE"
                new_extensions = dict(request.extensions)
                new_extensions[_Base.RETRY_KEY] = True

                retry_request = httpx.Request(
                    method=request.method,
                    url=request.url,
                    headers=new_headers,
                    content=request.content,
                    extensions=new_extensions,
                )

            except Exception as e:
                from x402.http.clients.httpx import PaymentError

                if registry and payment_payload is not None:
                    try:
                        await registry.rollback(payment_payload)
                    except Exception as rb_err:
                        logger.warning("[cdp-x402] rollback error after payload error: %s", rb_err)
                raise PaymentError(f"Failed to handle payment: {e}") from e

            try:
                retry_response = await self._transport.handle_async_request(retry_request)
            except Exception:
                raise

            if registry and payment_payload is not None:
                if _is_settled(retry_response.is_success, retry_response.headers):
                    try:
                        await registry.confirm(payment_payload)
                    except Exception as e:
                        logger.warning("[cdp-x402] confirm error: %s", e)
                else:
                    try:
                        await registry.rollback(payment_payload)
                    except Exception as e:
                        logger.warning("[cdp-x402] rollback error after settlement failure: %s", e)

            return retry_response

    return _CdpSettlementAwareTransport(client, transport)


def wrap_httpx_with_payment(
    client: Any,
    **httpx_kwargs: Any,
) -> Any:
    """Create an ``httpx.AsyncClient`` with settlement-aware 402 payment handling."""
    try:
        import httpx
    except ImportError as exc:
        raise ImportError(
            "httpx support requires the httpx package. Install with: pip install x402[httpx]"
        ) from exc

    return httpx.AsyncClient(transport=cdp_x402_httpx_transport(client), **httpx_kwargs)


def cdp_x402_http_adapter(
    client: Any,
    **adapter_kwargs: Any,
) -> Any:
    """Create a ``requests.HTTPAdapter`` with settlement-aware spend tracking."""
    try:
        from x402.http.clients.requests import x402HTTPAdapter
    except ImportError as exc:
        raise ImportError(
            "requests support requires the requests package. "
            "Install with: pip install x402[requests]"
        ) from exc

    class _CdpSettlementAwareAdapter(x402HTTPAdapter):
        def send(  # type: ignore[override]
            self,
            request: Any,
            stream: Any = False,
            timeout: Any = None,
            verify: Any = True,
            cert: Any = None,
            proxies: Any = None,
        ) -> Any:
            import copy

            kwargs = dict(stream=stream, timeout=timeout, verify=verify, cert=cert, proxies=proxies)
            is_retry = request.headers.get(self.RETRY_HEADER) == "1"
            response = super(x402HTTPAdapter, self).send(request, **kwargs)

            if response.status_code != 402:
                return response
            if is_retry:
                return response

            payment_payload = None
            registry = None

            try:
                content = copy.deepcopy(response.content)

                def get_header(name: str) -> str | None:
                    return response.headers.get(name)

                body = None
                try:
                    body = json.loads(content.decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    pass

                payment_required = self._http_client.get_payment_required_response(get_header, body)
                payment_payload = self._client.create_payment_payload(payment_required)
                registry = get_spend_controls_registry(self._client)
                payment_headers = self._http_client.encode_payment_signature_header(payment_payload)

                retry_request = request.copy()
                retry_request.headers.update(payment_headers)
                retry_request.headers["Access-Control-Expose-Headers"] = (
                    "PAYMENT-RESPONSE,X-PAYMENT-RESPONSE"
                )
                retry_request.headers[self.RETRY_HEADER] = "1"

            except Exception as e:
                from x402.http.clients.requests import PaymentError

                if registry and payment_payload is not None:
                    try:
                        registry.rollback_sync(payment_payload)
                    except Exception as rb_err:
                        logger.warning("[cdp-x402] rollback error after payload error: %s", rb_err)
                raise PaymentError(f"Failed to handle payment: {e}") from e

            try:
                retry_response = super(x402HTTPAdapter, self).send(retry_request, **kwargs)
            except Exception:
                raise

            if registry and payment_payload is not None:
                if _is_settled(retry_response.ok, retry_response.headers):
                    try:
                        registry.confirm_sync(payment_payload)
                    except Exception as e:
                        logger.warning("[cdp-x402] confirm error: %s", e)
                else:
                    try:
                        registry.rollback_sync(payment_payload)
                    except Exception as e:
                        logger.warning("[cdp-x402] rollback error after settlement failure: %s", e)

            return retry_response

    return _CdpSettlementAwareAdapter(client, **adapter_kwargs)


def wrap_requests_with_payment(
    session: Any,
    client: Any,
    **adapter_kwargs: Any,
) -> Any:
    """Wrap a ``requests.Session`` with settlement-aware 402 payment handling."""
    adapter = cdp_x402_http_adapter(client, **adapter_kwargs)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

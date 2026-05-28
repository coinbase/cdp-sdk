"""Settlement-aware HTTP transports for the x402 payment protocol.

This module provides httpx and requests integrations that consult the
:class:`~cdp_x402.core.guardrails.apply.SpendControlsRegistry` attached by
:func:`~cdp_x402.core.guardrails.apply.apply_spend_controls`. Spend controls
record provisional spend when a payment payload is created; these transports
then inspect the paid HTTP response and finalize that record based on the
settlement result:

  * ``2xx`` + ``PAYMENT-RESPONSE: success=true`` (or ``2xx`` with no header for
    legacy servers) → :meth:`~SpendControlsRegistry.confirm` is called:
    threshold notifications fire and the ledger entry stays.
  * Non-``2xx``, missing header for a non-``2xx`` response, or
    ``success=false`` → :meth:`~SpendControlsRegistry.rollback` is called:
    the ledger entry is removed and threshold state is reset so a retry
    re-notifies correctly.

If a network error occurs after the paid request has been sent, the provisional
spend is kept so the cap fails closed; the server may have settled on-chain even
though the client lost the response, and the caller can reconcile or retry
explicitly.

If the client has no spend controls applied the transports degrade
transparently to upstream behaviour.

Usage (httpx async)::

    from cdp_x402.core.guardrails import apply_spend_controls, SpendControls
    from cdp_x402.core.guardrails.wrap_httpx import cdp_x402_httpx_transport
    import httpx

    client = CdpX402Client()
    apply_spend_controls(client._inner, controls)  # or pass CdpX402Client directly
    async with httpx.AsyncClient(transport=cdp_x402_httpx_transport(client)) as http:
        response = await http.get("https://api.example.com/paid")

Usage (requests sync)::

    from cdp_x402.core.guardrails.wrap_httpx import wrap_requests_with_payment
    import requests

    session = wrap_requests_with_payment(requests.Session(), sync_client)
    response = session.get("https://api.example.com/paid")
"""

from __future__ import annotations

import json
import logging
from typing import Any, cast

from x402.http import PAYMENT_RESPONSE_HEADER, X_PAYMENT_RESPONSE_HEADER

from cdp_x402.core.guardrails.apply import get_spend_controls_registry

logger = logging.getLogger(__name__)

# Header names the server may use to return the encoded settlement response.
# v2 prefers X-PAYMENT-RESPONSE; v1 uses PAYMENT-RESPONSE (no X- prefix).
_PAYMENT_RESPONSE_HEADERS = (X_PAYMENT_RESPONSE_HEADER, PAYMENT_RESPONSE_HEADER)


def _is_settled(response_ok: bool, headers: Any) -> bool:
    """True when the response indicates on-chain settlement succeeded.

    When a ``SettleResponse`` header is present it is the authoritative source
    of truth, regardless of the HTTP status code.  This covers the case where
    the server confirms on-chain settlement but returns a non-2xx error for the
    resource itself (e.g. authorisation failed after payment was already sent
    on-chain).

    - Decoded header present: ``settle.success is True`` decides.
    - Header present but empty or malformed: not settled — without a valid
      header we have no proof of on-chain settlement (fail closed).
    - No header at all: fall back to the HTTP status code to preserve
      compatibility with legacy servers that omit the header.
    """
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


# ---------------------------------------------------------------------------
# httpx async transport
# ---------------------------------------------------------------------------


def cdp_x402_httpx_transport(
    client: Any,
    transport: Any = None,
) -> Any:
    """Create an httpx ``AsyncBaseTransport`` with settlement-aware spend tracking.

    Drop-in replacement for :func:`x402.http.clients.x402_httpx_transport`.

    :param client: ``x402Client``, ``x402HTTPClient``, or ``CdpX402Client``.
    :param transport: Optional underlying httpx transport.
    :returns: A transport suitable for ``httpx.AsyncClient(transport=...)``.
    """
    try:
        from x402.http.clients.httpx import x402AsyncTransport
    except ImportError as exc:
        raise ImportError(
            "httpx support requires the httpx package. Install with: pip install x402[httpx]"
        ) from exc

    class _CdpSettlementAwareTransport(x402AsyncTransport):
        async def handle_async_request(self, request: Any) -> Any:
            from x402.http.clients.httpx import x402AsyncTransport as _Base

            # Pass through non-402 and retry requests unchanged.
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
                # Resolve the registry after create_payment_payload so that a
                # lazy client (e.g. CDPX402Client) has already run its
                # initialization and wired spend controls before we look up.
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
                # The paid request was sent but the response was lost. The
                # server may have settled on-chain, so keep the provisional
                # ledger entry and let the cap fail closed until the caller
                # reconciles or retries explicitly.
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
    """Create an ``httpx.AsyncClient`` with settlement-aware 402 payment handling.

    Drop-in replacement for :func:`x402.http.clients.wrapHttpxWithPayment`.

    :param client: ``x402Client``, ``x402HTTPClient``, or ``CdpX402Client``.
    :param httpx_kwargs: Additional keyword arguments for ``httpx.AsyncClient``.
    :returns: ``httpx.AsyncClient`` configured with the settlement-aware transport.
    """
    try:
        import httpx
    except ImportError as exc:
        raise ImportError(
            "httpx support requires the httpx package. Install with: pip install x402[httpx]"
        ) from exc

    return httpx.AsyncClient(transport=cdp_x402_httpx_transport(client), **httpx_kwargs)


# ---------------------------------------------------------------------------
# requests sync adapter
# ---------------------------------------------------------------------------


def cdp_x402_http_adapter(
    client: Any,
    **adapter_kwargs: Any,
) -> Any:
    """Create a ``requests.HTTPAdapter`` with settlement-aware spend tracking.

    Drop-in replacement for :func:`x402.http.clients.x402_http_adapter`.

    :param client: ``x402ClientSync`` or ``x402HTTPClientSync``.
    :param adapter_kwargs: Additional keyword arguments for ``requests.HTTPAdapter``.
    :returns: An adapter suitable for ``session.mount(...)``.
    """
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
                # Resolve the registry after create_payment_payload so that a
                # lazy client (e.g. CDPX402Client) has already run its
                # initialization and wired spend controls before we look up.
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
                # See the async transport for the rationale: the paid request
                # was sent, so keep the provisional ledger entry.
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
    """Wrap a ``requests.Session`` with settlement-aware 402 payment handling.

    Drop-in replacement for :func:`x402.http.clients.wrapRequestsWithPayment`.

    :param session: The ``requests.Session`` to wrap.
    :param client: ``x402ClientSync`` or ``x402HTTPClientSync``.
    :param adapter_kwargs: Additional keyword arguments for the adapter.
    :returns: The same session with the settlement-aware adapter mounted.
    """
    adapter = cdp_x402_http_adapter(client, **adapter_kwargs)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

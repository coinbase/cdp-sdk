Added client-side validation that requires 1 to 100 rules per policy. Invalid rule counts now raise a Pydantic `ValidationError` before the SDK sends the request.

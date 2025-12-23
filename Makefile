.PHONY: update-openapi check-openapi-updated generate-all-clients help

# The timestamp ensures all requests are unique and the latest spec is fetched.
OPENAPI_URL := https://drla6sbl8l00t.cloudfront.net/openapi.yaml?timestamp=$(shell date +%s)
OPENAPI_LOCAL := openapi.yaml
OPENAPI_TEMP := openapi.yaml.new

help:
	@echo "Available commands:"
	@echo "  make update-openapi      - Download the latest OpenAPI spec from the CDN"
	@echo "  make check-openapi       - Check if a newer OpenAPI spec is available"
	@echo "  make generate-all-clients - Generate clients for all languages"

generate-all-clients:
	@echo "Generating TypeScript client..."
	@cd typescript && npm run orval
	@echo "Generating Python client..."
	@cd python && make python-client
	@echo "Generating Rust client..."
	@cd rust && make generate && make format
	@echo "Generating Go client..."
	@cd go && make client
	@echo "All clients generated successfully!"

update-openapi:
	@echo "Downloading latest OpenAPI spec from $(OPENAPI_URL)..."
	@curl -s -o $(OPENAPI_TEMP) $(OPENAPI_URL)
	@if [ ! -f $(OPENAPI_LOCAL) ] || ! cmp -s $(OPENAPI_TEMP) $(OPENAPI_LOCAL); then \
		mv $(OPENAPI_TEMP) $(OPENAPI_LOCAL); \
		echo "OpenAPI spec updated successfully."; \
	else \
		rm $(OPENAPI_TEMP); \
		echo "OpenAPI spec is already up to date."; \
	fi

check-openapi:
	@echo "Checking for OpenAPI updates..."
	@curl -s -o $(OPENAPI_TEMP) $(OPENAPI_URL)
	@if [ ! -f $(OPENAPI_LOCAL) ] || ! cmp -s $(OPENAPI_TEMP) $(OPENAPI_LOCAL); then \
		echo "A newer OpenAPI spec is available. Run 'make update-openapi' to update."; \
		rm $(OPENAPI_TEMP); \
	else \
		echo "OpenAPI spec is up to date."; \
		rm $(OPENAPI_TEMP); \
		exit 0; \
	fi

#
# Project Metadata
# These act as inputs to other makefile targets.
#
ORG := coinbase
PROJECT := cdp-sdk
VERSION := $(shell git describe --tags --always)
BUILD := $(shell git rev-parse --short HEAD)

#
# Tool Prerequisites Check
# This ensures that you have the necessary executables installed to run this makefile.
#
BUILD_PREREQUISITES = git go
VALIDATION_PREREQUISITES = golangci-lint

#
# Build Options
# Typical inputs to the build targets found below.
#
TARGET=target
BIN=$(TARGET)/bin

.PHONY: usage build test-cover fmt verify deps-dev
usage:
	@ echo "Usage: make [`cat Makefile | grep "^[A-z\%\-]*:" | awk '{print $$1}' | sed "s/://g" | sed "s/%/[1-3]/g" | xargs`]"

.PHONY: info
info:
	@ echo ORG: $(ORG)
	@ echo PROJECT: $(PROJECT)
	@ echo VERSION: $(VERSION)
	@ echo BUILD: $(BUILD)

#
# Build Targets
# These are the primary developer workflow targets for building the software.
#

.PHONY: clean
clean: info
	@ rm -rf target
	@ go mod tidy

.PHONY: build_deps
build_deps: info clean
	@ printf $(foreach exec,$(BUILD_PREREQUISITES), \
        $(if $(shell which $(exec)),"", \
        $(error "No $(exec) in PATH. Prerequisites are: $(BUILD_PREREQUISITES)")))

.PHONY: validation_deps
validation_deps: info clean
	@ printf $(foreach exec,$(VALIDATION_PREREQUISITES), \
        $(if $(shell which $(exec)),"", \
        $(error "No $(exec) in PATH. Prerequisites are: $(VALIDATION_PREREQUISITES)")))

.PHONY: lint
lint: clean validation_deps
	@ printf "\nLint App\n"
	@golangci-lint run --timeout=5m --config=.golangci.yaml ./...

.PHONY: lint-fix
lint-fix: clean validation_deps
	@ printf "\nFixing lint issues\n"
	@golangci-lint run --timeout=5m --config=.golangci.yaml --fix ./...

.PHONY: docs
docs:
	@printf "\nGenerating docs\n"
	@golds -gen -dir=./docs -emphasize-wdpkgs

.PHONY: test
test: build_deps
	@ printf "\nRunning Go tests\n"
	@ go test -v ./...

## build: compile all packages (including x402)
.PHONY: build
build:
	go build -v ./...

## test-cover: run tests and open an HTML coverage report
test-cover:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

## fmt: format all Go files with goimports (superset of gofmt)
fmt:
	goimports -w .

## verify: fmt + lint + test (run before opening a PR)
verify: fmt lint test

## deps-dev: install development tools (golangci-lint, goimports)
deps-dev:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest

.PHONY: client
client:
	@ printf "\nGenerating client...\n"
	@ python ../scripts/preprocess_openapi.py ../openapi.yaml ../openapi-preprocessed.yaml
	@ oapi-codegen --config=client-config.yaml -o ./openapi/client.gen.go ../openapi-preprocessed.yaml
	@ printf "\nClient generated successfully!\n"

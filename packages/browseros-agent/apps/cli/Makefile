BINARY := browseros-cli
SOURCES := $(shell find . -name '*.go')
VERSION ?= dev
POSTHOG_API_KEY ?=
LDFLAGS := -X main.version=$(VERSION) -X browseros-cli/analytics.posthogAPIKey=$(POSTHOG_API_KEY)

$(BINARY): $(SOURCES)
	go build -ldflags "$(LDFLAGS)" -o $(BINARY) .

.PHONY: install clean vet test

install:
	go install -ldflags "$(LDFLAGS)" .

clean:
	rm -f $(BINARY)

vet:
	go vet ./...

test:
	go test -tags integration -v -timeout 120s ./...

release-dry:
	goreleaser release --snapshot --clean

release:
	goreleaser release --clean

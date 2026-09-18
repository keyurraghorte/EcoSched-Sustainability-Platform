---
name: Generated client DOM iterable types
description: Orval's generated custom fetch client uses Headers.entries and requires dom.iterable in the client library compiler libs.
---

The shared generated API client needs `dom.iterable` alongside `dom` in its TypeScript `lib` settings because Orval's `Headers.entries()` helper otherwise fails the workspace typecheck.

**Why:** The generated client is regenerated from OpenAPI and the compiler error appears only after codegen, so the setting must live in the shared client package rather than in an app-specific workaround.

**How to apply:** If codegen starts failing on `Headers.entries`, check `lib/api-client-react/tsconfig.json` includes both `dom` and `dom.iterable`.
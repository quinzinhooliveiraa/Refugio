---
name: Workflow entrypoints
description: Runtime behavior can come from a managed workflow entrypoint different from nearby source files.
---

When an API response does not match the route source, inspect the managed workflow command and its actual entrypoint before debugging the route implementation.

**Why:** This workspace keeps both a standalone runtime entrypoint and TypeScript source for the API; editing only the source can leave the running service unchanged.

**How to apply:** After server changes, verify the command used by the managed workflow, then restart that exact workflow and exercise the route through the shared proxy.
---
name: Workflow entrypoints
description: Runtime behavior can come from a managed workflow entrypoint different from nearby source files.
---

When an API response does not match the route source, inspect the managed workflow command and its actual entrypoint before debugging the route implementation.

**Why:** This workspace keeps both a standalone runtime entrypoint and TypeScript source for the API; editing only the source can leave the running service unchanged.

**How to apply:** After server changes, verify the command used by the managed workflow, then restart that exact workflow and exercise the route through the shared proxy.

For one-off Vite builds in artifact services, provide the same `PORT` and `BASE_PATH` values configured by the artifact service; the config intentionally fails fast when either is missing.

**Why:** Running the package build outside the managed workflow does not inherit those service variables, so an otherwise valid frontend change can appear to have a broken build.

**How to apply:** Read the artifact service environment before invoking a standalone build, or rely on the managed workflow for runtime validation.
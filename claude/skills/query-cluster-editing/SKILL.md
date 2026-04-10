---
name: query-cluster-editing
description: Add manual editing controls for query clusters and individual queries in Antellion.
---

When invoked:
1. Inspect the query cluster schema, validations, generation flow, and dashboard routes
2. Allow users to rename clusters
3. Allow add/remove of individual queries within a cluster
4. Allow toggling active state where supported by the schema
5. Preserve the existing generation pipeline and avoid unnecessary redesign
6. Add tests for edited cluster behavior
7. Summarize UX decisions and data integrity tradeoffs
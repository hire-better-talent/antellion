---
name: Enterprise scaling approach
description: Design decision to use company profile fields + scale-aware query templates for enterprise clients rather than a first-class AssessmentSegment model
type: project
---

Enterprise client support (Home Depot, TD Bank, Coca-Cola class) was implemented via company profile fields on Client + scale-aware query templates, NOT a separate AssessmentSegment model.

**Why:** The existing multi-scan-per-report workflow already handles running different role/geography combinations per client. Adding a first-class segment model would create coupling between segments and scan runs without immediate product value. The profile fields (revenueScale, knownFor, headquarters, etc.) enable all the enterprise-aware query generation needed today.

**How to apply:** When segment-level reporting or segment-scoped competitor sets are needed, that's the trigger to introduce an AssessmentSegment model. Until then, the operator guides multi-segment assessments by running multiple query generation passes with different role/geography inputs. The `requiresScale` field on QueryTemplate conditionally activates enterprise-specific templates.

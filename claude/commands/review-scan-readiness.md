Use the coo agent to run a scan-readiness review for: $ARGUMENTS

Route detailed review through the query-ops agent and use the quality agent if needed.

Requirements:
- inspect the intended scan inputs, latest query set, competitors, personas, and workflow status first
- verify the query set is fit to run before spending time or model budget
- call out missing coverage, duplicate intent, weak prompts, and workflow blockers
- return a clear decision: ready, ready with edits, or not ready
- summarize required fixes in priority order

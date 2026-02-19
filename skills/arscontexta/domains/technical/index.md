# Technical Domain

Remote infrastructure work: SSH access, WordPress debugging, server maintenance.

## Workflow Claims

- [[wordpress-debug-workflow]] — systematic approach to plugin conflicts, white screens, broken updates
- [[ssh-safety-protocols]] — never run untested commands on production, always backup first
- [[server-diagnostics]] — memory, disk, logs: where to look when things break

## Tools

- `ssh` tool — execute commands on remote servers
- `wp` tool — WP-CLI for WordPress management
- `bash` tool — local system operations

## Principles

1. **Backup before touch** — snapshots or exports before any change
2. **Read logs first** — errors tell the story
3. **Small changes, verify** — one fix at a time, test between
4. **Document what broke** — so it doesn't break the same way twice

## Cross-Domain Links

- After technical work → [[../sales/value-to-invoice-bridge]]
- If client relationship is new → [[../sales/no-revelar-fuentes-en-outreach]]

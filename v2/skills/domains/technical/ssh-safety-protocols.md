# SSH Safety Protocols

**Claim**: Production servers demand defensive execution. Every command is a potential outage.

## When to Apply

- Any SSH command on a production server
- Working on client infrastructure
- Modifying live databases or files

## The Rules

1. **Read before write** — `ls`, `cat`, `grep` before `rm`, `mv`, or edits
2. **Backup first** — database dump, file copy, or snapshot
3. **No `rm -rf` without verification** — check path twice, use absolute paths
4. **Test dangerous commands** — if possible, staging or local first
5. **One change at a time** — no batch modifications without checkpoints
6. **Document what you did** — so rollback is possible

## Red Flags

- Commands you haven't run before
- Modifying core files
- Database schema changes
- Permission changes (`chmod`, `chown`)
- Any command suggested by someone else without verification

## Response Protocol

If something breaks:
1. Stop immediately
2. Check what changed
3. Restore from backup if needed
4. Document the failure
5. Report to owner

## Authorization Model

- Only run SSH on registered servers (see `list_servers`)
- Each server has explicit authorization in configuration
- No ad-hoc connections without credentials

## Related Claims

- [[wordpress-debug-workflow]] — applies these protocols to WP contexts
- [[../sales/value-to-invoice-bridge]] — safety work has value, invoice it

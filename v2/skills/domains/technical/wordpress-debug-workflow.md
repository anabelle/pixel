# WordPress Debug Workflow

**Claim**: Systematic debugging prevents cascading failures and enables confident fixes.

## When to Apply

- White screen of death
- Plugin conflict symptoms (broken admin, missing features)
- Update failures
- Performance degradation

## The Protocol

1. **Read error logs first** — `wp plugin list`, check `debug.log`, PHP error logs
2. **Identify the trigger** — recent update? new plugin? config change?
3. **Isolate the conflict** — disable plugins one by one if needed
4. **Fix the root cause** — update, replace, or remove the problematic element
5. **Verify the fix** — test the specific feature that broke
6. **Document** — what broke, why, what fixed it

## Safety Rules

- Never debug on production without backup
- Use `--dry-run` when available
- Screenshot or export before touching
- If unsure, staging environment first

## Real Examples

- **tallerubens**: Google Listings & Ads + PayPal conflict → disabled one, tested, documented
- **ambienteniwa**: PHP version incompatibility → identified via logs, updated plugin

## Related Claims

- [[ssh-safety-protocols]] — protection layer
- [[../sales/value-to-invoice-bridge]] — what to do after successful fix

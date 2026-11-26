# Automation Guardrails

## Purpose

Establish boundaries for autonomous operations to prevent dangerous behavior while maintaining utility. Based on NSFW filter failure and revenue collection gaps.

## Core Principles

1. **Payment Before Service** - No code execution without verified payment
2. **Content Filtering** - NSFW/unsafe content blocked at intake
3. **Rate Limiting** - Prevent abuse through usage quotas
4. **Audit Trail** - Every action logged with client ID
5. **Emergency Shutdown** - Manual override for critical failures

## Implementation

### 1. Payment Verification
- Create Lightning invoice before any service
- Verify payment status before execution
- Track sats collected vs recorded
- Auto-cancel pending services after 24h

### 2. Content Safety
- NSFW detection on all inputs
- Block prohibited file types
- Sanitize commands before execution
- Alert owner for boundary violations

### 3. Usage Quotas
- Per-client daily limits
- Service-specific caps
- Time-based throttling
- Priority tiers for paying customers

### 4. Monitoring
- Real-time payment tracking
- Service utilization metrics
- Revenue vs costs analysis
- Boundary violation alerts

## Revenue Targets

- Convert 111k sats recorded to actual collection
- Implement auto-invoicing for SSH/WPCLI usage
- Add conversion paths to Nostr posts
- Track ROI on automation services

## Testing

- Simulate payment failures
- Test content filtering
- Verify quota enforcement
- Audit trail completeness

---
*Vendor mindset: Infrastructure without business model is just expensive performance art.*
## 📚 Knowledge Base
- **Treasury Balance**: 79,014 sats, verified on 2025-12-29. No transactions.
- **Container Health**: Most containers are up, but Nginx is currently in a restarting state.
- **Agent Logs Findings**: Detected multiple plugin loading failures, notably: 
  - `@elizaos/plugin-telegram`: Installation failed due to module not found.
  - `@elizaos/plugin-discord`: Installation failed due with similar module resolution errors.
  - `pgcrypto` extension failed to install, investigate database dependencies.
  - Various plugins auto-install attempts were logged but failed to resolve.
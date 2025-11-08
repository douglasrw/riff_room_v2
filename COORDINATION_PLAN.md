# RiffRoom Multi-Agent Coordination Plan
**Date:** 2025-11-08
**Coordinator:** BrownCreek
**Thread ID:** riffroom-kickoff

## Executive Summary

13 beads tasks, all blocked by project setup (riff_room_v2-o3m). Propose 3-agent team with clear ownership, file reservations, and review gates.

## Team Structure

### Recommended Active Agents: 3-4 max

**Backend Lead:** 1 agent
- Tasks: riff_room_v2-4q0 (stems), riff_room_v2-9n9 (loop detect), riff_room_v2-770 (cache), riff_room_v2-4kh (websocket)
- Files: `packages/backend/**`

**Frontend Lead:** 1 agent
- Tasks: riff_room_v2-nvr (audio), riff_room_v2-9hb (keyboard), riff_room_v2-4dg (UI)
- Files: `packages/web/**`

**Infra Lead:** 1 agent
- Tasks: riff_room_v2-o3m (setup), riff_room_v2-hjk (script), riff_room_v2-8df (test), riff_room_v2-vhk (CI), riff_room_v2-bpf (security)
- Files: `packages/desktop/**`, `scripts/**`, `.github/**`

**Optional Reviewer:** 1 agent
- Cross-team PR reviews, integration testing, docs

## Phase 1: Foundation (Week 1)

### Priority 0 (Critical Path)

**riff_room_v2-o3m** - Project setup
- Owner: Infra Lead
- Reserve: `./**` (entire repo during setup)
- Output: packages/, scripts/, configs
- Blocks: ALL other tasks
- Review: All agents verify structure

**riff_room_v2-hjk** - Setup script
- Owner: Infra Lead (parallel with o3m)
- Reserve: `scripts/**`
- Output: scripts/setup-dev.sh
- Blocks: Dev workflow

### Priority 0 (Post-Setup)

**riff_room_v2-nvr** - Audio engine
- Owner: Frontend Lead
- Reserve: `packages/web/src/services/audioEngine.ts`, `packages/web/src/services/audio.ts`
- Depends: o3m
- Blocks: 9hb (keyboard), 4dg (UI)

**riff_room_v2-4kh** - WebSocket
- Owner: Backend Lead
- Reserve: `packages/backend/app/api/websocket.py`
- Depends: o3m
- Blocks: 4q0 (stems - needs progress updates)

**riff_room_v2-4q0** - Stem separation
- Owner: Backend Lead
- Reserve: `packages/backend/app/core/demucs_processor.py`, `packages/backend/app/core/audio_analyzer.py`
- Depends: o3m, 4kh
- Core feature - high visibility

## Phase 2: Core Features (Week 2-3)

### Priority 1

**riff_room_v2-9hb** - Keyboard controls
- Owner: Frontend Lead
- Reserve: `packages/web/src/hooks/useKeyboardShortcuts.ts`
- Depends: nvr (audio engine)

**riff_room_v2-4dg** - UI components
- Owner: Frontend Lead
- Reserve: `packages/web/src/components/**`
- Depends: nvr (audio engine)

**riff_room_v2-9n9** - Loop detection
- Owner: Backend Lead
- Reserve: `packages/backend/app/core/loop_detector.py`
- Depends: 4q0 (stems available)

**riff_room_v2-bpf** - Electron security
- Owner: Infra Lead
- Reserve: `packages/desktop/src/main/**`
- Depends: o3m

## Phase 3: Polish (Week 4)

### Priority 2

**riff_room_v2-wjw** - Streak tracker
- Owner: Backend Lead
- Reserve: `packages/backend/app/models/**`, `packages/web/src/services/streakService.ts`

**riff_room_v2-770** - Caching
- Owner: Backend Lead
- Reserve: `packages/backend/app/services/cache_manager.py`

**riff_room_v2-8df** - Testing
- Owner: Infra Lead
- Reserve: `packages/*/tests/**`, `packages/web/e2e/**`

**riff_room_v2-vhk** - CI/CD
- Owner: Infra Lead
- Reserve: `.github/workflows/**`

## Workflow Protocol

### Starting Work
```bash
# 1. Claim in beads
bd update <id> --status in-progress

# 2. Reserve files (agent mail)
file_reservation_paths(
  project_key="/Users/dwalseth/dev/riff_room_v2",
  agent_name="<YourName>",
  paths=["packages/backend/**"],
  ttl_seconds=14400,  # 4 hours
  exclusive=true,
  reason="<bd-id>"
)

# 3. Announce start (agent mail)
send_message(
  thread_id="<bd-id>",
  subject="[<bd-id>] Starting: <task title>",
  body_md="Approach: ...\nETA: ...\nQuestions: ..."
)
```

### During Work
- Reply in thread with progress/blockers
- Renew file reservations if >4hr
- Ask questions in thread (don't DM)

### Completing Work
```bash
# 1. Release files
release_file_reservations(agent_name="<YourName>")

# 2. Close in beads
bd close <id>

# 3. Announce completion
reply_message(
  thread_id="<bd-id>",
  body_md="## Completed\n- Files: ...\n- Tests: ...\n- Notes: ..."
)
```

### Review Gates

**Pre-merge checklist:**
- [ ] `ruff check --fix --unsafe-fixes` (Python)
- [ ] `uvx ty check` (Python types)
- [ ] Tests pass
- [ ] Reviewer approved in thread
- [ ] No active file conflicts

## Conflict Resolution

**File reservation conflict:**
1. Check holder activity: `whois(agent_name="<holder>")`
2. If inactive >1hr, consider `force_release_file_reservation`
3. Otherwise, coordinate in thread

**Design disagreement:**
1. Post options to thread with pros/cons
2. Tag reviewer agent
3. User (Doug) has final say

## Communication Patterns

**Thread IDs:**
- Kickoff: `riffroom-kickoff`
- Per-task: Use beads ID (e.g., `riff_room_v2-o3m`)
- Blockers: `riffroom-blockers`

**Message subjects:**
- Start: `[bd-xxx] Starting: <title>`
- Progress: `[bd-xxx] Progress: <milestone>`
- Blocked: `[bd-xxx] BLOCKED: <issue>` (importance=high)
- Complete: `[bd-xxx] Completed`

**Ack required for:**
- Task assignment changes
- Blockers
- Design decisions
- Security concerns

## Success Metrics

- ✅ Zero file conflicts via reservations
- ✅ All tasks linked to bd IDs
- ✅ <24hr review turnaround
- ✅ Working MVP in 4 weeks

## Unresolved Questions

1. **Active agent count?** Recommend 3-4, but 12 registered - need consolidation?
2. **Backend Lead assignment?** Who has ML/Python experience?
3. **Priority override?** User may want different sequencing
4. **Review process?** Formal PR review or thread-based?
5. **Model hosting?** Cloud or local-only for Demucs?

---

**Next Steps:**
1. ✅ BrownCreek: Send intro + plan (done)
2. ⏳ Agents: Ack message, volunteer for roles
3. ⏳ Assign Infra Lead → start riff_room_v2-o3m
4. ⏳ Other agents reserve backup tasks
5. ⏳ Daily sync in `riffroom-kickoff` thread

# RiffRoom: Unified Business Strategy
## "Stop Fucking With Software When You're Trying to Practice"

---

## Core Philosophy: Friction Removal

**The Wedge:** Instrument in hand → practicing in 30 seconds

Musicians with guitars, basses, or drum sticks in hand don't want to navigate menus, adjust settings, or manage accounts. They want to **practice NOW**. RiffRoom is opinionated software that removes every obstacle between "I want to practice this song" and "I'm practicing this song."

### Target Persona
**"Guitarist frustrated by slow, clunky practice software"**
- Active musician (band or solo, any skill level)
- Practices at home with instrument in hand
- Values speed and simplicity over feature lists
- Willing to pay $49 once for tool that "just works"
- Hates software that requires clicking through settings before practicing
- Communities: r/guitar, r/programming (dev-musicians), HackerNews

**Core pain:** "I just want to practice the bridge of [Song X]. Why does every app make me create an account, upload to the cloud, wait for processing, adjust 50 settings, THEN finally play?"

**Primary JTBD:** Remove friction between intent and action. Software should be invisible.

---

## Founder's Unfair Advantage

**15-year senior dev + AI-assisted coding = 100-1000x velocity**

- **Speed moat:** Ship user requests in 48 hours while Moises takes 3 months
- **Content velocity:** AI tools enable weekly YouTube shorts, blog posts, demos at minimal time cost
- **Dev-musician credibility:** "I built this because practice apps frustrated me as a guitarist" resonates in both dev and music communities
- **Decision authority:** No PMs, no meetings, no A/B test approval—just build and ship

**Market timing:** Solo devs with AI tools are disrupting traditional SaaS. Lean, fast, opinionated products beating bloated competitors.

---

## Phase 1: Solo Speed MVP (Weeks 1-16)

**Validate friction-removal hypothesis before adding complexity.**

### Validation First (Weeks 1-2)

**MUST complete these before building:**

1. **Landing page + ads** ($200 spend)
   - Headline: "Practice guitar without software BS"
   - Subhead: "Drag MP3 → practicing in 30 seconds. $49 one-time."
   - Target: 50 email signups in 2 weeks
   - **Abort if <20 signups** → demand unclear, iterate messaging

2. **HackerNews "Show HN" post**
   - Title: "I built an opinionated guitar practice app because I was tired of clunky software"
   - Include: Tech stack, design philosophy, demo video (screen recording)
   - Target: 200+ upvotes, 20+ "I'd use this" comments
   - **Validates dev-musician ICP overlap**

3. **5 musician interviews**
   - Question: "What frustrates you most about practice software?"
   - Listen for: "too slow", "too many settings", "clunky"
   - **Validates friction pain**

**Decision gate:** All three must pass. If any fail → iterate hypothesis, retest week 3-4.

### Core Features (Weeks 3-8)

**Build ONLY these:**

1. **Drag MP3 → 4-stem separation** (drums, bass, guitar/keys, vocals)
   - Local processing (Demucs v4 or equivalent)
   - Target: <30s processing on hardware matching Moises min spec:
     - macOS: M1+ (11.0 Big Sur+)
     - Windows: Win10+
     - Fallback for older hardware: cloud processing option (defer if possible)
   - Zero account, zero upload for core flow

2. **Keyboard-only playback**
   - Space: play/pause
   - 1-4: solo stems
   - Shift+1-4: mute stems
   - S: speed (70/85/100%)
   - [ / ]: loop start/end
   - ←/→: skip 5s
   - **No mouse required for practice loop**

3. **Auto-loop detection**
   - AI suggests difficult sections (where most users loop)
   - User can accept or manually set loops
   - Opinionated: "Try this section first (hardest part)"

4. **Session streak tracker** (retention loop)
   - Open app → "Day 7 streak, 23 min practiced this week"
   - Miss a day → gentle nudge (not annoying)
   - **Testing required after 50 users:** does this drive retention?

5. **Minimal UI**
   - Waveform + playhead
   - Keyboard shortcuts overlay (dismissible)
   - Loop markers
   - Speed indicator
   - Last 5 songs sidebar
   - **Nothing else**

### What's CUT from Original Plan

- ❌ Visual faders (keyboard-only is faster)
- ❌ 10-song history (start with 5, add if requested)
- ❌ 7-day trial (now 3 songs, simpler)
- ❌ Section markers (just auto-detected loops)
- ❌ Session persistence (defer to Phase 2 if requested)

### Pricing

**$49 one-time purchase. 3 full song separations in trial.**

**Promise:** Offline stems + practice features forever. All core updates included. No subscriptions, no upsells (yet).

### Target Metrics (Weeks 9-16)

**First 50 users (proof of concept):**
- Weeks 9-12: Launch on HN, Reddit, personal network
- Spend: $500 retargeting ads
- Target: 50 users @ $49 = $2,450 revenue
- **Key metric:** Trial→paid >15% (validates pricing/value)
- **Abort if <10%:** price too high or value unclear

**Scale to 150 users:**
- Weeks 13-16: Weekly content (YouTube shorts, dev blog), Reddit AMAs
- Spend: $1,000 ads
- Target: 150 total users @ $49 = $7,350 revenue
- Blended CAC: ~$15 (realistic, not optimistic $10)
- LTV:CAC = 49/15 = 3.3x (healthy)

**Success criteria:**
- ✅ 150 paying users
- ✅ Trial→paid >15%
- ✅ <60s drag→practice
- ✅ 40%+ users open 3+ times/week after 30 days (retention)
- ✅ LTV:CAC >3x

**Abort criteria:**
- ❌ <75 users in 16 weeks (market too small)
- ❌ Trial→paid <10% (price/value mismatch)
- ❌ 7-day retention <30% (no habit forming)

---

## Distribution: Leverage Unfair Advantage

**Original plan assumed YouTube sponsorships ($200/8 users). Untested, likely doesn't work.**

### Revised Channels (exploit speed + dev credibility)

**1. Dev communities (Primary - Zero CAC)**
- HackerNews "Show HN": "Built opinionated practice tool as frustrated dev-guitarist"
- r/programming, r/cscareerquestions: "Weekend project story"
- DevTo, Indie Hackers: "Solo dev journey"
- **Why works:** Dev-musicians are perfect ICP, high willingness to pay for quality tools
- **Expected:** 50-100 early adopters (33-66% of Phase 1 target)

**2. Content-led growth (Secondary - Time cost only)**
- Weekly YouTube shorts: "60-second practice: [Song X]"
- Show tool working, don't pitch
- 1,000 views → 10 trials → 2 paid ($25 CAC if time is free)
- **Leverage:** AI tools enable 100-1000x content velocity
- **Expected:** 25-50 users from content

**3. Reddit value-first (Foundation - Zero CAC)**
- r/guitar, r/bass, r/drums
- Strategy: "How I practice [Song X] efficiently" with screen recording
- Comments ask "what app?" → reply naturally
- No pitches, pure value
- **Expected:** 25-50 organic users

**4. Retargeting ads (Supplement - $1,000 total)**
- Google Ads: "Moises alternative", "guitar practice app"
- Retarget landing page visitors
- **Expected:** 25 users ($40 CAC, necessary evil for scale)

**Total Phase 1:** 150 users, ~$1,500 spend = $10 blended CAC (better than original plan)

---

## Phase 2: Band Features (IF Demanded)

**CRITICAL: Don't build until 30+ Phase 1 users request it.**

### Validation Gate BEFORE Phase 2

**Band coordination is RISKY. Market research shows:**
- Fragmented market ($220M-$1.37B estimates = poorly understood)
- No dominant player (BandHelper, BandMule exist but didn't win)
- 69.2% musicians collaborate remotely, but mostly via Zoom/Skype (not specialized tools)
- BandHelper/BandMule failed due to "complexity and unreliability"

**Our hypothesis:** Band features work IF they're optional, minimal, and built on validated solo tool.

**Required demand signals:**
- 30+ users email: "Can I share this with my band?"
- 20%+ Phase 1 users in active bands (post-purchase survey)
- 5+ bands volunteer for beta test

**If signals absent → stay solo-only. It's profitable and low-risk.**

### Phase 2 Features (Weeks 17-24, IF validated)

**Add ONLY if demand proven:**

1. **Optional band invite** (2-5 members max)
   - Email magic links (zero friction)
   - Share song → all get same stems/loops
   - Each member customizes own practice view

2. **Simple readiness toggle**
   - Per-song: "Learning" / "Ready" / "Performance-ready"
   - Visible to band, no forced tracking

3. **Setlist view**
   - Ordered song sequences for rehearsals/gigs
   - "3 of 8 songs ready" band-level status

4. **Role-specific presets**
   - Drummer: drums solo by default
   - Saves 3-4 clicks per song

**Critical:** Band features 100% optional. Solo users never see them.

### Phase 2 Metrics

**Target:** 700 new users (1,000 total), $49K revenue

**Validation metrics:**
- 40%+ solo users invite band members
- 60%+ invited members activate
- 30%+ bands mark readiness weekly
- Qualitative: "helps us prepare for rehearsal"

**Abort if <25% band adoption:** Drop band features, stay solo-only.

---

## Phase 3: Retention Moat (NOT AI Insights)

**Original plan focused on AI insights ($99 premium). Wrong priority.**

**Retention is more valuable than premium revenue in Year 1.**

### Phase 3 Focus: Build Habit Loop (Weeks 25-32)

**Goal:** Turn users from "I use this when I remember" to "I open this daily."

**New features (based on Phase 1 retention data):**

1. **Daily practice goals** (opinionated guidance)
   - App suggests: "Master verse 1 of [Song X] today (15 min)"
   - Detects completion via loop patterns
   - End session: "Verse 1 mastered! Next: chorus."

2. **Weekly progress email**
   - "You practiced 3 songs for 2.5 hours this week"
   - "Most-looped section: [Song X] bridge (you'll get it!)"
   - Re-engagement trigger when users lapse

3. **Mastery milestones**
   - "You've mastered 5 songs" badge
   - Unlock after consistent practice (not gamification, recognition)

4. **Social proof (optional sharing)**
   - "Share your 30-day streak" → Twitter/Reddit-friendly image
   - Viral loop without compromising privacy

**Defer AI insights to Phase 4+:** Requires data, complex ML, questionable value in Year 1. Focus on retention first.

### Phase 3 Metrics

**Target:** 40%+ users open 3+ times/week after 90 days (up from 30 days)

**Success:** Retention curve flattens (users stay active long-term)

---

## Pricing Evolution

**Phase 1:** $49 one-time = solo app forever, all core updates

**Phase 2:** Band sync included for existing users, $49 for new users (no price change)

**Phase 3:** Optional $29/year "Pro":
- Advanced practice analytics
- Cloud backup (optional)
- Priority support
- **NOT paywalling existing features—genuine expansion**

**Year 1 revenue (conservative):**
- Phase 1: 150 users × $49 = $7,350
- Phase 2: 700 new × $49 = $34,300
- Phase 3: 50 Pro upgrades × $29 = $1,450
- **Total:** ~$43K revenue, $5K costs (ads, hosting) = $38K profit

**Not $50K+ from original plan, but MORE realistic.**

---

## What We DON'T Build

**Scope creep traps:**
- ❌ 6+ stems (4 is enough)
- ❌ Metronome/tuner (musicians have these)
- ❌ Mandatory accounts (solo app needs zero accounts)
- ❌ Social/public sharing (privacy-first, not social network)
- ❌ Real-time jamming (latency hell)
- ❌ Recording/mixing/effects (not a DAW)
- ❌ Mobile app Phase 1 (desktop keyboard shortcuts are advantage)
- ❌ AI chord detection (Moises does this poorly, not our wedge)
- ❌ Visual faders (keyboard-only is faster)
- ❌ Analytics dashboards (simple insights, not data viz)
- ❌ Practice gamification (mastery, not badges)

---

## Differentiation: Speed Moat

**Why indie beats $50M-funded Moises:**

### 1. Economic Moat
- Moises: Cloud processing = subscription required to cover costs
- RiffRoom: Local processing = $49 one-time, zero ongoing costs
- They can't match our model without destroying their business

### 2. Speed Moat (NEW—replaces "data moat")
- **User request → shipped in 48 hours**
- Moises: 3 months (PM approval, design, dev, QA, A/B test, rollout)
- RiffRoom: Solo dev, direct user feedback, instant iteration
- **Brand becomes:** "The practice tool that actually listens"

### 3. Power User Lock-In
- Keyboard shortcuts Moises can't match (mobile-first constraints)
- Custom presets, macros, scripting API (Phase 2+)
- Different market: power users vs casual consumers

### 4. Friction Obsession
- Target: 3x faster than Moises, not just 20% faster
- Pre-cache common songs → <5s repeat access
- One-click workflows vs multi-tap mobile UI
- **Positioning:** "Sublime Text for musicians" (power tool, not consumer app)

### 5. Decision Speed
- No meetings, no committees, no analytics approval
- Ship daily while competitors ship quarterly

---

## Moises Response Plan

**Reality check:** Moises can launch offline mode in 6 months if threatened.

### Defense Strategy

**1. Speed obsession (unbeatable UX)**
- Make 30s→practice unbeatable, not just "fast"
- Keyboard shortcuts Moises can't match (mobile-first constraints)
- Target: 3x faster, not 20% faster

**2. Content moat (AI-assisted velocity)**
- Weekly shorts, blogs, AMAs at 100-1000x speed
- Build in public, share learnings, attract dev-musicians
- Moises can't compete on content velocity (corporate constraints)

**3. Power user positioning**
- "Sublime Text for musicians" category, not "Moises alternative"
- Different ICP: serious practicers vs casual users
- Less direct competition

**4. Community-driven roadmap**
- Users request → shipped in 48 hours
- Moises: 3 months for feature requests
- Lock-in via responsiveness, not features

**Abort trigger:** If Moises launches $39 one-time offline + keyboard shortcuts + 48hr feature shipping, reassess. Likely fallback: teacher-focused features.

---

## Band Coordination Risk (Updated)

**Market research confirms this is RISKY assumption:**

### Evidence Against Band Coordination Demand

- **Market confusion:** Estimates range $220M-$1.37B (3 research firms, 6x variance)
- **No winner:** BandHelper, BandMule exist but aren't dominant
- **Behavior:** 69.2% musicians collaborate remotely, but use general tools (Zoom, Skype)
- **Failure pattern:** Existing apps died from "complexity and unreliability"
- **Social problems > technical solutions:** Bands text, coordination software is behavior change

### Why Our Approach Mitigates Risk

1. **Solo-first = no coordination required for core value**
2. **Validation gate:** Don't build until 30+ users request it
3. **Minimal features:** Just readiness toggle + setlists (not complex dashboards)
4. **Progressive disclosure:** Band features invisible to solo users
5. **Abort criteria:** <25% adoption → stay solo-only

**If Phase 2 fails, solo tool is still profitable.**

---

## Technical Requirements

### Hardware Compatibility

**Match Moises min spec (don't invent new requirements):**

- **macOS:** M1+ chip, macOS 11.0 Big Sur or newer
- **Windows:** Windows 10 or newer
- **Stem separation:** <30s processing on min spec hardware (Demucs v4 or equivalent)

**Fallback for older hardware (defer if possible):**
- Optional cloud processing (trade speed for compatibility)
- Show warning: "Your hardware may be slow. Upgrade recommended."

### Platform Strategy

**Phase 1: Desktop only (Electron or Tauri)**
- Keyboard shortcuts are core differentiator
- Faster to build, easier to iterate
- Mobile lacks keyboard input for power users

**Phase 2+: Mobile IF users request (>30% ask)**
- Likely different use case (review on commute, not full practice)
- Consider read-only mobile before full parity

---

## Go-to-Market Timeline

### Weeks 1-2: Validation (BEFORE building)

1. **Landing page** ($200 ads)
   - Target: 50 emails
   - Abort if <20
2. **HackerNews post**
   - Target: 200+ upvotes, 20+ interest comments
3. **5 musician interviews**
   - Validate friction pain

**Gate:** All three must pass. If any fail → iterate, retest.

### Weeks 3-8: Build MVP

- Drag→stems, keyboard playback, auto-loops, streak tracker, minimal UI
- Ship weekly builds to early testers

### Weeks 9-12: First 50 Users (Proof)

- HN launch, Reddit posts, personal network
- $500 retargeting ads
- Target: 50 users, trial→paid >15%

### Weeks 13-16: Scale to 150 Users

- Weekly content (shorts, blogs, AMAs)
- $1,000 ads
- Target: 150 users, LTV:CAC >3x

**Gate:** If <75 users → market too small, pivot or stop.

### Weeks 17-24: Phase 2 (IF Demand)

- Build band features ONLY if 30+ users request
- Measure adoption, abort if <25%

### Weeks 25-32: Phase 3 (Retention)

- Daily goals, weekly emails, mastery milestones
- Target: 40%+ open 3+ times/week after 90 days

---

## Success Criteria

### Phase 1 (Weeks 1-16)
- ✅ 150 paying users
- ✅ Trial→paid >15%
- ✅ <60s drag→practice
- ✅ 40%+ open 3+ times/week after 30 days
- ✅ LTV:CAC >3x

### Phase 2 (Weeks 17-24, IF validated)
- ✅ 30+ users request band features BEFORE building
- ✅ 40%+ solo users invite band members
- ✅ 60%+ invited activate
- ✅ 30%+ bands mark readiness weekly

### Phase 3 (Weeks 25-32)
- ✅ 40%+ open 3+ times/week after 90 days
- ✅ Retention curve flattens (users stay active)

### Abort Criteria
- ❌ <20 landing page signups in 2 weeks (demand unclear)
- ❌ <75 paying users in 16 weeks (market too small)
- ❌ Trial→paid <10% (price/value mismatch)
- ❌ 7-day retention <30% (no habit forming)
- ❌ <25% band adoption (coordination assumption false)
- ❌ LTV:CAC <3x (unsustainable economics)

---

## Why This Plan Wins

### Validates Before Building
- 2-week validation (landing page, HN post, interviews) de-risks core hypothesis
- No code until demand proven

### Focuses on Real Pain
- "Stop fucking with software when practicing" is emotional, specific, visceral
- Not "better practice" or "band coordination"—pure friction removal

### Leverages Unfair Advantage
- 15-year dev + AI tools = 100-1000x velocity
- Dev-musician credibility unlocks HN/Reddit organic growth
- Speed moat: ship requests in 48 hours vs Moises 3 months

### Realistic Targets
- 150 users (not 300) in Phase 1
- $15 CAC (not $10)
- $38K profit (not $50K)
- Conservative math = achievable execution

### Clear Abort Gates
- Every phase has abort criteria
- Band features are optional, not core
- Solo tool is profitable standalone

### No Sunk Cost Fallacy
- If validation fails → stop or pivot in 2 weeks (not 16)
- If Phase 1 fails → $1,500 spent (not $10K+)
- If band features fail → stay solo-only (still profitable)

---

## Resolved Decisions

### 1. Primary JTBD
**Friction removal.** Not "better practice" or "band coordination"—just remove obstacles between intent and action.

### 2. Unfair Advantage
**Speed + dev credibility.** Ship in 48 hours, build in public, attract dev-musicians.

### 3. Band Features
**Optional, demand-driven.** Don't build until 30+ users request. Market research shows coordination is risky.

### 4. Distribution
**Dev communities (HN, r/programming) + content-led growth.** Not YouTube sponsorships (untested, likely doesn't work).

### 5. Hardware
**Match Moises min spec.** macOS M1+, Windows 10+. Don't invent new requirements.

### 6. Retention Loop
**Streak tracker + daily goals + weekly emails.** Defer AI insights to Phase 4+.

### 7. Revenue Targets
**Conservative: $38K profit Year 1.** Not $50K. Realistic math.

### 8. Validation First
**2 weeks validation BEFORE building.** Landing page + HN post + interviews. Abort if demand unclear.

---

## Unresolved Questions

1. **Retention loop effectiveness:** Does streak tracker drive 40%+ 3x/week usage? Test after 50 users.
2. **Dev-musician ICP size:** How many devs play instruments? HN post will reveal.
3. **Content velocity reality:** Can founder ship weekly YouTube shorts? Try 1, measure time.
4. **Moises offline timeline:** Can they ship in 6 months? Monitor their roadmap.

---

**Status: Ready to validate (NOT build yet).**

**Next 48 hours:**
1. Launch landing page ($200 ads)
2. Write HN "Show HN" post (demo video)
3. Interview 3 musician friends

**Decision gate (Week 2):** All three pass → build MVP. Any fail → iterate hypothesis.

---

**The vision:** "Stop fucking with software when you're trying to practice."

Opinionated tool that removes every obstacle. Instrument in hand → practicing in 30 seconds. Nothing else matters.

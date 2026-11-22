# AHub (Agriculture Hub) — Master Build Prompt

> Paste this whole document into your AI coding assistant (Claude Code, Cursor, etc.) at the root of the project. Work **phase by phase** (Section 14). Do not skip ahead, and do not leave mock data or stubs in finished phases.
>
> **v1.1 update:** added the hierarchical account approval and access-code activation flow (Section 2.1), sector-bound farmer registration, and customer requests that pick an item (crop, animal or product) plus a region.

---

## 0. Your role and mission

You are a senior full-stack engineer and product-minded architect. Build **AHub**, a production-grade agriculture platform for Rwanda that connects farmers, customers/buyers, veterinary and agronomy officers, and government bodies (RAB, Province, District, Sector).

The goal is **not a pretty dashboard**. The goal is a system that **solves real problems for real users** and can be piloted in one sector with 50–200 farmers, then scaled nationally.

### Real problems the system must solve

| Problem | Who | Outcome to measure |
|---|---|---|
| Farmers don't know *when* to plant, irrigate, fertilize or vaccinate | Farmer | % of generated tasks completed on time |
| Farmers can't find buyers or sell below the official price | Farmer, Customer | Matches made, confirmed sales |
| Diseases and pests are detected late and spread | Farmer, Vet/Agronomist | Time from report to first response; outbreak clusters detected |
| Announcements don't reach farmers or arrive late | RAB, District, Sector | % of target farmers who saw and acknowledged an announcement |
| Government has no live view of ground conditions | RAB, Province, District | Reports aggregated per region per week |
| Farmers lack trusted, localized guidance | Farmer | Guidance articles viewed, AI answers rated helpful |

### Design principles (non-negotiable)

1. **Intermediary-first.** Sector agronomists/vets and farmer promoters are primary users. They can register farmers on their behalf, publish announcements and triage reports. If their tools are clunky, the system fails.
2. **Reach farmers where they are.** Many farmers have feature phones. Notifications go out by in-app, **SMS**, **WhatsApp** and **USSD** (via provider adapters). The web app is mobile-first, low-bandwidth, offline-tolerant.
3. **Kinyarwanda first**, then English and French. Every user-facing string is translatable. Never hardcode text in components.
4. **Content and rules are data, not code.** Crop stages, task templates, vaccination schedules, alert thresholds, announcements and prices are stored in MongoDB and editable by authorized RAB staff through the admin portal, with versioning and approval.
5. **Expert-validated advice only.** All agronomic and veterinary content has a status (`draft` → `in_review` → `approved` → `retired`). **Only `approved` content is ever shown to farmers or used by the AI/alert engine.** Seed content must be marked `draft`; never present invented medical or agronomic facts as approved.
6. **Official prices are read-only** and set by government (RAB). No in-app negotiation or bidding.
7. **Deny-by-default security.** Authorization is enforced in the service layer by role + region scope. UI visibility is never an authorization control.
8. **Everything privileged is audited**, in the same operation as the change.
9. **Actionable notifications only.** Never notify "weather updated". Notify when a decision-relevant threshold is crossed.
10. **Measure impact.** Capture usage and outcome metrics from day one.

---

## 1. Tech stack

### Backend
- **Node.js 20+ with TypeScript**, **Express** (or Fastify) with a modular structure
- **MongoDB** with **Mongoose** (schemas, indexes, validation, transactions where needed — requires replica set; provide a docker-compose replica-set setup)
- **Zod** for request validation and shared types; generate **OpenAPI** docs
- **JWT** access tokens (short-lived) + **rotating refresh tokens** (stored hashed, revocable, device/session tracked)
- **argon2id** for password hashing; **phone OTP** for farmers; **TOTP MFA** required for privileged roles
- **BullMQ + Redis** for jobs (scheduled reminders, weather sync, notification dispatch, escalation timers, RSS ingestion)
- **S3-compatible object storage** (MinIO locally) with signed upload URLs; MIME/size validation
- **pino** structured logging with PII redaction; **helmet**, **cors** (strict), **express-rate-limit**
- **Vitest or Jest + supertest + mongodb-memory-server** for tests
- ESLint + Prettier; Husky pre-commit

### Frontend
- **React 19 + Vite + TypeScript + Tailwind CSS v4** (keep the visual language of the existing prototype: green agricultural palette, sidebar workspace layout, metric cards, data panels)
- **React Router** (role-based route guards), **TanStack Query** (server state), **react-hook-form + Zod** (forms)
- **react-i18next** (rw / en / fr), locale files per module
- **PWA**: service worker, cached last weather/tasks/announcements, **IndexedDB offline queue** for task completions and problem reports with idempotency keys and background sync
- Accessible (WCAG AA), large touch targets, icon-supported navigation for low-literacy users, optional text-to-speech on guidance articles
- Charts: Recharts. Maps: Leaflet (optional for outbreak maps)

### Repository layout (monorepo, pnpm workspaces)

```
ahub/
  apps/
    api/            # Node.js + Express + MongoDB
      src/
        config/ core/ (auth, rbac, audit, errors, pagination, idempotency)
        modules/    # one folder per domain (routes, controller, service, model, schema, tests)
        integrations/ (weather, sms, whatsapp, ussd, storage, ai, rab-rss)
        jobs/ seeds/ i18n/
    web/            # React + Vite
      src/
        app/ (router, providers, guards)
        features/   # per domain (api hooks, components, pages)
        portals/    # farmer, agronomist, district, province, rab, customer, nsg
        components/ (design system) lib/ locales/ offline/
  packages/
    shared/         # shared Zod schemas, enums, types, i18n keys
  docker-compose.yml  # mongo (replica set), redis, minio, mailhog
  README.md  .env.example
```

---

## 2. Users, roles and scope

| Role | Scope | Notes |
|---|---|---|
| `RAB_ADMIN` | National or delegated regional | Manages catalogs, templates, rules, prices, national announcements, users, analytics. . |
| `PROVINCE_VET` | Assigned province + descendants | Disease alerts, programmes, district approvals. . |
| `DISTRICT_VET` | Assigned district + descendants | Case assignment, campaigns, district announcements.  |
| `SECTOR_VET` | Assigned sector | Cases, farm visits, vaccinations, sector announcements. |
| `SECTOR_AGRONOMIST` | Assigned sector | Registers farmers, advises, publishes sector/district-delegated announcements, triages crop problems. |
| `FARMER_PROMOTER` | Assigned cells/villages | Registers farmers on behalf, posts short sector notices (title + time + place), collects feedback. |
| `FARMER` | Own records | Farms, cycles, tasks, reports, listings. |
| `CUSTOMER` | Own records + public listings | Requests, saved products, orders (Phase 4). |
| `NSG_SECURITY` | Platform-wide security view | Audit logs, sessions, security alerts, incidents. **No access to agricultural record editing.** |

### Authorization implementation
- Implement a central `can(user, action, resource)` policy layer plus a **region-scope query helper** that injects `{ regionPath: { $in: user.scopeRegionIds } }` into queries. Every list/get/update goes through it.
- A user can hold multiple `RoleAssignment`s (role + region + validFrom/validTo).
- Write **role × region authorization tests** for every module (an officer must never read or edit another region's data).
- Official accounts are never created freely. They follow the hierarchical approval flow in Section 2.1.

### 2.1 Account hierarchy, approval and activation (required flow)

Accounts are created **down the administrative hierarchy**. No official account can be activated without approval from the level directly above it and a system-generated access code.

| Account | Approved by | Activation |
|---|---|---|
| Province (`PROVINCE_VET`) | `RAB_ADMIN` | System generates access code |
| District (`DISTRICT_VET`) | The province account of the **parent province** | System generates access code |
| Sector (`SECTOR_VET`, `SECTOR_AGRONOMIST`) | The district account of the **parent district** | System generates access code |
| Farmer promoter (`FARMER_PROMOTER`) | A sector officer of the sector (assumption, confirm) | System generates access code |
| Farmer (`FARMER`) | Registered **within a sector** by a sector officer or promoter (or self-request approved by a sector officer) | Phone OTP |
| Customer (`CUSTOMER`) | Self-registration with verified phone or email | OTP / password |
| `NSG_SECURITY` | `RAB_ADMIN` (assumption, confirm) | System generates access code + MFA |

The first `RAB_ADMIN` is created only by a secure bootstrap command or seed. There is no public path to create it.

**Flow for province, district and sector accounts**
1. **Account request.** The applicant (or the approver on their behalf) submits: full name, requested role, verified phone/email, position/organization, and the **target region**. The target region must be a **direct child** of the approver's region (a province account targets a province; a district account targets a district inside the approver's province; a sector account targets a sector inside the approver's district). The service rejects anything else. Status: `pending_approval`.
2. **Approval queue.** The parent level sees only requests for its own child regions in an "Account approvals" screen and can **approve** or **reject** (a reason is required for rejection). Approvers cannot approve outside their scope or above their own level.
3. **Access code generation.** On approval the system generates a **one-time access code**: random, at least 50 bits of entropy, stored only as a hash, expires after a configurable period (default 72 hours), single-use, maximum 5 attempts, bound to that request, contact and region. It is delivered to the applicant's verified phone or email. The plaintext code is never logged or stored. Status: `approved_awaiting_activation`.
4. **Activation.** The applicant opens "Activate account", enters their contact and access code, sets a password and enrolls TOTP MFA. Status becomes `active`, and a `RoleAssignment` is created for the target region.
5. **Expiry and regeneration.** If the code expires, is used up or is lost, the approver can regenerate it. The old code is invalidated immediately and the action is audited.
6. **Rejection and re-application.** Rejected applicants are notified with the reason and may re-apply.
7. **Suspension.** A parent level can suspend or revoke the accounts of its direct child level. Suspending an account does not silently cascade to lower levels; it raises an alert to the parent level to review.
8. **Audit.** Request, approval, rejection, code generation, regeneration, activation, suspension and revocation each write an audit event in the same operation.

**Farmers are bound to a sector**
- A farmer is always registered inside a sector (and a cell/village inside it) by a sector officer or promoter of that sector. `farmerProfiles.sectorId` is required.
- Sector officers see and manage only farmers in their sector. Moving a farmer to another sector requires a transfer approved by the district account.

**Customers choose items and regions**
- Customers self-register. For each request they choose **what they want** (a crop, an animal/livestock type, or a product) and **select the region** (province, district or sector) they want it from. See 5.9.

---

## 3. Region hierarchy

Rwanda hierarchy: **Province → District → Sector → Cell → Village**. (Kigali City is handled as a province-level region.)

`Region`: `{ _id, type, name:{rw,en,fr}, code, parentId, path:[ancestorIds], centroid:{lat,lng}, agroEcologicalZone?, active }`

- Index `path` and `type`. Every domain document stores `regionId` and denormalized `regionPath` for fast scope queries.
- Seed the full hierarchy from a CSV (provide a seed script and a small sample; document where to obtain official codes).
- Weather "grid cell" is derived by rounding lat/lng (e.g., 0.1°) so users in the same cell share one forecast.

---

## 4. MongoDB collections

All mutable documents include `createdAt, updatedAt, createdBy, updatedBy, version` (optimistic locking via `__v` or explicit). Use soft-delete (`status: archived`) for critical records.

### Identity & access
- **users**: `phone, email?, passwordHash?, locale, status, fullName, nationalIdHash? (never store raw), mfa:{enabled,secretEnc}, lastLoginAt`
- **roleAssignments**: `userId, role, regionId, validFrom, validTo, assignedBy`
- **sessions**: `userId, refreshTokenHash, device, ip, createdAt, revokedAt, lastUsedAt`
- **otpCodes**: `phone, codeHash, purpose, expiresAt, attempts` (TTL index)
- **consents**: `userId, type (data_processing, location, sms_contact), version, grantedAt, revokedAt, grantedBy (self | proxy officer id)`
- **accountRequests**: `applicant {fullName, phone, email, position, organization}, requestedRole, targetRegionId, approverRegionId, requestedBy (self|approver id), status (pending_approval|approved_awaiting_activation|active|rejected|expired|revoked), decision {by, at, reason}`
- **activationCodes**: `accountRequestId, codeHash, expiresAt, attemptsLeft, usedAt, deliveredVia, supersededBy?` (TTL on expiry; single-use; plaintext never stored or logged)

### Farmers and assets
- **farmerProfiles**: `userId, sectorId (required), regionId (village/cell inside that sector), registeredBy (sector officer/promoter id, or self-request approved by a sector officer), primaryLanguage, cooperativeId?, phoneAccessType (smartphone|feature_phone|shared_phone), preferredChannel, literacyMode, status`
- **cooperatives**: `name, regionId, contact, memberIds`
- **farms**: `ownerId, name, regionId, location:{type:"Point",coordinates}(2dsphere), areaHa, production types`
- **cropPlots**: `farmId, cropId, varietyId?, areaHa, irrigationType (rainfed|drip|sprinkler|manual), soilNotes`
- **livestockGroups**: `farmId, livestockTypeId, breed, headCount, ageClass, housingType, tagIds[]`
- **animalRecords** (optional per-animal): `groupId, tag, birthDate, sex, vaccinations[], treatments[]`

### Catalogs and content (RAB-managed, versioned, approval workflow)
- **crops**: `code, name:{rw,en,fr}, category, status`
- **cropSuitability**: `cropId, regionId or agroZone, plantingWindows:[{season, startMonthDay, endMonthDay}], yieldRange, waterNeed, notes, source, status`
- **livestockTypes**: `code, name, category (cattle, goat, pig, poultry…), status`
- **livestockSuitability**: `typeId, regionId/agroZone, recommendedBreeds[], feedNotes, source, status`
- **stageTemplates**: `subjectType (crop|livestock), subjectId, regionScope?, version, status, stages:[{key, name, durationDays:{min,max}, completionCriteria, warningSigns[], tasks:[taskTemplateRef]}]`
- **taskTemplates**: `stageKey, title(i18n), instructions(i18n), triggerType (offsetDays|condition), offsetFromStage|offsetDays, conditionRuleId?, mandatory, category (planting, fertilizing, irrigation, pest_control, vaccination, deworming, feeding, harvest), mediaRefs, source`
- **rules**: `type (irrigation|heat_stress|cold_stress|disease_pressure|vaccination_timing|extreme_weather), subjectScope, conditions (JSON expression), vetoConditions, action template (message i18n, urgency), validFrom/To, version, status, approvedBy`
- **knowledgeArticles**: `topic, subject, stageKey?, locale, body, media, source, reviewedBy, reviewDate, status`
- **diseaseEntries**: `subject, symptoms[], likelyStage[], weatherAssociations, firstResponse, escalationRequired, source, status`
- **kbChunks**: chunked/approved content for AI retrieval `{sourceType, sourceId, text, locale, embedding?, regionScope, status}` (text index; vector index optional)

### Operations
- **productionCycles**: `farmId, assetType (cropPlot|livestockGroup), assetId, templateVersion, startDate (planting/birth), stageCurrent, plannedHarvest, actualHarvest, estimatedOutput, actualOutput, status`
- **productionTasks**: `cycleId, farmerId, regionPath, templateId, title, dueDate, status (pending|done|skipped|overdue|cancelled), completedAt, completionEvidence?, shiftedFrom?, source (template|rule|officer)`
- **weatherSnapshots**: `gridKey, fetchedAt, provider, providerRef, hourly[], daily[], derived:{effectiveRainfall, et0, waterDeficit, heatWave, coldWave, heavyRain, frostRisk, highWind, diseasePressure}`
- **alerts**: `farmerId, farmId?, cycleId?, ruleId, type, urgency, messageKey+params, status, triggeredAt, resolvedAt, dedupeKey`
- **problemReports**: `reporterId, farmId, assetRef, category (crop_pest_disease|livestock_illness|weather_damage|input_quality|market_dispute), description, evidence[], context snapshot {crop, stage, recentWeather, region}, severity, status, suggestedCauses[], autoResponseId?`
- **vetCases**: `referenceNo (unique, non-reusable), reportId, assignedTo, priority, findings, intervention, escalatedTo?, escalationDueAt, resolution:{summary,by,at}, status`
- **outbreakClusters**: `subject, suspectedDisease, regionId, reportIds[], windowStart/End, status`
- **campaigns** (vaccination/training): `type, regionId, targetSpecies, schedule, resources, coverageTarget, coverageActual, status`
- **visits**: `officerId, farmId, purpose, notes, evidence, outcome`
- **announcements**: `publisherId, level (national|province|district|sector), audienceScope {regionIds, crops[], livestock[]}, title, body (i18n), eventDate?, publishAt, expiresAt, source label, status (draft|pending_approval|published|expired), ackCount`
- **announcementAcks**: `announcementId, userId, seenAt, acknowledgedAt`

### Market
- **products**: `code, name, category, units[], grades[]`
- **officialPrices**: `productId, grade, unit, regionScope, amount, currency, effectiveFrom, effectiveTo, approvedBy, status` (immutable once approved; new row for changes)
- **listings**: `farmerId, productId, grade, quantity, unit, availableFrom, regionId, status (open|matched|closed|expired), cycleId? (verified source)`
- **customerRequests**: `customerId, itemType (crop|livestock|livestock_product|other_product), itemRefId (cropId|livestockTypeId|productId), grade?, quantity, unit, targetRegionId (the province, district or sector the customer selects), requiredBy, notes, status (open|matched|fulfilled|cancelled|expired)`
- **matches**: `listingId, requestId, score, status (suggested|contacted|accepted|declined|expired), contactExchangeAt`
- **orders** / **deliveries** (Phase 4, feature-flagged): `listingId, requestId, quantity, priceSnapshot (immutable official price at confirmation), status transitions, confirmations by both parties`

### Platform
- **notifications**: `recipientId, event, channel (inapp|sms|whatsapp|ussd), payload, status (queued|sent|delivered|failed|read), provider, providerRef, dedupeKey, scheduledFor`
- **notificationPreferences**: `userId, channels, quietHours, topics`
- **messageLogs**: inbound/outbound SMS/WhatsApp/USSD sessions
- **feedback**: `userId, targetType (alert|article|aiAnswer|announcement), targetId, rating, comment`
- **aiConversations**: `userId, channel, locale, messages[{role,text,citations[],guardrailFlags,rating}], escalatedToOfficerId?`
- **auditEvents**: `actorId, role, action, entityType, entityId, beforeHash, afterHash, ip, userAgent, result, at` (append-only; no update/delete route exists)
- **securityEvents/incidents**: failed logins, suspicious logins, privilege changes, incident records
- **metricsDaily**: pre-aggregated per region/day for dashboards

### Index checklist
Region `path`, `regionPath` on all scoped docs, 2dsphere on farm location, unique `vetCases.referenceNo`, TTL on `otpCodes` and expired sessions, compound indexes for `productionTasks(farmerId,status,dueDate)`, `alerts(dedupeKey)`, `announcements(level,publishAt,expiresAt)`, text indexes for knowledge search.

---

## 5. Feature specifications

For each feature: implement **backend + frontend + tests**.

### 5.1 Authentication, onboarding and proxy registration
- **Farmers:** phone number + OTP (SMS adapter; console/mailhog in dev). Optional PIN for quick re-login.
- **Officials:** created only through the hierarchical approval flow in Section 2.1 (request, parent-level approval, system-generated access code, activation with password + MFA). **Customers:** self-register with verified phone/email and password.
- **Proxy registration:** agronomist/vet/promoter registers a farmer **in their own sector only** (name, phone, cell/village, farm, crops/livestock) in under 2 minutes, with consent recorded as `grantedBy: officer`. The farmer receives an SMS to confirm and can claim the account via OTP.
- Rate limits and lockout on login/OTP, session list and revoke, refresh token rotation with reuse detection.
- **Frontend:** language selector first, simple farmer onboarding wizard, officer "register farmer" flow with offline queue, public "Request an official account" form, "Activate account" page (contact + access code + password + MFA), and an "Account approvals" queue in each parent portal (approve, reject with reason, regenerate code, suspend).

### 5.2 Feature 7 — Crops/animals suited to a region (entry point)
- `GET /catalog/crops?regionId=` returns approved suitability entries ranked by region fit with planting window, yield range, water need, one-line reason.
- Same for livestock (breeds, feed needs, vaccination schedule preview).
- Farmers may register something not on the list, with a gentle non-blocking note.
- Selecting an item starts **Feature 1** (creates the production cycle).
- **Frontend:** catalog cards, "Start growing this" button, region auto-filled from profile.

### 5.3 Feature 1 — Track farmer progress (backbone)
- `POST /production-cycles` with asset, start date → system picks the approved stage template (region-specific if available) and **generates all tasks** from the start date. Only tasks for the current week + a "coming next" preview are returned by default (progressive disclosure).
- `PATCH /production-tasks/:id/complete|skip` with optional evidence photo. Completion triggers **downstream date shifting** (e.g., transplant delayed 5 days shifts dependent tasks), recorded in `shiftedFrom`.
- Cycle stage advances when completion criteria are met or the farmer/officer confirms.
- Harvest/production records: `actualOutput` is never inferred from `estimatedOutput`.
- Daily job: mark overdue tasks, evaluate condition-triggered tasks, send due reminders (3–7 days ahead for vaccinations; day-before and day-of for field tasks).
- **Frontend (farmer):** "Today / This week / Coming next" task list with big done/skip buttons, cycle timeline with current stage, progress ring, offline completion.
- **Frontend (officer):** view a farmer's cycle on their behalf and complete tasks during a visit.

### 5.4 Feature 4 — Teaching from day one to harvest/production
- Learning content is tied to `stageKey` so the farmer sees the guidance relevant to *now*: required actions, warning signs, completion criteria, localized per region.
- Formats: short text, images, audio (TTS or recorded), step lists. Searchable by keyword.
- **Frontend:** "What to do now" card on the cycle page, stage guide pages, saved articles, audio playback.
- **RAB admin:** content editor with draft → review → approved workflow, reviewer, review date, and source required.

### 5.5 Feature 5 — Weather
- **Weather adapter** (`integrations/weather`) with **Open-Meteo** as the default provider (no key required) and an interface to add OpenWeatherMap/Tomorrow.io. Store provider timestamps/refs.
- **Cache and batch:** fetch once per grid cell, 4× daily, store in `weatherSnapshots`. Users in the same cell share it.
- **Derived indicators** computed once: effective rainfall, ET0 and water deficit, heat wave, cold wave (drop > 8 °C), heavy rain (> 50 mm/day), frost risk, high wind, disease pressure (humidity + temperature rules from approved `rules`).
- **Layered UI:**
  1. Today + 3 days (icon, high/low, rain probability, mm) with **one action hint** tied to the farmer's crop stage.
  2. 7-day outlook and 24–48 h hourly, "this month vs normal" when data is available.
  3. Derived indicators and extreme flags.
  4. Location transparency: which farm/region, data source, last updated; manual farm selection for multi-farm users.
- Offline: show the last cached forecast with a clear "last updated" label.

### 5.6 Smart advice engine (irrigation, vaccination, stress, disease pressure)
Implement a **configuration-driven rule engine** reading from `rules` (no hardcoded thresholds).

- **Irrigation:** inputs = crop stage, last irrigation, water deficit/ET0, forecast rain next 24–48 h, irrigation type. Output = **action + amount + time window**. **Veto:** suppress irrigation advice if significant rain is forecast in the veto window defined by the rule.
- **Livestock vaccination:** age/last-vaccination calendar from templates; reminders 3–7 days ahead. Weather never replaces the schedule; extreme heat/cold/heavy rain generates a **health-protection alert** (ventilation, bedding, water/electrolytes) and **defers vaccination to a stable weather window**.
- **Regional disease risk seasons:** rules can advance reminder timing/frequency for a region/species.
- **Dedupe + throttling:** one alert per `dedupeKey` per window; notify only when a threshold flips the advice.
- Every alert stores which rule version and which inputs produced it (explainability), and farmers can rate it (👍/👎) → `feedback`.
- Provide a **rule simulator** in the RAB admin UI: pick a farm + date and see what each rule would output.

### 5.7 Feature 3 — Problem reporting and veterinary/agronomy cases
- Report types: crop pest/disease, livestock illness, weather damage, input quality, market/payment dispute.
- Input: photo(s) + short text or **menu-based symptom picker** (for low literacy) + auto-attached context (crop, stage, region, last 3 days weather).
- **Stage-aware triage:** match against approved `diseaseEntries` → show likely causes and first-response guidance when confidence is adequate; otherwise create a `vetCase`.
- **Workflow:** `referenceNo` unique and non-reusable → assign to sector officer → in progress → resolved (requires findings + resolution) → closed. **Timed escalation:** serious unresolved cases auto-escalate sector → district → province after configurable deadlines (BullMQ delayed jobs).
- **Outbreak detection:** if ≥ N similar reports in a sector within X days, create/update an `outbreakCluster` and alert district/province officers.
- **Feedback loop:** resolved cases can be proposed as knowledge-base entries (officer clicks "suggest for KB" → review queue).
- **Frontend:** farmer "Report a problem" (camera first, offline queue), case status tracker; officer case inbox with filters (priority, status, SLA timer), visit logging, escalation button; district/province outbreak map and list.

### 5.8 Feature 6 — Government announcements (national + local)
- Levels: **national (RAB/MINAGRI)**, **province**, **district**, **sector**.
- **Authoring:** RAB admin (national), district vets/agronomists (district), sector officers and farmer promoters (sector, short form: title + date/time + place).
- **Approval:** sector items auto-publish for trusted promoters or require sector officer approval (configurable); national items require RAB approval.
- **RSS/scrape ingestion** for RAB/MINAGRI news into `draft` announcements that require approval; log the source URL. Do not build scrapers for province/sector levels.
- **Targeting:** filter by region, crop and livestock. Farmers see "Relevant to me" by default (sector first, then district, then national) with toggles My Sector / My District / National.
- Validity: `publishAt`, `expiresAt`, optional `eventDate`; expired items are hidden or greyed. Source labels ("Source: RAB", "Source: Kacyiru Sector Agronomist").
- Delivery by in-app + SMS/WhatsApp for urgent or event announcements; track `seen` and `acknowledged`.

### 5.9 Features 2 and 8 — Market matching and demand board (one engine)
- **Supply:** farmer creates a listing (product, grade, quantity, available date, region); optionally linked to a production cycle as "verified source".
- **Demand:** the customer posts a request by choosing **what they want** (a crop, an animal/livestock type, or a product), the quantity and unit, the required-by date, and **selecting the region** (province, district or sector). The request is matched against open listings and farmers producing that item in the selected region and its descendants. Farmers only see requests relevant to their region.
- **Official prices** displayed read-only per product/grade/region/effective date. No price field on listings/requests.
- **Matching engine:** score by product + grade + quantity overlap + geography (hierarchy distance/geo) + timing; produce `matches`. Farmer sees "3 buyers looking for tomatoes in your district this month"; the demand board (Feature 8) shows active requests filtered by crop, quantity, delivery window, sorted nearest region then soonest date.
- **Contact exchange:** after both sides accept, reveal contacts. Transactions happen offline at the official price in v1.
- **Phase 4 (feature-flagged):** orders and deliveries with an immutable price snapshot, state machine, dual confirmation, ratings.
- **Anti-abuse:** verified accounts, rate limits, report-listing button.

### 5.10 Feature 9 — Agriculture AI assistant (Phase 5, after knowledge base is validated)
- **Architecture:** retrieval-augmented generation over **approved** `kbChunks` + the user's own context (farm, crop, stage, region, recent weather) + structured tools.
- **Scope guard:** classify the query; non-agriculture requests get a polite redirect ("I can help with crops, livestock, weather, markets and farming practices").
- **Hard rules:** prices only from `officialPrices` via a tool (never generated); policy answers must cite an `announcement`/source; no medication dosing beyond approved content; serious symptoms → recommend contacting the sector vet and offer to create a problem report.
- **Tools the AI can call:** `getNextTasks`, `getWeatherAdvice`, `getOfficialPrice`, `searchKnowledge`, `findBuyers`, `createProblemReport` (with user confirmation).
- **Languages:** Kinyarwanda, English, French; voice input on the web app (Web Speech API where available).
- **Channels:** in-app chat, WhatsApp/SMS bot via the same service.
- **Provider adapter** (`integrations/ai`) so the LLM provider can be swapped; redact PII from context; log prompts/answers; thumbs up/down; human escalation to an officer.
- **Start simple:** keyword/Mongo text search over the knowledge base first; add LLM generation behind a feature flag.

### 5.11 Notifications and channels
- One `NotificationService` with channel adapters: **in-app, SMS, WhatsApp, USSD**.
- **USSD menu** (adapter + stub provider): 1) My tasks today 2) Weather 3) Report a problem 4) Prices 5) Announcements — all in Kinyarwanda first.
- Channel fallback (app → SMS), quiet hours, per-topic opt-out, dedupe, retry with backoff, delivery status webhooks.
- Message templates are i18n keys with parameters; keep SMS ≤ 160 chars where possible.

### 5.12 RAB admin content and configuration
- Manage regions (read-mostly), users and officers (account approval queue: RAB approves provinces, provinces approve districts, districts approve sectors), crops, suitability, livestock types, stage and task templates, rules, knowledge articles, diseases, products, **official prices (approval + effective dates + unit validation)**, national announcements.
- **Versioning:** new version on edit, status flow draft → in_review → approved → retired, reviewer and date recorded, ability to roll back.
- Import/export CSV/JSON for catalogs.

### 5.13 Dashboards and analytics per role
- **Farmer:** tasks %, active cycles, expected harvest, open reports, alerts, matches.
- **Sector officer:** open cases, SLA, visits, vaccinations, farmers registered, announcements reach.
- **District/Province:** cases by sector/disease, outbreak clusters, campaign coverage vs target, response time, reports submitted.
- **RAB:** registered/active farmers, active cycles, task completion rate, regional coverage, report resolution time, price updates, market matches, content approval queue.
- **Customer:** requests, matches, saved products.
- Build with MongoDB aggregation pipelines + nightly `metricsDaily`; CSV export.
- **Impact/KPI page** for pilots: weekly active farmers, % tasks on time, time-to-first-response, announcement reach, match rate, advice helpfulness rating.

### 5.14 NSG security portal
- Audit log explorer (filter by actor, entity, action, date, result), session/user monitoring and forced revoke, failed-login and suspicious-login alerts, privileged access review, incident records (create, assign, close), system health (API uptime, queue depth, storage usage).
- Read-only on agricultural data. All NSG actions audited.

---

## 6. API conventions

- Prefix `/api/v1`; JSON; **consistent error envelope** `{ error: { code, message, details, requestId } }`.
- **Cursor pagination**, explicit sort fields, filter whitelists.
- **Idempotency keys** (`Idempotency-Key` header) for create/complete/report endpoints, required for offline sync.
- Zod validation on every input; reject unknown fields.
- Rate limiting per IP and per user; stricter on auth/OTP/AI.
- OpenAPI served at `/api/docs`; contract tests for every endpoint.
- Endpoint groups: `/auth`, `/account-requests` (create, approve, reject, regenerate-code, suspend), `/activation`, `/me`, `/users`, `/regions`, `/farmers`, `/farms`, `/catalog`, `/production-cycles`, `/production-tasks`, `/weather`, `/alerts`, `/problem-reports`, `/veterinary-cases`, `/outbreaks`, `/campaigns`, `/visits`, `/announcements`, `/learning`, `/products`, `/official-prices`, `/listings`, `/customer-requests`, `/matches`, `/orders` (flagged), `/notifications`, `/ai`, `/feedback`, `/admin/*` (content, rules, prices, users), `/analytics`, `/security/*`, `/ussd`, `/webhooks/*`.

---

## 7. Security and privacy baseline

- Deny-by-default RBAC + region scope in the service layer; tested for every module.
- argon2id, MFA for privileged roles, refresh rotation with reuse detection, session revocation, suspicious-login alerts.
- Validate/sanitize all input; protect against NoSQL injection (no raw operators from clients, `express-mongo-sanitize`), XSS, CSRF (if cookies), strict CORS, security headers.
- Signed upload URLs, MIME/size limits, malware scan hook; private bucket; signed read URLs.
- Encrypt in transit and at rest; secrets only via environment; separate dev/staging/prod configs.
- **Personal data:** collect minimum, record consent, redact PII from logs and AI context, provide export/delete-request workflow, define retention periods. Comply with Rwanda's data protection law (flag items for legal review). Never store raw national ID numbers or payment card data.
- Backups with tested restore and point-in-time recovery documented.
- Audit events for every privileged transition, written with the change.

---

## 8. Frontend specification

### Shell and routing
- Public: landing, language switch, sign in, farmer OTP onboarding, request an official account, activate account with access code, public announcements.
- Authenticated routes under `/app/:portal/*` with **role guards** driven by `/me` permissions from the server (never by a dropdown).
- Replace the prototype's hardcoded `portalData` and generic dialogs with real feature modules and real forms.

### Portals and screens

| Portal | Screens |
|---|---|
| **Farmer** | Home (today's tasks, weather hint, alerts), My farms, Add crop/livestock (catalog), Cycle detail (timeline, stage guide), Tasks, Weather, Report a problem, My reports, Announcements, Market (my listings, buyer demand, official prices), Learning library, AI assistant, Profile/consent/language |
| **Sector agronomist / vet / promoter** | Dashboard, Register farmer (proxy, offline), Farmers list, Case inbox + case detail, Farm visits, Vaccination records, Announcements (create/approve), Crop advice requests, Reports/exports |
| **District vet** | Dashboard, **Sector account approvals**, Sector teams, Cases + assignment, Escalations, Outbreak clusters, Campaigns, Announcements, Reports |
| **Province vet** | Dashboard, **District account approvals**, Districts comparison, Disease alerts/map, Programmes, Approvals, Reports |
| **RAB admin** | Dashboard/KPIs, **Province account approvals**, Regions, Officers and access codes, Catalog (crops, livestock), Stage/Task templates, Rules + simulator, Knowledge base editor, Official prices (approval), National announcements, Content approval queue, Analytics |
| **Customer** | Dashboard, **New request (choose crop/animal/product + select region)**, Discover supply, My requests, Matches, Saved products, Official prices, (Phase 4) Orders/Deliveries |
| **NSG security** | Security overview, Audit logs, Sessions/users, Alerts, Incidents, System health |

### UX requirements
- Mobile-first, one primary action per screen for farmers; large buttons; icon + label navigation; plain-language Kinyarwanda copy.
- Skeletons, empty states, error states with retry, optimistic updates for task completion, visible **offline/sync status banner**.
- Forms with inline validation (Zod), accessible labels, keyboard navigation, color-contrast AA.
- Feedback widgets (👍/👎) on alerts, articles and AI answers.
- All text via i18n; date/number formatting by locale; units shown clearly (kg, t, L, mm, °C, RWF).

### Offline / PWA
- Cache: last weather, current tasks, active announcements, learning articles viewed.
- Queue (IndexedDB): task completion, problem reports with photos (compress), listings. Replay with idempotency keys; show per-item sync status and conflict handling (server wins with user notice).

---

## 9. Seed data (for development and pilot setup)

- Regions: sample hierarchy (at least one province, two districts, three sectors, cells, villages) + CSV import script for the full set.
- Users: the first `RAB_ADMIN` is created by a secure bootstrap command (no public path). In development only, a seed script runs the full approval chain (RAB, province, district, sector, farmers) and prints demo access codes to the console. Pilot users are created through the real flow.
- Catalog: **tomatoes, maize** (crops) and **dairy cattle** (livestock) with stage templates, task templates, a sample irrigation rule, a vaccination calendar structure, disease entries — **all marked `status: draft` with a banner "Requires validation by RAB agronomists/veterinarians"**. Do not treat seed values as authoritative.
- Products and a sample official price list (draft).
- Demo announcements at national, district and sector levels.

---

## 10. Jobs and schedulers (BullMQ)

| Job | Cadence | Purpose |
|---|---|---|
| `weather.sync` | 4×/day | Fetch/refresh forecasts by grid cell, compute derived indicators |
| `advice.evaluate` | After each sync + daily | Run rules per active cycle, create deduped alerts |
| `tasks.daily` | Daily | Mark overdue, generate condition tasks, send reminders |
| `vaccination.reminders` | Daily | 3–7 day advance reminders |
| `cases.escalation` | Delayed per case | Escalate unresolved serious cases |
| `outbreaks.detect` | Hourly | Cluster detection and officer alerts |
| `announcements.expire` | Hourly | Expire items, schedule publish |
| `rab.rss.ingest` | Daily | Create draft national announcements |
| `matches.compute` | On listing/request change + hourly | Recompute suggestions |
| `notifications.dispatch` | Continuous | Send with retry/backoff |
| `metrics.daily` | Nightly | Pre-aggregate dashboards |

---

## 11. Testing and quality

- **Unit + integration tests** per module; **role × region authorization tests** for every protected endpoint.
- **Hierarchy tests:** a province cannot be activated without RAB approval; an approver cannot approve outside their direct child regions or above their level; access codes are single-use, expire, lock after 5 attempts and are invalidated on regeneration; farmers can only be registered inside the officer's sector; customers can only target valid regions.
- **Rule engine tests** with fixtures (e.g., rain forecast vetoes irrigation; heat wave defers vaccination).
- **Contract tests** against OpenAPI; **migration/seed idempotency tests**.
- **Frontend:** component tests (Vitest + Testing Library), Playwright e2e for the pilot loop (see Section 14, Phase 1) including an offline scenario.
- Accessibility checks (axe) in CI. Lint, typecheck, test and build must pass before merge.
- Load test the notification pipeline and weather sync with realistic volumes.

---

## 12. DevOps and configuration

- `docker-compose.yml`: MongoDB (single-node replica set), Redis, MinIO, Mailhog; one command to start everything.
- `.env.example` documenting every variable: `MONGODB_URI, REDIS_URL, JWT_*, OTP_*, SMS_PROVIDER_*, WHATSAPP_*, USSD_*, WEATHER_PROVIDER, S3_*, AI_PROVIDER_*, FEATURE_FLAGS`.
- **Feature flags:** `MARKET_ORDERS`, `AI_ASSISTANT`, `WHATSAPP`, `USSD`, `RSS_INGEST`.
- Health endpoints `/health` and `/ready`; structured logs with request IDs; error tracking hook; metrics endpoint.
- CI pipeline (lint, test, build, security audit). README with setup, architecture diagram (mermaid), data model overview, role matrix and runbooks.

---

## 13. Pilot and measurement requirements

Build the hooks so the pilot (one sector, 2 crops, 1 livestock type, 50–200 farmers) can be evaluated:
- Event tracking (server-side): registration, task shown/completed, alert sent/opened/rated, report created/first response, announcement seen/acknowledged, listing created, match made.
- Weekly KPI export for RAB: active farmers, % tasks on time, median time to first response, announcement reach, advice helpfulness, market matches.
- Officer feedback form inside the portal (what is slow or missing).

---

## 14. Delivery phases (implement in order; each phase ends with working software and tests)

### Phase 0 — Foundation
Monorepo, docker-compose, config, logging, error envelope, auth (OTP + password + MFA), **hierarchical account approval + access-code activation (Section 2.1)**, RBAC + region scope, regions seed, audit service, i18n scaffolding, design system, CI.
**Done when:** the full chain works (RAB approves a province, the province activates with its access code and approves a district, the district approves a sector, the sector registers farmers), approvers cannot act outside their direct child regions, codes are single-use and expiring, scope tests pass and audit events are written.

### Phase 1 — Pilot loop (highest priority)
Farmer proxy registration + self onboarding, farms, **crop/livestock catalog by region (5.2)**, **cycles + task generation + completion + date shifting (5.3)**, **learning content by stage (5.4)**, **weather service + layered UI (5.5)**, **rule engine for irrigation/vaccination/stress alerts (5.6)**, **problem reports + vet cases + escalation (5.7)**, **sector announcements (5.8)**, notifications (in-app + SMS), RAB content admin with approval (5.12), sector officer + district dashboards, offline queue.
**Done when** this end-to-end scenario passes in Playwright: *agronomist registers a farmer → farmer selects tomatoes → calendar generated → weather sync produces an irrigation or veto decision → SMS/in-app alert delivered → farmer reports a problem with a photo → officer triages and resolves → sector announcement reaches the farmer* — all in Kinyarwanda UI, and the farmer completes a task offline that syncs later.

### Phase 2 — Market
Products, official prices (approval workflow), listings, customer requests, matching engine, demand board, customer portal, contact exchange.

### Phase 3 — Government hierarchy
Province/District dashboards, outbreak detection and map, campaigns and coverage, national announcements with RSS drafts, RAB analytics, NSG security portal, CSV exports.

### Phase 4 — Transactions (feature-flagged)
Orders, deliveries, price snapshots, dual confirmation, ratings, payment adapter interface (no client-trusted payment confirmation).

### Phase 5 — AI assistant
Knowledge base ingestion from approved content, keyword search first, then RAG + tools, scope guard, citations, Kinyarwanda/French/English, WhatsApp/SMS channel, officer escalation, rating and review queue.

### Phase 6 — Hardening
Penetration test fixes, load tests, backup/restore drill, accessibility audit, data protection review, training materials for officers.

---

## 15. Working instructions for you (the AI engineer)

1. Start by reading this document fully, then **propose the folder structure and the Phase 0 plan** and wait for confirmation before generating large amounts of code.
2. Implement **one phase at a time**. After each phase, summarize what was built, how to run it, how to test it, and what remains.
3. No placeholder or mock data in finished features. All dashboards must query real data.
4. Never hardcode thresholds, schedules, prices or agronomic advice in code. They belong in MongoDB (rules, templates, officialPrices).
5. Every endpoint needs validation, authorization, audit (when privileged), tests and OpenAPI docs.
6. Every user-facing string goes through i18n with `rw`, `en` and `fr` keys (Kinyarwanda/French may be machine-drafted but flagged `needsReview`).
7. If a requirement is ambiguous or conflicts with security or the principles above, **stop and ask**; do not guess on authorization, pricing or medical content.
8. Keep modules decoupled: weather, notifications, AI and storage sit behind adapters.
9. Prefer simple, well-tested solutions over clever ones; document trade-offs in `docs/decisions/`.
10. Provide `docs/` with API overview, data dictionary, role matrix, rule authoring guide for RAB staff, and an officer quick-start guide.

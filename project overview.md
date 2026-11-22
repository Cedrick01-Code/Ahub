 # AHub — Agriculture Hub

## Full System Overview, User Roles, Responsibilities, and Functional Requirements

AHub (Agriculture Hub) is a centralized agricultural management and marketplace platform designed to connect Rwanda's agricultural authorities, veterinary officers, farmers, and customers through one integrated system.

The system should manage the entire agricultural information lifecycle: from planning a crop or livestock production cycle, through monitoring and reporting, to finding buyers and completing sales. It should also provide agricultural education, weather information, government announcements, official price management, and an AI-powered agricultural assistant.

The main objective is to make agricultural activities trackable, manageable, data-driven, and connected to real market demand.

## 1. Core system objectives

AHub must deliver these major functions:

### 01

Agricultural production management

Register farms, crops, livestock, production cycles, tasks, progress, and harvests.

### 02

Veterinary and agricultural problem management

Report problems, assign responsible officers, investigate incidents, and track resolution.

### 03

Agricultural marketplace

Connect available farmer products with customer requests, orders, and delivery.

### 04

Government administration

Manage administrative regions, authorized officers, announcements, official prices, and agricultural programs.

### 05

Farmer education

Provide practical, location-aware learning materials and production schedules.

### 06

Weather and notifications

Deliver weather forecasts, production reminders, alerts, and workflow notifications.

### 07

Agricultural intelligence

Provide agriculture-focused AI assistance, search, analytics, and recommendations.

### 08

Security and accountability

Enforce role permissions, regional restrictions, audit trails, and secure data handling.

## 2. System roles and access structure

AHub has seven primary portals. Each portal should have its own dashboard and navigation, but all portals operate through a shared backend and common data.

| Role                        | Main responsibility                                 | Access scope                                  |
| --------------------------- | --------------------------------------------------- | --------------------------------------------- |
| RAB Admin                   | National agricultural administration and oversight  | National                                      |
| Province Veterinary Officer | Veterinary supervision and escalation               | Assigned province                             |
| District Veterinary Officer | District veterinary operations                      | Assigned district                             |
| Sector Veterinary Officer   | Local veterinary services and farmer follow-up      | Assigned sector                               |
| Farmer                      | Manage production, report problems, and find buyers | Own farms and authorized public services      |
| Customer                    | Find products and purchase agricultural goods       | Own requests and orders, plus public listings |
| NSG Security Admin          | Technical security and platform monitoring          | Security functions across the platform        |

Access principle: A role determines what a user can do; the assigned administrative region determines which regional records the user can manage. NSG is responsible for technical security, not automatically for agricultural decisions or official pricing.

## 3. Detailed responsibilities and functionality of each role

### 3.1 RAB Admin Portal — National administration

The RAB Admin portal manages the national agricultural structure, official agricultural information, and authorized government-level operations.

## Main dashboard

Registered farmers

# National overview

Regions and coverage

# All regions

Production monitoring

# Crop and livestock

Reports and analytics

# National reports

Illustrative dashboard layout; these are not live statistics.

Functional modules and tasks

1\. Administrative region management

- Create and maintain the national administrative hierarchy: province, district, and sector.
- Link each region to its parent region.
- Activate or deactivate regional records without destroying historical data.
- Assign authorized officers to the appropriate administrative scope.

2\. Officer and role management

- Create or approve authorized government officer accounts.
- Assign roles and geographic responsibilities.
- Transfer officers when their assignments change.
- Suspend accounts when necessary and maintain a history of administrative changes.

3\. Agricultural product and production catalog

- Maintain approved crop and livestock categories.
- Manage production guidelines and official agricultural reference information.
- Publish approved varieties, farming practices, and applicable production standards.
- Organize products by category and regional suitability.

4\. Government price management

- Create and publish official prices for agricultural products.
- Define price units, effective dates, expiry dates, and applicable regions or product grades.
- Approve or reject proposed price changes where the workflow requires approval.
- Maintain historical prices and identify the authority responsible for each change.
- Ensure marketplace calculations use the applicable approved price.

5\. National announcements and programs

- Publish nationwide agricultural announcements.
- Communicate policies, approved programs, deadlines, and official guidance.
- Track publication, effective dates, and acknowledgement where required.

6\. National monitoring and reporting

- Review production reports across regions.
- Monitor aggregated farmer registrations, crop cycles, livestock activities, reported problems, and market activity.
- Compare production trends across districts and provinces.
- Export authorized reports to PDF or Excel.

Restrictions: RAB users should only perform high-impact actions permitted by their assigned privileges. National visibility does not automatically mean permission to edit every farmer record or veterinary investigation.

### 3.2 Province Veterinary Portal

The Province Veterinary Officer supervises veterinary activities across the assigned province.

Tasks and functionality

- View districts and their assigned veterinary officers.
- Monitor animal-health reports submitted by district and sector officers.
- Review disease alerts and identify potentially serious outbreaks.
- Coordinate provincial vaccination, inspection, and disease-control programs.
- Issue province-level veterinary announcements.
- Assign or escalate veterinary cases when additional support is needed.
- Review investigation outcomes and unresolved incidents.
- Monitor vaccination coverage and veterinary service activity.
- Generate provincial reports showing case counts, affected locations, response status, and trends.

Typical workflow: A district officer reports several suspected cases of the same disease. The province officer reviews the reports, assesses whether escalation is necessary, coordinates a response, and forwards serious incidents to the appropriate national authority.

The system should preserve the original report, subsequent findings, and every escalation decision.

### 3.3 District Veterinary Portal

The District Veterinary Officer coordinates local veterinary operations within an assigned district.

Tasks and functionality

- View sectors and assigned sector veterinary officers.
- Receive and review reports escalated from sectors.
- Assign cases to responsible officers.
- Coordinate animal inspections, vaccination campaigns, and disease-control activities.
- Record intervention plans, deadlines, and follow-up activities.
- Monitor the progress of unresolved veterinary cases.
- Publish district-level announcements.
- Submit periodic reports to the provincial level.
- Request additional resources or support for serious cases.

Important workflow rules

- A case should have a unique reference number.
- Every case should have an assigned officer or responsible team.
- Changes in status should record the user, date, and action.
- An unresolved serious case should be escalated according to defined urgency rules.
- Closing a case should require findings and an appropriate resolution record.

### 3.4 Sector Veterinary Portal

The Sector Veterinary Officer is the frontline contact for farmers reporting animal-health problems.

Tasks and functionality

- View assigned farmers' relevant livestock and veterinary records.
- Receive new problem reports and notifications.
- Contact farmers and schedule farm visits.
- Record clinical observations, inspection findings, and authorized treatments.
- Record vaccination and preventive-care activities.
- Update a report's status and document follow-up actions.
- Educate farmers about animal feeding, housing, hygiene, and prevention.
- Escalate serious or uncertain cases to district authorities.
- Publish local veterinary announcements.
- Track outstanding cases and overdue follow-ups.

Example: A farmer reports sick chickens. The officer receives the report, visits the farm if necessary, records observations, provides appropriate guidance, and escalates the case if a serious or contagious disease is suspected.

The system should not allow an officer to mark a case resolved without recording the outcome.

### 3.5 Farmer Portal

The Farmer Portal is the operational center for crop and livestock production. A farmer should be able to manage farm activities without needing advanced technical knowledge.

#### A. Farmer registration and profile

- Create a farmer account with verified contact information.
- Maintain personal and farm contact details.
- Select province, district, and sector.
- Register one or multiple farms.
- Record farm location, size, and production types.
- Add crop plots, livestock groups, and production facilities.
- Update profile information while preserving a record of important changes.

A farmer should only manage their own farms unless another person has explicitly been granted appropriate access.

#### B. Crop production management

- Register a crop and its growing location.
- Record variety, planting date, field size, and planned harvest date.
- Create a crop production cycle.
- Record soil preparation, planting, fertilizer application, irrigation, and pest control.
- Schedule tasks and reminders.
- Record problems and corrective actions.
- Estimate harvest dates based on the crop's requirements.
- Record actual harvest quantity, quality, and losses.
- Maintain historical records for each production cycle.

#### C. Livestock management

- Register livestock species and production type.
- Record animal counts or group sizes.
- Track acquisition or birth dates and production stages.
- Maintain feeding and housing records.
- Schedule vaccination and veterinary follow-ups.
- Record illness, mortality, treatment, and production outcomes.
- Track egg, milk, meat, or other relevant production.
- Record sales and changes in livestock inventory.

The platform should support both individual-animal records and group-based records. For example, poultry farms may manage a flock as a group, while some cattle operations may need individual animal identification.

#### D. Production progress and tasks

Each crop cycle or livestock group should have its own progress dashboard.

The system should show:

- Current production stage.
- Planned versus completed tasks.
- Upcoming activities and missed deadlines.
- Recorded costs and production inputs.
- Reported problems and their status.
- Expected and actual production.
- Historical results from earlier cycles.

Progress should be calculated from the completion of relevant tasks and recorded milestones. The system should distinguish a task being completed from the crop or animal actually achieving a successful production outcome.

#### E. Problem reporting

Farmers should be able to report:

- Crop pests and diseases.
- Animal illness or unusual mortality.
- Soil and water problems.
- Severe weather damage.
- Input shortages or other production obstacles.

A report should include a description, category, location, date, optional photos, and the affected crop or livestock group.

The farmer should be able to track the assigned officer, status, guidance received, and resolution.

#### F. Agricultural learning

- Browse crop-specific and livestock-specific lessons.
- Follow instructions organized by production stage.
- View approved feeding, planting, hygiene, and preventive-care guidance.
- Save learning materials.
- Receive reminders linked to the farmer's production calendar.
- Ask the agricultural AI assistant for explanations.
- Find relevant local training announcements.

#### G. Market access

- Publish products that are available or expected to become available.
- Specify quantity, quality, harvest or availability date, and location.
- View relevant customer requests.
- Respond to requests and receive order notifications.
- Manage accepted orders and delivery progress.
- Record completed sales and quantities sold.
- View the applicable official prices.

A product listing should not be presented as guaranteed available stock unless the farmer has confirmed its availability.

### 3.6 Customer Portal

The Customer Portal serves people and organizations that need agricultural products.

#### A. Customer account and profile

- Register and verify contact details.
- Maintain delivery locations and contact preferences.
- Identify customer type, such as household, retailer, restaurant, hotel, or processor.
- Manage saved products and order history.

#### B. Product discovery

Customers should be able to search by:

- Product name and category.
- Province, district, or sector.
- Available quantity.
- Required date.
- Product quality or grade.
- Seller and delivery options.

The search should return relevant products and farmers, showing availability, location, applicable official price, and the date the listing was last updated.

#### C. Customer demand requests

Customers should be able to request products even when the products are not currently listed as available.

A request should contain:

- Product and required quantity.
- Delivery location.
- Required delivery date.
- Quality or grade requirements.
- Additional specifications.
- Request status.

The system should notify relevant farmers in the selected region whose products may meet the request.

#### D. Order management

- Submit an order or respond to an available product listing.
- Confirm quantity and applicable official pricing.
- View estimated product totals and authorized additional charges.
- Receive seller acceptance or rejection.
- Track order preparation, dispatch, delivery, and completion.
- Cancel or request changes according to defined rules.
- Record delivery confirmation and report order problems.

If online payments are added, the platform must separately track payment status, transaction references, refunds, and payment-provider confirmation. AHub should not mark an order paid solely because a customer claims to have paid.

#### E. Customer AI assistance

Customers can ask about product availability, agricultural products, quality requirements, official pricing rules, and how to place orders. Private farmer information should not be exposed through AI responses.

### 3.7 NSG Portal — Security administration

The NSG portal manages the technical protection and reliability of AHub.

Security modules

- User and session monitoring: Review logins, active sessions, failed authentication attempts, and suspicious access patterns.
- Access control: Manage approved security policies, role permissions, and privileged access.
- Audit logs: Search significant changes by account, action, date, module, and affected record.
- Security alerts: Investigate suspicious activity, abuse, repeated failed logins, and unauthorized access attempts.
- Account protection: Suspend compromised accounts, revoke sessions, and coordinate account recovery.
- System health: Monitor service availability, backend errors, integration failures, and storage or database health.
- Backup monitoring: Verify backup jobs and support recovery procedures.
- Incident management: Record security incidents, assigned investigators, response actions, and closure notes.

Critical restriction: NSG should not be able to secretly alter official prices, edit veterinary findings, impersonate farmers, or erase audit history. Any emergency access to sensitive functions must be explicitly authorized, narrowly scoped, and fully audited.

## 4. Core system modules shared across portals

These are the main functional modules that power AHub. They are shared services, but each portal receives only the features its role is authorized to use.

| Module                   | Required functionality                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Authentication           | Registration, login, logout, account verification, password recovery, session management |
| User management          | Profiles, roles, permissions, account status, officer assignments                        |
| Administrative hierarchy | Provinces, districts, sectors, regional assignments                                      |
| Farm management          | Farms, plots, livestock groups, production cycles                                        |
| Production tracking      | Tasks, milestones, expenses, inputs, harvests, production history                        |
| Veterinary management    | Reports, inspections, assignments, treatment records, escalation, resolution             |
| Agricultural knowledge   | Lessons, guides, production calendars, recommendations                                   |
| Weather                  | Current conditions, forecasts, location-specific alerts                                  |
| Announcements            | National and regional publishing, targeting, expiry, archives                            |
| Product catalog          | Crops, livestock, eggs, milk, produce, meat, and other approved categories               |
| Government pricing       | Official prices, effective dates, approval history, applicable units and regions         |
| Marketplace              | Product listings, customer requests, matching, orders, delivery tracking                 |
| Notifications            | In-app alerts, reminders, workflow updates, optional email or SMS                        |
| AI and search            | Agricultural questions, knowledge search, recommendations, relevant marketplace search   |
| Reports and analytics    | Production, veterinary, market, pricing, and administrative reports                      |
| Security and audit       | Access policies, audit trails, incident management, system monitoring                    |

## 5. Essential system workflows

AHub should enforce complete workflows rather than merely providing forms to enter information.

### Workflow A: Farmer registers and manages a farm

STEP 1

Create and verify account

STEP 2

Register farm and location

STEP 3

Register crop or livestock group

STEP 4

Create production plan

STEP 5

Complete tasks and record progress

STEP 6

Record harvest or production

STEP 7

List available products for sale

System rules

- A production cycle belongs to a registered farm.
- Production tasks must be relevant to the crop or livestock type.
- Completed tasks record the date and responsible user.
- Changes to recorded production data should be traceable.
- The system must distinguish estimated production from actual measured production.
- Only authorized users can view or change a farm's private records.

### Workflow B: Farmer reports a problem

Farmer submits report

Description, category, location, evidence

System validates and assigns

Create reference number and notify the responsible officer

Officer investigates

Record findings, actions and follow-up

Resolve or escalate

Close with findings or escalate to the next authority

Farmer receives an update

View status and authorized guidance

The exact routing depends on the report category. Animal-health cases should follow veterinary workflows, while crop problems may need an appropriately designated agricultural extension officer or other qualified specialist.

### Workflow C: Customer requests a product

1. The customer creates a request for a specified product, quantity, region, and required date.
2. AHub validates the request and identifies eligible farmer listings or sends notifications to potentially suitable farmers.
3. Farmers review the request and indicate whether they can supply it.
4. The customer and farmer review the quantity, quality, official price, and delivery requirements.
5. The order is confirmed according to the platform's order rules.
6. The farmer updates fulfilment and delivery status.
7. The customer confirms receipt or reports a problem.
8. The completed transaction is recorded for both parties.

A request is not an order, and a product match is not a confirmed sale. These must remain separate statuses.

### Workflow D: Government publishes an official price

1. An authorized administrator creates a price proposal or new price record.
2. The system validates the product, unit, applicable region, dates, and price.
3. The required authorized approval is recorded.
4. The price becomes effective on its specified effective date.
5. The marketplace displays the applicable price for relevant products.
6. New quotes and orders use the correct price according to the approved policy.
7. The old price remains in historical records for auditing.

The system should not retroactively change a confirmed order's agreed price unless the governing rules explicitly require it and the change is properly authorized.

### Workflow E: Government publishes an announcement

1. An authorized official creates the announcement.
2. The official selects the audience: national, province, district, or sector.
3. The system checks publishing permissions and validates the publication details.
4. The announcement is published immediately or scheduled for a specified date.
5. Relevant users receive notifications.
6. The announcement remains visible until it expires or is archived.
7. Authorized users can review publication and update history.

### Workflow F: AI assistant answers a question

1. The user submits a question by text or supported voice input.
2. AHub determines the relevant topic and uses permitted contextual information.
3. The system retrieves relevant approved agricultural guidance and, where appropriate, current AHub data.
4. The AI generates an answer appropriate to the user's question and language.
5. Important recommendations include supporting sources when available.
6. High-risk or uncertain cases are referred to qualified agricultural or veterinary professionals.

The AI must not invent official prices, weather readings, announcements, diagnoses, or marketplace availability. Live information should be retrieved from its authoritative source.

## 6. Notifications and alerts

The notification service should be event-driven: the system sends notifications when relevant events happen, not just when a user opens a portal.

| Event                                 | Recipients                                               |
| ------------------------------------- | -------------------------------------------------------- |
| New veterinary report                 | Responsible sector officer                               |
| Serious case escalated                | Appropriate district, province, or national authority    |
| Officer assigned to a case            | Assigned officer                                         |
| Report status changed                 | Reporting farmer and authorized case participants        |
| Production task approaching           | Relevant farmer                                          |
| Task overdue                          | Relevant farmer                                          |
| New matching customer request         | Eligible farmers in the selected region                  |
| Customer accepts an order             | Relevant farmer                                          |
| Order status changes                  | Relevant customer and farmer                             |
| Official price becomes effective      | Relevant marketplace users and authorized administrators |
| New regional announcement             | Users in the targeted region                             |
| Suspicious login or privileged action | Authorized security personnel                            |

Users should be able to view notification history, mark notifications as read, and configure noncritical notification preferences. Critical security and safety alerts should follow stronger delivery rules.

## 7. Dashboards, reports, and system analytics

Every role should have a dashboard based on its actual responsibilities.

RAB dashboard

Regional production summaries, farmer registration trends, official price changes, national announcements, and cross-region reports.

Veterinary dashboards

New and unresolved cases, urgent alerts, response times, upcoming inspections, vaccination activity, and regional disease trends.

Farmer dashboard

Active production cycles, today's tasks, upcoming activities, unresolved reports, harvest estimates, available products, and orders.

Customer dashboard

Active requests, matching products, confirmed orders, delivery updates, and previous purchases.

NSG dashboard

Authentication events, security alerts, privileged operations, system errors, service availability, and backup status.

Reports should support filtering by date, product, production type, region, status, and responsible officer where applicable. Authorized users should be able to export reports to PDF or Excel.

National dashboards should distinguish verified records, estimates, incomplete reporting, and missing data. The system should not present unreported production as zero production.

## 8. Main data entities

The database should store related records in a structured way so that every action is associated with the correct user, region, farm, case, or transaction.

| Data entity           | Important relationships and information                       |
| --------------------- | ------------------------------------------------------------- |
| User                  | Identity, verified contacts, roles, account status            |
| Role and permission   | Authorized actions and access policies                        |
| Administrative region | Province, district, sector and hierarchy                      |
| Officer assignment    | Officer, role, region, assignment dates                       |
| Farm                  | Owner, location, farm type, production activities             |
| Crop plot             | Farm, crop, area, growing cycle                               |
| Livestock group       | Farm, species, count, purpose, production stage               |
| Production cycle      | Farm, start date, milestones, inputs, outcomes                |
| Production task       | Cycle, due date, assigned user, completion status             |
| Problem report        | Reporter, location, category, evidence, status                |
| Veterinary case       | Report, assigned officer, findings, interventions, escalation |
| Learning content      | Topic, production stage, language, source, review date        |
| Weather record        | Location, provider, observation or forecast time              |
| Announcement          | Publisher, audience, location, publication dates              |
| Agricultural product  | Product category, unit, specifications                        |
| Official price        | Product, unit, price, scope, effective period, approval       |
| Product listing       | Farmer, product, quantity, availability, status               |
| Customer request      | Customer, product, quantity, region, required date            |
| Order                 | Buyer, seller, agreed quantity, price basis, status           |
| Delivery              | Order, delivery details, status, confirmation                 |
| Notification          | Recipient, event, read status, timestamp                      |
| AI knowledge source   | Source, topic, language, verification date                    |
| Audit event           | Actor, action, affected record, timestamp, result             |
| Security incident     | Alert, severity, investigator, response, closure              |

Database relationships and validation rules should prevent invalid references, duplicate critical records, unauthorized regional access, and inconsistent order or pricing data.

## 9. System-wide business rules

These rules should be implemented in the backend, not merely enforced by hiding buttons in the frontend.

1. Role and region enforcement: users can perform only authorized actions within their assigned scope.
2. Account verification: sensitive functions require the appropriate account verification and authorization.
3. Data ownership: farmers and customers can manage their own private records, subject to explicit sharing and administrative rules.
4. Workflow integrity: veterinary reports, orders, announcements, and official prices must follow valid status transitions.
5. Price integrity: marketplace calculations use the applicable official price policy and preserve the agreed pricing basis for confirmed orders.
6. Traceability: important changes record who performed them and when.
7. No silent deletion: critical records should be archived or deactivated where appropriate, with audit history preserved.
8. Notification reliability: important events should generate durable notifications and support retry handling when delivery fails.
9. Data validation: quantities, dates, units, locations, and status transitions must be validated before saving.
10. AI boundaries: the assistant must respect user permissions and distinguish verified information from estimates or uncertain recommendations.
11. Privacy: users should access only the personal and operational information necessary for their roles.
12. Availability: the platform should support backups, recovery, monitoring, and safe handling of temporary service failures.

## 10. Recommended development and acceptance plan

AHub should be developed in stages, with each stage tested before expanding the system.

| Phase | Deliverable                          | Completion criteria                                                          |
| ----- | ------------------------------------ | ---------------------------------------------------------------------------- |
| 1     | Core accounts and permissions        | All seven roles have correct access restrictions                             |
| 2     | Administrative hierarchy             | Officers are assigned to valid regions and regional permissions work         |
| 3     | Farm and production management       | Farmers can create farms, production cycles, tasks, and harvest records      |
| 4     | Reporting and veterinary workflows   | Reports can be assigned, investigated, escalated, and resolved               |
| 5     | Official pricing and announcements   | Authorized users can publish validated prices and targeted announcements     |
| 6     | Marketplace                          | Customers can request products and complete the defined order workflow       |
| 7     | Learning, weather, and notifications | Users receive relevant guidance, weather information, and event-based alerts |
| 8     | AI assistant and analytics           | AI uses permitted sources and dashboards report validated information        |
| 9     | Security and deployment readiness    | Access controls, audit trails, backups, recovery, and monitoring are tested  |

Before production deployment, AHub should also undergo authorization testing, data privacy review, backup restoration testing, integration failure testing, and usability testing with representative farmers and veterinary officers.

## 11. Final definition of AHub

AHub is a role-based agricultural management platform with seven portals, a shared agricultural database, government-controlled information and pricing workflows, farm production tracking, veterinary case management, customer demand and marketplace functionality, agricultural education, weather services, notifications, analytics, and an agriculture-focused AI assistant.

Its central operational model is:

Government manages agricultural oversight and official information → farmers manage production and report problems → veterinary officers investigate and coordinate responses → customers express demand and purchase products → AHub connects these activities and maintains traceable records.

The NSG portal protects the platform through technical security controls and monitoring across these workflows.

The defining requirement is that every portal must have real, working functionality supported by backend rules, persistent data, appropriate permissions, and clear workflows—not just an attractive dashboard or a collection of static pages.

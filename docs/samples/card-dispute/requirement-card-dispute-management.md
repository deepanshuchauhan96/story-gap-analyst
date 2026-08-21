# Requirement: Card Dispute Management

**Version** 1.2 · **Sponsor** Card Services & Compliance · **Status** Approved

## 1. Business objective
Members currently file card disputes by phone only, and tracking is manual. Compliance risk is growing because
Regulation E deadlines are tracked in spreadsheets. We want end-to-end dispute intake, tracking, provisional
credit, and resolution in the member portal and agent console, with the regulatory clock enforced by the system.

## 2. Functional requirements
- **FR-1 Dispute intake (member).** A member can file a dispute from online banking: select one or more card
  transactions, choose a reason category (fraud/unauthorized, duplicate charge, wrong amount, goods not received,
  other), enter a description, and upload supporting documents (PDF or JPG, up to 5 files, 10 MB each).
- **FR-2 Case creation.** Each dispute creates a case with a unique reference number. The member sees all their
  disputes in a list with current status and can open a case to see its history.
- **FR-3 Dispute intake (agent).** A member service agent can file a dispute on a member's behalf from the agent
  console; the channel (phone, branch, online) is recorded on the case.
- **FR-4 Status notifications.** The member is notified at submission, provisional credit, request-for-information,
  and resolution — by email and by push notification, according to the member's notification preferences.
- **FR-5 Provisional credit.** For eligible debit-card disputes, provisional credit is issued within 10 business
  days of intake. If the dispute is denied, the provisional credit is reversed with at least 5 business days'
  advance notice to the member.
- **FR-6 Resolution.** An analyst resolves a case as approved (credit made permanent) or denied. A denial produces
  a letter stating the reason, and the member may request copies of the evidence relied upon.

## 3. Business rules
- **BR-1** A transaction can be disputed only within 60 days of the statement date on which it first appeared.
- **BR-2** The same transaction cannot have two open disputes (duplicate prevention with a clear message).
- **BR-3** Reason category is mandatory; a description is mandatory when the reason is "other".
- **BR-4** If the reason is fraud/unauthorized, the card is blocked immediately and a replacement card is offered.
- **BR-5** Disputes under $25 are auto-approved as a write-off, unless the member has had more than 3 disputes in
  the last 90 days.

## 4. Non-functional requirements
- **NFR-1 Audit.** Every action on a case (create, update, credit, reverse, resolve) is audited with user,
  date/time, and channel; audit records are retained for 7 years.
- **NFR-2 Regulatory clock.** Intake timestamps drive the Regulation E deadlines; a compliance dashboard flags
  cases at risk of breaching the 10-business-day provisional-credit deadline.
- **NFR-3 Permissions.** Members see only their own disputes. Agents require the "Disputes" permission to file on
  behalf of a member; the fraud queue is visible only to the fraud team.
- **NFR-4 Availability.** If the case system is unavailable, intake requests are queued; the member receives their
  reference number within 24 hours.
- **NFR-5 Reporting.** A monthly report of dispute volume, aging, and outcomes is produced for Compliance.

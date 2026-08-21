# Requirement: Auto-Pay Enrollment for Loans

**Version** 1.0 · **Sponsor** Digital Banking · **Status** Approved

## 1. Business objective
Members miss loan payments because manual payment is easy to forget. We want members to enroll in automatic
payments for their loans from online banking, with clear confirmation, safe controls, and a full audit trail.

## 2. Functional requirements
- **FR-1** A member can enroll a loan in auto-pay from online banking: choose the funding account, the amount type
  (minimum due, fixed amount, or statement balance), and the payment day of month.
- **FR-2** After enrolling, the member sees a confirmation screen and receives a confirmation email within
  15 minutes.
- **FR-3** A member can edit or cancel an enrollment; edits and cancellations take effect from the next payment
  cycle.

## 3. Business rules
- **BR-1** Only loans in good standing can be enrolled; loans in charge-off, bankruptcy, or more than 30 days past
  due are not eligible, and the member sees an explanation.
- **BR-2** A fixed amount must be greater than or equal to the minimum due; otherwise the enrollment is rejected
  with a clear message.
- **BR-3** If the payment day falls on a weekend or federal holiday, the payment is processed on the next business
  day.

## 4. Non-functional requirements
- **NFR-1** Every enrollment, edit, and cancellation is audited with member, date/time, and channel; audit records
  are retained for 7 years.
- **NFR-2** Members can manage only their own enrollments. A member service agent may enroll on a member's behalf
  only with the "Payments" permission, and the audit records that it was agent-assisted.
- **NFR-3** If the core banking system is unavailable at enrollment, the request is queued and retried, and the
  member sees a "pending" status rather than an error.

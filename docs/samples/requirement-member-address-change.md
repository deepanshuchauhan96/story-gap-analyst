# Requirement: Member Address Change

**Version** 1.0 · **Sponsor** Member Services · **Status** Approved

## 1. Business objective
Members frequently move and call to update their mailing address. Today agents update it in two systems by hand,
which causes mis-mailed statements. We want a single, validated, audited address-change flow on the member profile
in Salesforce.

## 2. Functional requirements
- **FR-1** A member service agent can update the member's mailing address from the member profile page.
- **FR-2** Every address is validated against the USPS address-validation service before save; the agent may accept
  the suggested standardized address or correct the input.
- **FR-3** After a successful change, the member receives an email confirmation to their address on file within
  15 minutes.

## 3. Business rules
- **BR-1** A P.O. Box is not allowed as a residential (physical) address; it is allowed as a mailing address.
- **BR-2** If the member's account has an active fraud hold, address changes are blocked and the agent sees a
  message directing them to the fraud team.

## 4. Non-functional requirements
- **NFR-1** Every change stores the old and the new address with user, date/time, and channel; audit records are
  retained for 7 years.
- **NFR-2** Only agents with the "Profile Update" permission can change an address; all other users see the fields
  read-only.
- **NFR-3** If the USPS service is unavailable, the agent can save with a supervisor override, and the address is
  flagged for later re-validation.

# Candidate Checklist

## Before submitting

- [x] I can explain how I investigated and verified every issue I claim to have fixed.
  - Reproduced each issue, analyzed logs, compared behavior before and after changes, and manually validated fixes.

- [x] I kept my changes focused and avoided unnecessary rewrites.
  - Only modified files directly related to the identified issues (security, performance, and deployment fixes).

- [x] I considered the impact of my changes on existing functionality.
  - Verified that authorization, dashboard functionality, authentication flow, and Docker builds continued to work correctly after changes.

- [x] I verified that the application behaves correctly after my changes.
  - Performed manual testing, route validation, and isolated build verification.

- [ ] I added or updated automated tests where they meaningfully improve confidence.
  - No new automated tests were added due to assignment time constraints. Manual verification and regression testing were performed instead.

- [x] I ran the project's linting, type checking, tests, and production build (where applicable).
  - Executed development builds, production builds, and validated isolated Docker build scenarios.

- [x] I documented my investigation, decisions, verification steps, and any remaining risks in `candidate-report.md`.
  - Documented fixed issues, remaining risks (CORS), missing feature gaps, and deployment concerns.

- [x] I completed `ai-usage-report-template.md` accurately.
  - Included all AI tools used, prompts, verification methods, and engineering decisions.

- [x] I understand and can explain every change included in my submission.
  - All accepted AI suggestions were manually reviewed and independently verified before inclusion.

- [x] My branch contains only intentional, relevant changes.
  - Verified that commits contain only assignment-related fixes and documentation updates.

---

## Remaining Known Risks / Limitations

1. **Permissive CORS Configuration**
   - Documented but intentionally not modified because production frontend origins were unavailable.

2. **Comment Edit/Delete Endpoints**
   - Controllers exist but routes are not exposed. Considered a product decision rather than a defect.

3. **Dependency Vulnerabilities**
   - `npm audit` reported several moderate/high vulnerabilities that require further dependency review.

4. **Automated Test Coverage**
   - Additional authorization and deployment tests would further improve confidence in future iterations.

---

## Final Submission Confirmation

☑ All identified fixes have been manually verified.

☑ All changes are intentional and understood.

☑ Documentation has been updated.

☑ AI usage has been accurately reported.

☑ I am prepared to explain the reasoning, implementation, and verification process for every change included in this submission.

---

**Candidate Name:** Pranjal Singh

**Date:** 14 July 2026

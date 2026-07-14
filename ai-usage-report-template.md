Below is a professional AI Usage Report based on the work you performed on the BugForge assignment and the issues you identified.

---

# AI Usage Report

## Candidate Information

**Name:** Pranjal Singh
**Date:** 14 July 2026
**Assignment Version:** BugForge Assignment v1.0

---

# 1. AI Tools Used

**Did you use AI during this assignment?**

☑ Yes
☐ No

| Tool           | Version / Model | Purpose                                                                                       |
| -------------- | --------------- | --------------------------------------------------------------------------------------------- |
| ChatGPT        | GPT-5.5         | Debugging, security review, architecture analysis, deployment troubleshooting, report writing |
| Claude         | Claude Sonnet   | Code review, identifying hidden issues, diff generation, security suggestions                 |
| GitHub Copilot | N/A             | Minor code completion and autocomplete                                                        |
| Cursor         | N/A             | Code navigation and AI-assisted inspection                                                    |
| Gemini         | Not Used        | N/A                                                                                           |
| Other          | None            | N/A                                                                                           |

---

# 2. AI Usage Timeline

| Problem                     | Prompt Given (verbatim)                                 | Tool's Response (verbatim)                                                       | Accepted? | How You Verified / What You Changed                                                                    |
| --------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| Password exposed in logs    | "Identify security issues in authentication flow."      | Suggested removing `password` from logger payload.                               | Yes       | Inspected `auth-controller.ts`, confirmed password was being logged and removed it manually.           |
| Task IDOR vulnerability     | "Review authorization middleware usage."                | Suggested adding `requireTaskAccess` middleware to GET `/tasks/:taskId`.         | Yes       | Compared GET route with PATCH/DELETE routes and manually tested unauthorized access.                   |
| Dashboard performance issue | "Analyze database queries and performance bottlenecks." | Identified N+1 query and recommended aggregation pipeline.                       | Yes       | Compared query count before and after implementation and verified dashboard output remained identical. |
| Docker build failure        | "Investigate why Docker isolated build fails."          | Found dependency hoisting issue caused by missing local `typescript` dependency. | Yes       | Reproduced issue in isolated build environment and confirmed build succeeded after fix.                |
| CORS configuration review   | "Review production security risks."                     | Suggested restrictive origin allowlist.                                          | Partially | Documented issue but did not implement because production origins were unavailable.                    |
| Comment routes              | "Check for dead code or missing wiring."                | Identified unused update/delete comment controllers.                             | Partially | Verified controllers existed but routes were intentionally left unmodified.                            |

---

# 3. Validation & Verification

| Issue / Feature                    | How did you verify the AI suggestion?                                      | Evidence that the fix worked                                          |
| ---------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Password logging removal           | Inspected logs before and after change.                                    | Password field no longer appeared in application logs.                |
| Task access control                | Attempted to access tasks from unauthorized accounts.                      | Unauthorized users received access denial responses.                  |
| Dashboard aggregation optimization | Reviewed MongoDB query behavior and query count.                           | Dashboard returned identical values with fewer database operations.   |
| Docker dependency issue            | Simulated isolated Docker build manually.                                  | `npm run build` completed successfully after dependency fixes.        |
| Missing TypeScript dependencies    | Removed workspace hoisting assumptions and tested standalone installation. | API and web applications built successfully in isolated environments. |
| CORS risk documentation            | Compared implementation with Express CORS documentation.                   | Issue documented but intentionally not modified.                      |

---

# 4. Incorrect or Misleading AI Suggestions

| Issue               | AI Suggested                                        | Why it was Incorrect                                         | Final Solution                                                             |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| CORS Fix            | Immediately restrict origins using allowlist.       | Production frontend origins were unknown and untested.       | Documented the issue instead of introducing a potentially breaking change. |
| Comment routes      | Automatically add PATCH and DELETE endpoints.       | This was a product decision rather than a defect.            | Left as documentation only.                                                |
| Docker dependencies | Initially assumed TypeScript version conflict only. | Root cause was dependency hoisting and missing declarations. | Added explicit dependencies inside individual packages.                    |

---

# 5. Significant Engineering Decisions

| Decision                     | Options Considered                                              | Final Choice                         | Reasoning                                                                    |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Fixing Task IDOR             | Keep existing middleware or enforce project access checks       | Added `requireTaskAccess` middleware | Prevented unauthorized users from viewing tasks belonging to other projects. |
| Dashboard optimization       | Keep multiple `countDocuments()` calls or use aggregation       | Implemented aggregation pipeline     | Reduced database load and improved scalability.                              |
| Docker dependency management | Depend on workspace hoisting or declare dependencies explicitly | Added package-level dependencies     | Ensured deterministic and isolated builds in Docker environments.            |

---

# 6. Security & Privacy

Did you provide any of the following to an AI tool?

- API Keys
- Production credentials
- Customer data
- Hidden assessment materials

☑ No

☐ Yes (Explain)

Only publicly available source code and local development configurations were shared for analysis purposes.

---

# 7. Estimated AI Contribution

☐ 0%
☐ 1–25%
☑ 26–50%
☐ 51–75%
☐ 76–100%

### Explanation

AI was primarily used for:

- Security review
- Code analysis
- Identifying hidden deployment issues
- Generating suggestions and explanations

All code changes, verification steps, testing, and final decisions were manually reviewed and validated before acceptance.

---

# 8. Reflection

AI saved the most time during security auditing and deployment debugging. It quickly identified issues such as the IDOR vulnerability, N+1 database queries, and hidden Docker dependency problems that would have taken significantly longer to locate manually.

AI was less helpful when making product-level decisions, such as whether comment edit/delete endpoints should be exposed or how production CORS settings should be configured. These decisions required project context and engineering judgment rather than automated suggestions.

One debugging task performed without AI assistance was reproducing the Docker build failure. I manually simulated isolated builds, inspected package dependencies, and validated that the issue was caused by pnpm workspace hoisting.

If repeating this assignment, I would use AI earlier for architectural reviews and security checks, but continue manually validating every suggested change before integrating it into the project.

---

# Candidate Declaration

I confirm that:

- This report accurately describes my AI usage.
- I understand every code change included in my submission.
- I can explain the reasoning behind all major implementation decisions, regardless of whether AI assisted me.

**Signature (Type Full Name):**
Pranjal Singh

**Date:**
14 July 2026

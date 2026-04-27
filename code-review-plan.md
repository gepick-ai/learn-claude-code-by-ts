# Code Review Plan

## Review Structure
1. **Findings** - Identify correctness issues, regressions, broken assumptions
2. **Open Questions/Assumptions** - Note any unclear aspects or unvalidated assumptions
3. **Summary** - Brief overview of the review

## Review Focus Areas
- **Correctness** - Ensure functionality works as intended
- **Regressions** - Check for unintended breaking changes
- **Edge Cases** - Verify handling of boundary conditions
- **Validation** - Confirm input/output validation exists
- **Safety** - Check for unsafe defaults or security risks
- **Tests** - Look for missing tests only when they increase risk

## Process
1. Start by reviewing the code changes
2. Prioritize critical issues (breakage, security)
3. Document findings clearly
4. Note any unaddressed risks
5. Provide a concise summary

## Outcome
- If no issues found: State clearly with remaining risks/gaps
- If issues found: List them with priorities

User: Add a password reset flow. Keep it simple but make sure tokens expire.

Assistant: I will inspect the auth route and existing tests, then add a reset token helper and route-level validation.

Tool: Read src/auth/routes.js

Assistant: The app already validates login input at the route boundary, so I will follow that pattern instead of adding a new validation library.

Tool: Edit src/auth/routes.js

Assistant: I added a POST /password-reset route that validates email, creates a reset token, stores an expiry, and returns a generic success message to avoid account enumeration.

Tool: Edit src/auth/tokens.js

Assistant: I added token creation and verification helpers. The token is hashed before storage and expires after 30 minutes.

Command: npm test -- auth

Error: expected expired token to be rejected, but verification returned true.

Assistant: The test exposed that I compared the current time in the wrong direction. I will fix the expiry check and keep the regression test.

Tool: Edit src/auth/tokens.js

Command: npm test -- auth

Assistant: Tests now pass. I will summarize the edge cases covered and the ones still missing.

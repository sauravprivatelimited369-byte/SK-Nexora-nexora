# Contributing to NEXORA

Thanks for helping make engineering learning clearer, safer, and more useful. Small, focused fixes are welcome.

## Before you start

- For a significant feature, open an issue first so scope and trade-offs can be discussed.
- For a small fix, you can open a pull request directly.
- Check existing issues and pull requests before starting duplicate work.
- Never include real learner data, passwords, API keys, email verification links, or private project artifacts in an issue, test fixture, commit, or screenshot.
- The repository currently has no selected open-source license. Please do not assume public visibility grants permission to reuse or redistribute the code.

## Local development

```bash
npm ci
cp .env.example .env.local
npm run db:seed
npm run dev
```

Leave `DATABASE_URL` empty for the persistent local PGlite database. Optional integrations are not required for core local flows. Read the [README](README.md) for configuration and production notes.

## Make a change

1. Create a focused branch from the current default branch.
2. Keep changes scoped to one problem and prefer clear, typed code over hidden behavior.
3. Add or update tests for behavior changes. Protect private data and validate every input at the server boundary.
4. Keep UI responsive, keyboard-accessible, and clear about evidence, privacy, and AI-generated content.
5. Run the checks before opening a pull request:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

6. Describe the user problem, the change, any security/privacy impact, and manual verification in your pull request. Include screenshots for meaningful UI changes, after removing all private data.

## Review checklist

- [ ] Inputs are validated and private records are owner-scoped.
- [ ] No secrets or learner personal data are added.
- [ ] Loading, empty, success, and error states are understandable.
- [ ] Keyboard focus and mobile layout remain usable.
- [ ] Tests, typecheck, and production build pass.
- [ ] Documentation and environment examples match actual behavior.

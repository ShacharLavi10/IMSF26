---
name: always-push-sandbox-rule
description: Enforce immediate automatic git push and Vercel deployment to sandbox after any code changes
trigger: always_on
---

# Always Push and Deploy to Sandbox Rule

Whenever you make **any** code change (Frontend HTML/CSS/JS or Backend) in this project, you **MUST** automatically and immediately push the changes to the `sandbox` branch on GitHub **AND** deploy directly to the Vercel Sandbox environment.

## Critical Instruction

**DO NOT ASK FOR PERMISSION.** 
**DO NOT WAIT FOR THE USER TO CHECK.**

As soon as your code modifications are complete, you must run:
\`\`\`bash
git add .
git commit -m "Your descriptive commit message"
git push origin sandbox
cmd.exe /c "npx --yes vercel deploy --prod --yes"
\`\`\`

### Why running `vercel deploy --prod --yes` is mandatory:
In Vercel, the `imsf26sandbox` project has `https://imsf26sandbox.vercel.app` bound to its Production environment. If you only push to GitHub without deploying, Vercel treats `sandbox` as a Preview branch (protected by Vercel SSO login) and **does not update** the main URL `https://imsf26sandbox.vercel.app`.
Running `cmd.exe /c "npx --yes vercel deploy --prod --yes"` builds and immediately aliases `https://imsf26sandbox.vercel.app` so the user sees the changes instantly.

The user expects the `sandbox` environment (`https://imsf26sandbox.vercel.app`) to reflect your changes **instantly** without them needing to prompt you.

- If you make a change, you push to `sandbox` AND run `cmd.exe /c "npx --yes vercel deploy --prod --yes"`.
- Only if the user explicitly confirms the changes are good and asks you to push to production (`main` branch), you push to production.
- Otherwise, your default destination for every change is `sandbox`. 

**This rule is permanent and unconditional.**

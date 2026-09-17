---
name: always-push-sandbox-rule
description: Enforce immediate automatic git push to sandbox branch after any code changes
trigger: always_on
---

# Always Push to Sandbox Rule

Whenever you make **any** code change (Frontend HTML/CSS/JS or Backend) in this project, you **MUST** automatically and immediately push the changes to the `sandbox` branch on GitHub.

## Critical Instruction

**DO NOT ASK FOR PERMISSION.** 
**DO NOT WAIT FOR THE USER TO CHECK.**

As soon as your code modifications are complete, you must run:
\`\`\`bash
git add .
git commit -m "Your descriptive commit message"
git push origin sandbox
\`\`\`

The user expects the `sandbox` environment (deployed via Vercel on the `sandbox` branch) to reflect your changes **instantly** without them needing to prompt you.

- If you make a change, you push it to `sandbox`.
- Only if the user explicitly confirms the changes are good and asks you to push to production (`main` branch), you push to production.
- Otherwise, your default destination for every change is `sandbox`. 

**This rule is permanent and unconditional.**

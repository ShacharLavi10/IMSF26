---
name: apps-script-deploy-rule
description: Enforce clasp deploy whenever Apps Script code is pushed
trigger: always_on
---

# Apps Script Deployment Rule

Whenever you modify any `.gs` or `.html` file inside the `src/` directory (Google Apps Script) and run `clasp push`, you **MUST** also run `clasp deploy` to ensure the live Web App uses the new code.

## Critical Instruction
Running `clasp push` alone ONLY updates the code in the Google Apps Script editor. The production Web App (`/exec` URL) will remain on the old version until a new deployment is created.

**Always run:**
`npx.cmd clasp push -f`
followed by
`npx.cmd clasp deploy -i AKfycby1dsqYxPUX21OOFtrE0Q2ggJGdcquwwna4_0f3SOtpj800wRgdn_18BApye05Ohmu3 -d "Your deployment description"`

If you forget to run `clasp deploy`, the frontend will interact with an outdated backend payload, causing missing data bugs (like `undefined` scheduleData) that lead to infinite loading states or silent crashes on the client.

## Context
In a previous incident, the agent optimized `PortalBackend.gs` to include `scheduleData` in the return payload and ran `clasp push`, but forgot to run `clasp deploy`. This caused the live Web App to continue returning the old payload without `scheduleData`. The frontend `index.html` evaluated `response.scheduleData` as `undefined` and failed to hide the `<div id="schedule-loader-container">`, resulting in an endless spinning loader for the user.

**DO NOT REPEAT THIS MISTAKE.**

## Production Backend Permissions Alert
Whenever you deploy code to the **Production** Google Apps Script (`1wFP1kbXUC-7dpdlghPGDPcv2AKtX0ZusEpTpkBIw6w4raDyikZkdvj3z`), Google may invalidate OAuth permissions for sensitive services like `GmailApp` until manually re-confirmed.
**MANDATORY:** Whenever you deploy a new backend version to Production, you **MUST** immediately prompt the user with the direct editor link:
`https://script.google.com/home/projects/1wFP1kbXUC-7dpdlghPGDPcv2AKtX0ZusEpTpkBIw6w4raDyikZkdvj3z/edit`
and ask them to click "Run" once to re-authorize permissions, preventing guest login (OTP) lockouts.


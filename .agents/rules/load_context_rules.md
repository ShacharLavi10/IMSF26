# Knowledge Base Routing Rules

When processing a user request, you MUST NOT read all `.md` files in `.agents/docs/`. Instead, read ONLY the specific files that are relevant to the user's request based on these rules:

1. **If the user asks about the general goal, project vision, or who is who:**
   -> Read `01_PROJECT_VISION_AND_ROLES.md`

2. **If the user asks about how the app works, deployment, environments, API, or Google Apps Script:**
   -> Read `02_ARCHITECTURE_AND_WORKFLOW.md`

3. **If the user asks to add/modify data, columns, Google Sheets logic, sync logic, or database fields:**
   -> Read `03_DATABASE_SCHEMA.md`

4. **If you need specific IDs for Drive folders, Script IDs, or deployment URLs:**
   -> Read `04_ENVIRONMENTS_AND_IDS.md`

5. **If the user asks to modify the UI, CSS, HTML layout, or language strings:**
   -> Read `05_UI_UX_AND_DESIGN.md`

6. **If you need to know the DOM IDs of sections in `index.html` (like login, tabs, etc.):**
   -> Read `06_FRONTEND_GLOSSARY.md`

**CRITICAL:** Only load the files you need for the specific task to conserve your context window and improve your accuracy!

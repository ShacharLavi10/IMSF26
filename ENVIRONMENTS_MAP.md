# IMSF 26 - Environments Architecture

מסמך זה מרכז ומסכם את ארכיטקטורת הסביבות של פרויקט IMSF 26, לאחר ההפרדה בין סביבת הפיתוח (Sandbox) לסביבת האמת (Production). 
ההפרדה מבטיחה שכל הניסויים ופיתוחי הקוד יתבצעו במנותק לחלוטין מהנתונים החיים של הפסטיבל.

## מנגנון הפיצול (Dynamic Environment Detection)

בסקריפט ה-Backend מוגדרת פונקציה חכמה שבודקת בזמן אמת מהו ה-`Script ID` שמריץ את הקוד:
- אם הוא שווה ל-`1wFP1kbXUC-7dpdlghPGDPcv2AKtX0ZusEpTpkBIw6w4raDyikZkdvj3z`, המערכת מזהה שהיא בפרודקשן ומושכת את משאבי האמת.
- אם הוא שווה ל-`1Yy2p2pJifKLOqd-UEHW8KKpazlVUpBcy6oUezhvDZYTDZeKekesi0FkW` (או כל מזהה אחר), המערכת מזהה שהיא ב-Sandbox ומושכת רק את משאבי הניסוי.

---

## 🟢 סביבת אמת (Production)
סביבה זו משמשת את הלקוחות והאורחים באמת ואין לערוך בה ניסויים ישירים.

| משאב | מזהה (ID) | קישור מהיר |
| :--- | :--- | :--- |
| **פורטל אורחים / Vercel (אמת)** | `imsf26portal` | [לפתיחת הפורטל ב-Vercel](https://imsf26portal.vercel.app/) |
| **פורטל אורחים / Web App (אמת)** | `AKfycbyGjswDALICsGxU5wXzeeTLV8NfIA71-K1Z1tCUmS94IbTPqxjos5BACqcB3ezVw1fg5A` | [לפתיחת ה-Web App ב-Apps Script](https://script.google.com/macros/s/AKfycbyGjswDALICsGxU5wXzeeTLV8NfIA71-K1Z1tCUmS94IbTPqxjos5BACqcB3ezVw1fg5A/exec) |
| **גיליון אורחים ראשי (Google Sheets)** | `17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos` | [לפתיחת הגיליון האמיתי](https://docs.google.com/spreadsheets/d/17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos/edit) |
| **עורך הסקריפט הראשי (Apps Script)** | `1wFP1kbXUC-7dpdlghPGDPcv2AKtX0ZusEpTpkBIw6w4raDyikZkdvj3z` | [לצפייה בסקריפט האמיתי](https://script.google.com/d/1wFP1kbXUC-7dpdlghPGDPcv2AKtX0ZusEpTpkBIw6w4raDyikZkdvj3z/edit) |
| **גיליון טיסות ענת** | `1UDzPjGWdvjJ1yOQHmORY-itX0yr52BMOkSrdac3t95M` | [לצפייה בגיליון](https://docs.google.com/spreadsheets/d/1UDzPjGWdvjJ1yOQHmORY-itX0yr52BMOkSrdac3t95M) |
| **תיקיית תמונות דרכון** | `1gHSfIH1175u09sQEtp5gOSI_oNF6WrDUqUnxUPT4umwKNM-J0dxeNLI3qYQBqcevujCWq6rI` | [לפתיחת התיקייה](https://drive.google.com/drive/folders/1gHSfIH1175u09sQEtp5gOSI_oNF6WrDUqUnxUPT4umwKNM-J0dxeNLI3qYQBqcevujCWq6rI) |
| **תיקיית תמונות אישיות** | `1ia1t0xqowQbYKjsYQl9PRy396dDNr7fXbKXzr20suy9waDJEcxMcvYDtb7w3J_d3Q_b8w6c9` | [לפתיחת התיקייה](https://drive.google.com/drive/folders/1ia1t0xqowQbYKjsYQl9PRy396dDNr7fXbKXzr20suy9waDJEcxMcvYDtb7w3J_d3Q_b8w6c9) |

---

## 🟡 סביבת ניסוי (Sandbox)
הסביבה שבה מתבצעים הפיתוח והבדיקות לפני אישור גרסה.

| משאב | מזהה (ID) | קישור מהיר |
| :--- | :--- | :--- |
| **פורטל אורחים / Vercel (ניסוי)** | `imsf26sandbox` | [לחץ למעבר לאתר ב-Vercel](https://imsf26sandbox-git-sandbox-imsf-26.vercel.app/) |
| **פורטל אורחים / Web App (ניסוי)** | `AKfycbydLP8CsZv1sE2faart0dViAe73zhldsXlbiX6FQ_T0qRxu8vz7lnd3qyjE24AtK61a` | [לפתיחת ה-Web App ב-Apps Script](https://script.google.com/macros/s/AKfycbydLP8CsZv1sE2faart0dViAe73zhldsXlbiX6FQ_T0qRxu8vz7lnd3qyjE24AtK61a/exec) |
| **גיליון ניסויים ראשי (Google Sheets)** | `1Er377KhxxmpnagJY_7t0q4K3wfNxS4dKYWxAPHOmYNE` | [לפתיחת גיליון הניסוי](https://docs.google.com/spreadsheets/d/1Er377KhxxmpnagJY_7t0q4K3wfNxS4dKYWxAPHOmYNE/edit) |
| **עורך הסקריפט הראשי (Apps Script)** | `1Yy2p2pJifKLOqd-UEHW8KKpazlVUpBcy6oUezhvDZYTDZeKekesi0FkW` | [לצפייה בסקריפט הניסוי](https://script.google.com/d/1Yy2p2pJifKLOqd-UEHW8KKpazlVUpBcy6oUezhvDZYTDZeKekesi0FkW/edit) |
| **גיליון טיסות ענת (מדומה)** | `1mrKQ-10d1wLSjY3pjPyDO6dY8UZ9k-IiePXOOWTYBZY` | [לצפייה בגיליון המדומה](https://docs.google.com/spreadsheets/d/1mrKQ-10d1wLSjY3pjPyDO6dY8UZ9k-IiePXOOWTYBZY/edit) |
| **תיקיית תמונות דרכון (מדומה)** | `1loqPR_oRFxvrznzYGrsaNqhTJbtbe8lr` | [לפתיחת התיקייה](https://drive.google.com/drive/folders/1loqPR_oRFxvrznzYGrsaNqhTJbtbe8lr) |
| **תיקיית תמונות אישיות (מדומה)** | `1-eKETDgCwA0tTennT6egrpfROpLeGzse` | [לפתיחת התיקייה](https://drive.google.com/drive/folders/1-eKETDgCwA0tTennT6egrpfROpLeGzse) |

---

## 💻 ניהול סביבות בקבצים המקומיים (Local Workspace: `IMSF 26 VERCEL`)

כל עבודת הפיתוח מתבצעת בתיקייה המקומית `C:\Users\Shachar Lavi\Desktop\IMSF 26 VERCEL`.
- **Frontend**: ענף `sandbox` ב-GitHub מסונכרן אוטומטית עם Vercel Sandbox. ענף `main` מסונכרן עם Vercel Production.
- **Backend API**: קובץ `PortalBackend-Vercel.gs` נפרס ל-Google Apps Script לפי המזהים לעיל.

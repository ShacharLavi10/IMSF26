/**
 * =========================================================================
 * IMSF 2026 - INTERNATIONAL DELEGATES DIRECTORY PDF EXPORT MODULE
 * =========================================================================
 * Provides server-side generation of a formatted, print-ready PDF containing
 * complete profiles of all international delegates (Name, Photo, Country,
 * Company, Role, Genre, Website, Biography, Email, and Phone/WhatsApp).
 * Supports:
 *  1. Sending PDF via GmailApp to the delegate's email
 *  2. Direct download as a Base64 blob
 *  3. Instant browser preview in a new tab
 */

function escapeDelegatesHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDelegateThumbnailUrl(url) {
  if (!url) return "";
  const str = String(url).trim();
  if (str.includes("drive.google.com")) {
    const match = str.match(/[-\w]{25,}/);
    if (match) {
      return "https://drive.google.com/thumbnail?id=" + match[0] + "&sz=w800";
    }
  }
  return str;
}

/**
 * Builds the HTML template for the International Delegates Directory PDF
 */
function buildDelegatesPdfHtml(guestName, guestEmail, delegatesList) {
  const nowStr = Utilities.formatDate(new Date(), "GMT+2", "dd/MM/yyyy HH:mm");
  
  // Calculate unique countries
  const countriesSet = new Set();
  delegatesList.forEach(g => {
    const c = (g["Country"] || g.country || "").trim();
    if (c && c !== "N/A") countriesSet.add(c);
  });
  const countriesCount = countriesSet.size;

  let cardsHtml = "";
  delegatesList.forEach((g, idx) => {
    const fName = (g["First Name"] || g.firstName || "").trim();
    const lName = (g["Last Name"] || g.lastName || "").trim();
    const fullName = `${fName} ${lName}`.trim() || (g["Email"] || g.email || "Delegate");
    
    let genre = (g["Genre / Style"] || g.genre || "").trim();
    if (genre.toLowerCase().includes("both")) genre = "All Genres";
    
    const country = (g["Country"] || g.country || "N/A").trim();
    const company = (g["Company / Organization"] || g.company || "Independent").trim();
    const role = (g["Role / Title"] || g.role || "").trim();
    const website = (g["Website"] || g.website || "").trim();
    const bio = (g["Biography"] || g.bio || "").trim();
    const email = (g["Email"] || g.email || "").trim();
    const phone = (g["Phone"] || g.phone || "").trim();
    
    const rawPhoto = g["Photo"] || g.photo || "";
    const photoUrl = getDelegateThumbnailUrl(rawPhoto);

    // Photo / Avatar HTML
    let avatarHtml = `<div style="width: 72px; height: 72px; background-color: #f1f5f9; border: 1.5px solid #0f172a; border-radius: 6px; text-align: center; line-height: 72px; font-size: 26px;">👤</div>`;
    if (photoUrl) {
      avatarHtml = `<img src="${escapeDelegatesHtml(photoUrl)}" width="72" height="72" style="object-fit: cover; border-radius: 6px; border: 1.5px solid #0f172a; display: block;" alt="${escapeDelegatesHtml(fullName)}" />`;
    }

    // Websites list
    let websitesHtml = "";
    if (website) {
      const urls = website.split(/\r?\n/).map(u => u.trim()).filter(Boolean);
      websitesHtml = urls.map(u => {
        const href = u.startsWith("http") ? u : "https://" + u;
        return `<a href="${escapeDelegatesHtml(href)}" style="color: #0284c7; font-weight: bold; text-decoration: underline; font-size: 11px; margin-right: 8px;">${escapeDelegatesHtml(u)} &rarr;</a>`;
      }).join(" ");
    }

    // Clean phone for WhatsApp link
    let phoneLinkHtml = "";
    if (phone) {
      let cleanPhone = String(phone).replace(/[^0-9+]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '972' + cleanPhone.substring(1);
      } else {
        cleanPhone = cleanPhone.replace('+', '');
      }
      phoneLinkHtml = `<a href="https://wa.me/${escapeDelegatesHtml(cleanPhone)}" style="color: #16a34a; font-weight: bold; text-decoration: underline;">${escapeDelegatesHtml(phone)} (WhatsApp)</a>`;
    }

    // Single Delegate Card
    cardsHtml += `
      <div class="delegate-card" style="border: 1.5px solid #0f172a; border-radius: 6px; background-color: #ffffff; padding: 12px 14px; margin-bottom: 14px; page-break-inside: avoid;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="84" valign="top">
              ${avatarHtml}
            </td>
            <td valign="top" style="padding-left: 10px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <div style="font-size: 16px; font-weight: bold; color: #0f172a; line-height: 1.2;">
                      ${escapeDelegatesHtml(fullName)}
                    </div>
                    <div style="margin-top: 4px;">
                      <span style="display: inline-block; background-color: #e0f2fe; border: 1px solid #0284c7; border-radius: 4px; padding: 2px 7px; font-size: 10.5px; font-weight: bold; color: #0369a1; margin-right: 4px;">
                        📍 ${escapeDelegatesHtml(country)}
                      </span>
                      ${genre ? `
                        <span style="display: inline-block; background-color: #f8fafc; border: 1px solid #0f172a; border-radius: 4px; padding: 2px 7px; font-size: 10.5px; font-weight: bold; color: #0f172a;">
                          ${escapeDelegatesHtml(genre)}
                        </span>
                      ` : ''}
                    </div>
                  </td>
                  <td width="60" align="right" valign="top">
                    <span style="font-size: 11px; font-weight: bold; color: #94a3b8;">#${idx + 1}</span>
                  </td>
                </tr>
              </table>

              <!-- Company & Role -->
              <div style="margin-top: 6px; font-size: 12px; color: #1e293b; line-height: 1.35;">
                <strong>${escapeDelegatesHtml(company)}</strong>
                ${role ? ` &bull; <span style="color: #64748b;">${escapeDelegatesHtml(role)}</span>` : ''}
              </div>

              ${websitesHtml ? `<div style="margin-top: 4px;">${websitesHtml}</div>` : ''}
            </td>
          </tr>
        </table>

        <!-- Biography -->
        ${bio ? `
          <div style="font-size: 11px; color: #334155; margin-top: 8px; line-height: 1.45; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            ${escapeDelegatesHtml(bio)}
          </div>
        ` : ''}

        <!-- Direct Contact Details -->
        ${(email || phone) ? `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-top: 8px; font-size: 11.5px; color: #334155;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  ${email ? `
                    <span>✉️ <strong>Email:</strong> <a href="mailto:${escapeDelegatesHtml(email)}" style="color: #0284c7; font-weight: bold; text-decoration: underline;">${escapeDelegatesHtml(email)}</a></span>
                  ` : ''}
                  ${(email && phone) ? ` &nbsp;&bull;&nbsp; ` : ''}
                  ${phone ? `
                    <span>📞 <strong>Phone:</strong> ${phoneLinkHtml}</span>
                  ` : ''}
                </td>
              </tr>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>IMSF 2026 - International Delegates Directory</title>
      <style>
        @page {
          size: A4;
          margin: 12mm 10mm 12mm 10mm;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 12px;
        }
        .header-box {
          background-color: #0a1626;
          border: 2px solid #000000;
          border-radius: 6px;
          padding: 16px 18px;
          color: #ffffff;
          margin-bottom: 16px;
        }
        .header-title {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
          color: #ffffff;
          letter-spacing: 0.5px;
        }
        .header-subtitle {
          font-size: 13.5px;
          font-weight: bold;
          color: #F1A9A0;
          margin: 4px 0 0 0;
        }
        .header-desc {
          font-size: 11px;
          color: #94a3b8;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }
        .summary-bar {
          background-color: #f1f5f9;
          border: 1.5px solid #0f172a;
          border-radius: 4px;
          padding: 8px 12px;
          margin-bottom: 16px;
          font-size: 11.5px;
          font-weight: bold;
          color: #1e293b;
        }
        .footer-box {
          border-top: 2px solid #e2e8f0;
          padding-top: 12px;
          margin-top: 20px;
          font-size: 10.5px;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- FESTIVAL HEADER -->
      <div class="header-box">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle">
              <div class="header-title">Israel Music Showcase Festival 2026</div>
              <div class="header-subtitle">International Delegates Directory</div>
              <div class="header-desc">Official directory of international music delegates, festival directors, booking agents, labels, and industry professionals.</div>
            </td>
            <td width="95" align="right" valign="middle">
              <div style="background-color: #F1A9A0; color: #0a1626; font-weight: bold; font-size: 10px; border: 1.5px solid #000; border-radius: 4px; padding: 5px 6px; text-align: center; text-transform: uppercase;">
                IMSF 2026<br><span style="font-size: 8.5px; opacity: 0.85;">DELEGATES</span>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- SUMMARY BAR -->
      <div class="summary-bar">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span>🌐 <strong>${delegatesList.length}</strong> International Delegates</span>
              &nbsp;&bull;&nbsp;
              <span>📍 <strong>${countriesCount}</strong> Countries Represented</span>
            </td>
            <td align="right" style="font-size: 10.5px; color: #64748b;">
              Exported for ${escapeDelegatesHtml(guestName)} on ${nowStr}
            </td>
          </tr>
        </table>
      </div>

      <!-- DELEGATE CARDS -->
      ${cardsHtml}

      <!-- FOOTER -->
      <div class="footer-box">
        <strong>Exposure Festival 2026 / Yellow Submarine, Jerusalem</strong><br>
        For inquiries, partnerships and booking introductions: <a href="mailto:imsfhost@gmail.com" style="color: #0284c7; text-decoration: underline;">imsfhost@gmail.com</a> &bull; <a href="https://yellowsubmarine.org.il" style="color: #0284c7; text-decoration: underline;">yellowsubmarine.org.il</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * Main Controller: Generates the Delegates Directory PDF and returns Base64 / sends via GmailApp
 */
function generateAndSendDelegatesPdf(email, clientPayload, options) {
  try {
    if (!email) {
      return { success: false, message: "Email is required." };
    }
    const cleanEmail = email.toString().trim().toLowerCase();
    options = options || {};
    const shouldSendEmail = (options.sendEmail === true);
    const returnBase64 = (options.returnBase64 !== false);

    // Get requester name from master sheet
    let guestName = cleanEmail;
    try {
      if (typeof getGuestDetailsFromMaster === "function") {
        const details = getGuestDetailsFromMaster(cleanEmail);
        if (details && details.fullName) guestName = details.fullName;
      }
    } catch (e) {
      console.warn("Could not retrieve guest name:", e);
    }
    if (options.guestName) {
      guestName = options.guestName;
    }

    // Parse delegates list
    let delegatesList = [];
    const payload = (typeof clientPayload === "string") ? JSON.parse(clientPayload) : (clientPayload || {});
    
    if (payload.delegates && Array.isArray(payload.delegates) && payload.delegates.length > 0) {
      delegatesList = payload.delegates;
    } else {
      // Fallback: Fetch from master sheet directly
      const ssId = CONFIG.MASTER_SPREADSHEET_ID || SpreadsheetApp.getActiveSpreadsheet().getId();
      const ss = SpreadsheetApp.openById(ssId);
      const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
      if (masterSheet) {
        const masterData = masterSheet.getDataRange().getValues();
        delegatesList = fetchAllGuestsDirectory(masterData, MAPPINGS.GUESTS_DIRECTORY);
      }
    }

    if (!delegatesList || delegatesList.length === 0) {
      return { success: false, message: "No delegates found to export." };
    }

    // Build the PDF HTML
    const pdfHtml = buildDelegatesPdfHtml(guestName, cleanEmail, delegatesList);
    const pdfOutput = HtmlService.createHtmlOutput(pdfHtml);
    const pdfFileName = 'IMSF26_Delegates_Directory.pdf';
    const pdfBlob = pdfOutput.getAs('application/pdf').setName(pdfFileName);

    let emailSent = false;
    if (shouldSendEmail) {
      const emailSubject = "IMSF 2026 - International Delegates Directory";
      const emailBodyHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background-color: #f8fafc; padding: 24px;">
          <div style="background-color: #0a1626; border-radius: 8px 8px 0 0; padding: 28px 24px; text-align: center; border-bottom: 4px solid #F1A9A0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">Israel Music Showcase Festival 2026</h1>
            <p style="color: #F1A9A0; margin: 8px 0 0; font-size: 14px; font-weight: 600;">International Delegates Directory &amp; Industry Contacts</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 28px 24px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 15px; margin-top: 0;">Hi <strong>${escapeDelegatesHtml(guestName)}</strong>,</p>
            <p style="font-size: 14px;">Attached to this email is your copy of the <strong>IMSF 2026 International Delegates Directory (PDF)</strong> containing all attending delegates, their organizations, roles, countries, full biographies, websites, and direct contact details.</p>
            
            <div style="background-color: #f0fdf4; border: 1.5px solid #16a34a; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
              <strong style="color: #166534; font-size: 14px;">Directory Summary:</strong>
              <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #14532d;">
                <li>Total Delegates: <strong>${delegatesList.length}</strong></li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
              All links inside the attached PDF (websites, emails, and WhatsApp numbers) are fully clickable for easy networking.
            </p>

            <div style="border-top: 1px solid #edf2f7; padding-top: 18px; font-size: 13px; color: #718096;">
              Warm regards,<br>
              <strong>The IMSF 2026 Production Team</strong><br>
              Yellow Submarine, Jerusalem
            </div>
          </div>
        </div>
      `;

      GmailApp.sendEmail(cleanEmail, emailSubject, "", {
        htmlBody: emailBodyHtml,
        from: "imsfhost@gmail.com",
        name: "Israel Music Showcase Festival 2026",
        attachments: [pdfBlob]
      });
      emailSent = true;
    }

    let base64 = "";
    if (returnBase64) {
      base64 = Utilities.base64Encode(pdfBlob.getBytes());
    }

    return {
      success: true,
      emailSent: emailSent,
      pdfBase64: base64,
      filename: pdfFileName,
      delegatesCount: delegatesList.length
    };
  } catch (err) {
    console.error("Error in generateAndSendDelegatesPdf:", err);
    return { success: false, message: err.toString() };
  }
}

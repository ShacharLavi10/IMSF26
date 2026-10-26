let currentGuestEmail = "";
    let globalDirectoryData = [];
    let isCurrentGuestAdmin = false;

    function closeWelcomeModal() {
      document.getElementById("welcome-modal-overlay").style.display = "none";
      localStorage.setItem('welcomeModalSeen_' + currentGuestEmail, 'true');
      setTimeout(checkAndPromptPwaInstall, 400);
    }

    function checkSessionOnLoad() {
      const tabAdminInit = document.getElementById("tab-admin");
      if (tabAdminInit) tabAdminInit.style.display = "none";

      const token = localStorage.getItem('guestSessionToken');
      if (token) {
        document.getElementById("email-step").style.display = "none";
        
        const cached = localStorage.getItem('swr_portalData_' + token);
        if (cached) {
          try {
            const parsedCached = JSON.parse(cached);
            isCurrentGuestAdmin = !!(parsedCached && parsedCached.guestInfo && (parsedCached.guestInfo.isAdmin === true || parsedCached.guestInfo.role === 'הפקה חשיפה'));
            const resetBtn = document.getElementById("admin-reset-cache-btn");
            const panelResetBtn = document.getElementById("admin-panel-reset-cache-btn");
            if (resetBtn) resetBtn.style.display = isCurrentGuestAdmin ? "inline-flex" : "none";
            if (panelResetBtn) panelResetBtn.style.display = isCurrentGuestAdmin ? "inline-flex" : "none";
            if (tabAdminInit) tabAdminInit.style.display = isCurrentGuestAdmin ? "flex" : "none";
            onLoginSuccess(parsedCached, true);
          } catch(e) {
            document.getElementById("login-loader").style.display = "block";
          }
        } else {
          document.getElementById("login-loader").style.display = "block";
        }
        
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.success) {
              localStorage.setItem('swr_portalData_' + token, JSON.stringify(res));
            }
            onLoginSuccess(res, false, !!cached);
          })
          .withFailureHandler(function(err) {
            if (!cached) onLoginFailure(err);
          })
          .getGuestPortalData(token);
      }
    }
    
    if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', checkSessionOnLoad);
    }

    function switchCategoryTab(tabName) {
      if (tabName === 'admin' && !isCurrentGuestAdmin) {
        tabName = 'schedule';
      }
      if (tabName === 'flights' || tabName === 'hotels') {
        tabName = 'mytrip';
      }
      const tabs = ['admin', 'schedule', 'mytrip', 'guide', 'directory', 'artists'];
      tabs.forEach(t => {
        const btn = document.getElementById('tab-' + t);
        const card = document.getElementById(t + '-card');
        if (btn) {
          if (t === tabName) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            // Smoothly align selected tab into view on mobile horizontally
            try {
              btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch (e) {}
          } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
          }
        }
        if (card) {
          card.style.display = (t === tabName) ? 'block' : 'none';
        }
        if (t === 'admin' && tabName === 'admin') {
          if (isCurrentGuestAdmin) {
            loadAdminDashboard();
          }
        }
        if (t === 'guide' && tabName === 'guide') {
          const isPending = document.getElementById('guide-pending-container') && document.getElementById('guide-pending-container').style.display === 'block';
          if (!isPending) {
            if (guideDataCache) {
              renderGuideCityContent(currentGuideCity);
            }
            fetchGuideData();
          }
        }
        if (t === 'artists' && tabName === 'artists') {
          if (typeof fetchGuestArtistFeedback === 'function') {
            fetchGuestArtistFeedback();
          }
          if (typeof updateTimetableFavCount === 'function') {
            updateTimetableFavCount();
          }
          if (typeof currentArtistsSubTab !== 'undefined' && currentArtistsSubTab === 'timetable' && typeof renderTimetableShows === 'function') {
            renderTimetableShows();
          }
        }
      });
    }

    function requestOTP() {
      const emailInput = document.getElementById("guest-email").value.trim();
      const errorDiv = document.getElementById("login-error");
      const loader = document.getElementById("login-loader");
      const reqBtn = document.querySelector('#email-step .primary');
      
      errorDiv.style.display = "none";
      
      if (!emailInput) {
        errorDiv.innerText = "Please enter your email address.";
        errorDiv.style.display = "block";
        return;
      }
      
      if (reqBtn) reqBtn.disabled = true;
      loader.style.display = "block";
      google.script.run
        .withSuccessHandler(function(response) {
          loader.style.display = "none";
          if (reqBtn) reqBtn.disabled = false;
          if (!response.success) {
            errorDiv.innerText = response.message || "Email not registered.";
            errorDiv.style.display = "block";
            return;
          }
          document.getElementById("email-step").style.display = "none";
          document.getElementById("otp-step").style.display = "block";
        })
        .withFailureHandler(function(err) {
          loader.style.display = "none";
          if (reqBtn) reqBtn.disabled = false;
          errorDiv.innerText = "Error: " + err.message;
          errorDiv.style.display = "block";
        })
        .generateOTP(emailInput);
    }
    
    function verifyOTP() {
      const emailInput = document.getElementById("guest-email").value.trim();
      const otpInput = document.getElementById("guest-otp").value.trim();
      const errorDiv = document.getElementById("login-error");
      const loader = document.getElementById("login-loader");
      const verifyBtn = document.querySelector('#otp-step .primary');
      
      errorDiv.style.display = "none";
      
      if (!otpInput) {
        errorDiv.innerText = "Please enter the code.";
        errorDiv.style.display = "block";
        return;
      }
      
      if (verifyBtn) verifyBtn.disabled = true;
      loader.style.display = "block";
      google.script.run
        .withSuccessHandler(function(response) {
          if (!response.success) {
            loader.style.display = "none";
            if (verifyBtn) verifyBtn.disabled = false;
            errorDiv.innerText = response.message || "Invalid code.";
            errorDiv.style.display = "block";
            return;
          }
          
          // Code is valid! Save token and load data.
          localStorage.setItem('guestSessionToken', response.token);
          google.script.run
            .withSuccessHandler(function(res) {
              if (verifyBtn) verifyBtn.disabled = false;
              if (res && res.success) {
                localStorage.setItem('swr_portalData_' + response.token, JSON.stringify(res));
              }
              onLoginSuccess(res, false);
            })
            .withFailureHandler(function(err) {
              if (verifyBtn) verifyBtn.disabled = false;
              onLoginFailure(err);
            })
            .getGuestPortalData(response.token);
        })
        .withFailureHandler(function(err) {
          loader.style.display = "none";
          if (verifyBtn) verifyBtn.disabled = false;
          errorDiv.innerText = "Error: " + err.message;
          errorDiv.style.display = "block";
        })
        .verifyOTP(emailInput, otpInput);
    }

    function resetLogin() {
      document.getElementById("email-step").style.display = "block";
      document.getElementById("otp-step").style.display = "none";
      document.getElementById("guest-otp").value = "";
      document.getElementById("login-error").style.display = "none";
      isCurrentGuestAdmin = false;
      const tabAdmin = document.getElementById("tab-admin");
      if (tabAdmin) tabAdmin.style.display = "none";
      const adminCard = document.getElementById("admin-card");
      if (adminCard) adminCard.style.display = "none";
      const resetBtn = document.getElementById("admin-reset-cache-btn");
      if (resetBtn) resetBtn.style.display = "none";
      const panelResetBtn = document.getElementById("admin-panel-reset-cache-btn");
      if (panelResetBtn) panelResetBtn.style.display = "none";
    }

    function onLoginSuccess(response, isFromCache = false, isBackgroundUpdate = false) {
      if (!isFromCache) console.log("Fresh data loaded from server.");
      else console.log("Loaded from cache instantly.");
      
      document.getElementById("login-loader").style.display = "none";
      if (!response.success) {
        const errorDiv = document.getElementById("login-error");
        errorDiv.innerText = response.message || "Email not registered.";
        errorDiv.style.display = "block";
        
        if (response.sessionExpired) {
          localStorage.removeItem('guestSessionToken');
          localStorage.removeItem('swr_portalData_' + localStorage.getItem('guestSessionToken'));
          resetLogin();
        }
        
        if (response.notFound) {
          google.script.run.notifyTeamUnregistered(document.getElementById("guest-email").value.trim());
        }
        return;
      }
      currentGuestEmail = response.guestInfo.email;
      
      isCurrentGuestAdmin = !!(response.guestInfo && (response.guestInfo.isAdmin === true || response.guestInfo.role === 'הפקה חשיפה'));
      
      const resetBtn = document.getElementById("admin-reset-cache-btn");
      const panelResetBtn = document.getElementById("admin-panel-reset-cache-btn");
      if (resetBtn) resetBtn.style.display = isCurrentGuestAdmin ? "inline-flex" : "none";
      if (panelResetBtn) panelResetBtn.style.display = isCurrentGuestAdmin ? "inline-flex" : "none";

      const tabAdmin = document.getElementById("tab-admin");
      if (tabAdmin) {
        tabAdmin.style.display = isCurrentGuestAdmin ? "flex" : "none";
      }

      const adminCard = document.getElementById("admin-card");
      if (adminCard && !isCurrentGuestAdmin) {
        adminCard.style.display = "none";
      }

      document.getElementById("login-section").style.display = "none";
      
      const portalContent = document.getElementById("portal-content");
      portalContent.style.display = "block";
      
      const isComplete = response.isComplete;
      
      if (isComplete) {
        // Show Welcome Modal only once
        if (!localStorage.getItem('welcomeModalSeen_' + currentGuestEmail)) {
          console.log("Showing welcome modal to user: " + response.guestInfo.firstName);
          document.getElementById("welcome-modal-title").innerText = `Welcome, ${response.guestInfo.firstName}`;
          document.getElementById("welcome-modal-overlay").style.display = "flex";
        } else {
          setTimeout(checkAndPromptPwaInstall, 1200);
        }

        const displayName = response.guestInfo.firstName || response.guestInfo.name || response.guestInfo["שם פרטי"] || "";

        document.getElementById("hello-message").innerText = displayName ? `Hello ${displayName}` : `Hello`;
        document.getElementById("welcome-message").innerText = `Welcome to your Personal Page`;
        
        // Populate Personal Message
        const pmCard = document.getElementById("personal-message-card");
        if (pmCard) {
          if (response.guestInfo.personalMessage && response.guestInfo.personalMessage.trim()) {
            document.getElementById("personal-message-text").innerText = response.guestInfo.personalMessage.trim();
            pmCard.style.display = "block";
          } else {
            pmCard.style.display = "none";
          }
        }
        
        // Hide missing details cards
        if (document.getElementById("general-alert-card")) document.getElementById("general-alert-card").style.display = "none";
        if (document.getElementById("missing-hotel-card")) document.getElementById("missing-hotel-card").style.display = "none";
        if (document.getElementById("missing-flight-card")) document.getElementById("missing-flight-card").style.display = "none";
        document.getElementById("bio-card").style.display = "none";
        document.getElementById("passport-card").style.display = "none";
        document.getElementById("photo-card").style.display = "none";
        
        const navWrapper = document.getElementById("category-nav-wrapper");
        if (navWrapper) navWrapper.style.display = "flex";
        
        const restoreTab = sessionStorage.getItem('imsf_restore_tab');
        if (restoreTab) {
          sessionStorage.removeItem('imsf_restore_tab');
          if (restoreTab === 'admin' && !isCurrentGuestAdmin) {
            switchCategoryTab('schedule');
          } else {
            switchCategoryTab(restoreTab);
          }
        } else {
          let hasActiveTab = document.querySelector('#category-nav-wrapper button.active');
          if (!isBackgroundUpdate || !hasActiveTab) {
            switchCategoryTab('schedule');
          }
        }
        
        // Show toast if cache was just reset
        if (sessionStorage.getItem('imsf_cache_reset_toast')) {
          sessionStorage.removeItem('imsf_cache_reset_toast');
          setTimeout(() => showToast("✨ Cache reset! Loaded fresh data."), 300);
        }
        
        // Start live updates polling & fetch schedule
        startLiveUpdatesPolling();
      } else {
        const displayName = response.guestInfo.firstName || response.guestInfo.name || response.guestInfo["שם פרטי"] || "";

        document.getElementById("hello-message").innerText = displayName ? `Hello ${displayName}` : `Hello`;
        document.getElementById("welcome-message").innerText = `Please Complete Your Accommodation & Flight Details`;
        const navWrapper = document.getElementById("category-nav-wrapper");
        if (navWrapper) navWrapper.style.display = "none";

        // Populate Personal Message
        const pmCard = document.getElementById("personal-message-card");
        if (pmCard) {
          if (response.guestInfo.personalMessage && response.guestInfo.personalMessage.trim()) {
            document.getElementById("personal-message-text").innerText = response.guestInfo.personalMessage.trim();
            pmCard.style.display = "block";
          } else {
            pmCard.style.display = "none";
          }
        }

        
        // Hide all regular content cards
        if (document.getElementById("schedule-card")) document.getElementById("schedule-card").style.display = "none";
        if (document.getElementById("mytrip-card")) document.getElementById("mytrip-card").style.display = "none";
        if (document.getElementById("guide-card")) document.getElementById("guide-card").style.display = "none";
        if (document.getElementById("directory-card")) document.getElementById("directory-card").style.display = "none";
        if (document.getElementById("artists-card")) document.getElementById("artists-card").style.display = "none";
        
        // Set forms links
        if (document.getElementById("link-hotel-form")) document.getElementById("link-hotel-form").href = response.forms.HOTEL;
        if (document.getElementById("link-flight-form")) document.getElementById("link-flight-form").href = response.forms.FLIGHTS;
        
        // General Alert
        const alertCard = document.getElementById("general-alert-card");
        if (alertCard) {
          if (response.checklist.generalMissing) {
            alertCard.style.display = "block";
            const formContainer = document.getElementById("general-missing-form");
            if (formContainer) {
              const items = response.checklist.generalMissingItems || ["Missing information required"];
              let html = "";
              items.forEach((item, index) => {
                html += `
                  <div class="input-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.85rem; font-weight: 500; margin-bottom: 0.25rem;">${item}</label>
                    <input type="text" class="missing-item-answer" data-question="${item.replace(/"/g, '&quot;')}" placeholder="Your answer...">
                  </div>
                `;
              });
              formContainer.innerHTML = html;
            }
          } else {
            alertCard.style.display = "none";
          }
        }
        
        // Forms logic
        const missingHotelCard = document.getElementById("missing-hotel-card");
        const missingFlightCard = document.getElementById("missing-flight-card");
        const bioCard = document.getElementById("bio-card");
        const photoCard = document.getElementById("photo-card");
        const passportCard = document.getElementById("passport-card");
        
        if (!response.checklist.hasHotelForm) {
          if (missingHotelCard) missingHotelCard.style.display = "block";
          bioCard.style.display = "none";
          photoCard.style.display = "none";
        } else {
          if (missingHotelCard) missingHotelCard.style.display = "none";
          bioCard.style.display = response.checklist.hasBio ? "none" : "block";
          if (!response.checklist.hasBio && response.guestInfo.bio) {
            document.getElementById("bio-input").value = response.guestInfo.bio;
          }
          photoCard.style.display = response.checklist.hasPhoto ? "none" : "block";
        }
        
        if (!response.checklist.hasFlightForm) {
          if (missingFlightCard) missingFlightCard.style.display = "block";
          passportCard.style.display = "none";
        } else {
          if (missingFlightCard) missingFlightCard.style.display = "none";
          passportCard.style.display = response.checklist.hasPassport ? "none" : "block";
        }

        if (isUserAdmin) {
          startLiveUpdatesPolling();
          if (sessionStorage.getItem('imsf_cache_reset_toast')) {
            sessionStorage.removeItem('imsf_cache_reset_toast');
            setTimeout(() => showToast("✨ Cache reset! Loaded fresh data."), 300);
          }
        }
      }
      if (response.checklist.approvalSchedule) {
        if (response.scheduleData) {
          scheduleDataCache = response.scheduleData;
          const loader = document.getElementById('schedule-loader-container');
          if (loader) loader.style.display = 'none';
          renderScheduleTabs();
        } else {
          const loader = document.getElementById('schedule-loader-container');
          if (loader) loader.style.display = 'none';
          document.getElementById('schedule-container').innerHTML = '<p class="empty-state">Itinerary will be published here.</p>';
        }
        document.getElementById("schedule-days-nav").style.display = "flex";
        document.getElementById("schedule-container").style.display = "block";
        document.getElementById("schedule-pending-container").style.display = "none";
      } else {
        document.getElementById("schedule-days-nav").style.display = "none";
        document.getElementById("schedule-container").style.display = "none";
        document.getElementById("schedule-pending-container").style.display = "block";
      }

      if (response.checklist.approvalFlights) {
        document.getElementById("flights-container").style.display = "block";
        document.getElementById("flights-pending-container").style.display = "none";
        renderBoardingPassData("flights-container", response.flightsData, "Flight itinerary pending confirmation.");
      } else {
        document.getElementById("flights-container").style.display = "none";
        document.getElementById("flights-pending-container").style.display = "block";
      }

      if (response.checklist.approvalHotels) {
        document.getElementById("hotels-container").style.display = "grid";
        document.getElementById("hotels-pending-container").style.display = "none";
        renderHotelData(response.hotelJerusalemData, response.hotelTelAvivData, response.hotelLinks);
      } else {
        document.getElementById("hotels-container").style.display = "none";
        document.getElementById("hotels-pending-container").style.display = "block";
      }

      if (response.checklist.approvalDirectory) {
        document.getElementById("directory-main-container").style.display = "block";
        document.getElementById("directory-pending-container").style.display = "none";
        renderDirectory(response.allGuestsDirectory);
      } else {
        document.getElementById("directory-main-container").style.display = "none";
        document.getElementById("directory-pending-container").style.display = "block";
      }

      if (response.checklist.approvalArtists) {
        document.getElementById("artists-container").style.display = "block";
        document.getElementById("artists-pending-container").style.display = "none";
        // Fetch only if approved to avoid unnecessary requests and endless loading if the tab is hidden
        fetchArtistsData();
      } else {
        document.getElementById("artists-container").style.display = "none";
        document.getElementById("artists-pending-container").style.display = "block";
      }

      // Initialize Guide Data & Approval
      const guidePills = document.getElementById("guide-pills-nav");
      const guideContainer = document.getElementById("guide-container");
      const guidePending = document.getElementById("guide-pending-container");

      if (response.checklist.approvalGuide) {
        if (guidePills) guidePills.style.display = "flex";
        if (guideContainer) guideContainer.style.display = "block";
        if (guidePending) guidePending.style.display = "none";
        
        let validGuideData = response.guideData;
        if (validGuideData && validGuideData.items) {
          const links = validGuideData.items.filter(it => it.link);
          const hasLabels = links.some(it => typeof it.linkLabel !== 'undefined');
          if (links.length > 0 && !hasLabels) {
            validGuideData = null;
          }
        }

        if (validGuideData) {
          initGuide(validGuideData);
        } else {
          fetchGuideData();
        }
      } else {
        if (guidePills) guidePills.style.display = "none";
        if (guideContainer) guideContainer.style.display = "none";
        if (guidePending) guidePending.style.display = "block";
      }
    }

    function onLoginFailure(err) {
      document.getElementById("login-loader").style.display = "none";
      const errorDiv = document.getElementById("login-error");
      errorDiv.innerText = "Connection error: " + err.message;
      errorDiv.style.display = "block";
    }


    function formatDateOnly(dateStr) {
      if (!dateStr) return '';
      // If it looks like a full date string, parse it
      const d = new Date(dateStr);
      if (!isNaN(d.getTime()) && dateStr.toString().length > 10) {
        return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
      }
      return dateStr;
    }

    function renderTableData(containerId, dataArray, emptyText) {
      const container = document.getElementById(containerId);
      if (!dataArray || dataArray.length === 0) {
        container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
        return;
      }
      let html = `<div class="info-list">`;
      dataArray.forEach(item => {
        if (item.value && item.value.trim() !== "") {
          let displayVal = item.value;
          if (item.label.toLowerCase().includes('date') || item.label.toLowerCase().includes('תאריך')) {
            displayVal = formatDateOnly(item.value);
          }
          html += `
            <div class="info-row">
              <span class="info-label">${item.label}</span>
              <span class="info-value">${displayVal}</span>
            </div>
          `;
        }
      });
      html += `</div>`;
      container.innerHTML = html;
    }

    function parseTicketLinks(rawVal) {
      if (!rawVal) return [];
      const text = String(rawVal).trim();
      if (!text || text === '-' || /^#|^=/i.test(text) || /^n\/?a$/i.test(text) || /^none$/i.test(text) || /^null$/i.test(text)) {
        return [];
      }

      const urlRegex = /https?:\/\/[^\s"',;<>]+/gi;
      const matches = text.match(urlRegex) || [];

      if (matches.length === 0) {
        const driveIdMatch = text.match(/[-\w]{25,}/);
        if (driveIdMatch) {
          return [{ url: `https://drive.google.com/file/d/${driveIdMatch[0]}/view`, type: 'single', label: 'View E-Ticket (PDF)' }];
        }
        return [];
      }

      // Clean trailing punctuation
      const urls = matches.map(u => u.replace(/[.,;)]+$/, '')).filter(Boolean);

      if (urls.length === 1) {
        return [{ url: urls[0], type: 'single', label: 'View E-Ticket (PDF)' }];
      }

      // 2 or more links
      const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
      let inboundUrl = null;
      let outboundUrl = null;

      lines.forEach(line => {
        const lineUrls = line.match(urlRegex) || [];
        if (lineUrls.length > 0) {
          const u = lineUrls[0].replace(/[.,;)]+$/, '');
          const lower = line.toLowerCase();
          if (lower.includes('חזור') || lower.includes('outbound') || lower.includes('return') || lower.includes('departure') || lower.includes('from tlv') || lower.includes('יציאה')) {
            outboundUrl = u;
          } else if (lower.includes('הלוך') || lower.includes('inbound') || lower.includes('arrival') || lower.includes('to tlv') || lower.includes('הגעה')) {
            inboundUrl = u;
          }
        }
      });

      if (!inboundUrl || !outboundUrl || inboundUrl === outboundUrl) {
        inboundUrl = urls[0];
        outboundUrl = urls[1];
      }

      return [
        { url: inboundUrl, type: 'inbound', label: 'Inbound Ticket (PDF)' },
        { url: outboundUrl, type: 'outbound', label: 'Outbound Ticket (PDF)' }
      ];
    }

    function renderTicketButtonsHtml(ticketLink) {
      const tickets = parseTicketLinks(ticketLink);
      if (!tickets || tickets.length === 0) return '';

      if (tickets.length === 1) {
        return `
          <div style="display: flex; justify-content: center; margin-bottom: 15px;">
            <a href="${tickets[0].url}" target="_blank" rel="noopener noreferrer" class="primary" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; font-size: 1.05rem; border-radius: 8px; background: var(--accent); color: #fff; font-weight: bold;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              View E-Ticket (PDF)
            </a>
          </div>
        `;
      }

      return `
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
          ${tickets.map(t => `
            <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="primary" style="flex: 1 1 calc(50% - 6px); min-width: 140px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 10px; font-size: 0.95rem; border-radius: 8px; background: var(--accent); color: #fff; font-weight: bold; text-align: center; box-sizing: border-box;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span>${t.label}</span>
            </a>
          `).join('')}
        </div>
      `;
    }

    function renderBoardingPassData(containerId, dataArray, emptyText) {
      const container = document.getElementById(containerId);
      if (!dataArray || dataArray.length === 0) {
        container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
        return;
      }
      
      let arrival = "TBD", arrivalTime = "", arrivalFlight = "", arrivalAirline = "", origin = "TBD";
      let departure = "TBD", departureTime = "", departureFlight = "", departureAirline = "", dest = "TBD";
      let ticketLink = null, shuttle = null, togetherWith = null;
      
      function formatFlightDate(dStr) {
        if (!dStr) return '';
        const d = new Date(dStr);
        if (!isNaN(d.getTime()) && dStr.toString().length > 5) {
          return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
        return dStr;
      }

      function formatFlightTime(tStr) {
        if (!tStr) return '';
        const str = String(tStr).trim();
        if (!str || str === '-' || /^#|^=/i.test(str) || /^n\/?a$/i.test(str) || /^null$/i.test(str)) return '';
        
        // 12-hour AM/PM format
        const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
        if (ampmMatch) {
          let hours = parseInt(ampmMatch[1], 10);
          const minutes = ampmMatch[2];
          const period = ampmMatch[3].toUpperCase();
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return `${String(hours).padStart(2, '0')}:${minutes}`;
        }

        // 24-hour format
        const timeMatch = str.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
        if (timeMatch) {
          return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        }
        
        // Handle Google Sheets decimal time format (e.g. 0.6041666667)
        const num = Number(str);
        if (!isNaN(num) && num > 0 && num < 1) {
           const totalMinutes = Math.round(num * 24 * 60);
           const hh = Math.floor(totalMinutes / 60) % 24;
           const mm = totalMinutes % 60;
           return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }
        
        return str;
      }

      function formatShuttleTime(val) {
        if (val === null || val === undefined) return '';
        const str = String(val).trim();
        if (!str || str === '-' || /^#|^=/i.test(str) || /^n\/?a$/i.test(str) || /^none$/i.test(str) || /^null$/i.test(str)) {
          return '';
        }

        // If it's a date-only string like 30/12/1899 or contains 1899 without time, reject it!
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
          return '';
        }
        if (str.includes('1899') && !str.includes('T') && !str.includes(':')) {
          return '';
        }

        // 1. Handle 12-hour format e.g. "4:00 PM", "04:30 pm", "4:00:00 PM"
        const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
        if (ampmMatch) {
          let hours = parseInt(ampmMatch[1], 10);
          const minutes = ampmMatch[2];
          const period = ampmMatch[3].toUpperCase();
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return `${String(hours).padStart(2, '0')}:${minutes}`;
        }

        // 2. Handle 24-hour format e.g. "16:00", "09:15", "16:00:00"
        const timeMatch = str.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
        if (timeMatch) {
          return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        }

        // 3. Handle Date parsing e.g. ISO string or "1899-12-30T13:39:20.000Z"
        if (str.includes('T') || (str.includes('-') && str.length > 10)) {
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
          }
        }

        // 4. Handle Google Sheets decimal time fraction (e.g. 0.6666667 => 16:00)
        const num = Number(str);
        if (!isNaN(num) && num > 0 && num < 1) {
          const totalMinutes = Math.round(num * 24 * 60);
          const hh = Math.floor(totalMinutes / 60) % 24;
          const mm = totalMinutes % 60;
          return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }

        // 5. Handle integer/float hours e.g. 16 or 16.5
        if (!isNaN(num) && num >= 0 && num < 24 && !str.includes(':')) {
          const hours = Math.floor(num);
          const minutes = Math.round((num - hours) * 60);
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        // Reject any leftover dates or strings containing 1899
        if (str.includes('1899') || str.includes('/')) {
          return '';
        }

        return str;
      }

      dataArray.forEach(item => {
        const lbl = String(item.label || "").trim().toLowerCase();
        
        if (lbl === "arrival date") arrival = formatFlightDate(item.value);
        if (lbl === "arrival time") arrivalTime = formatFlightTime(item.value);
        if (lbl === "arrival flight") arrivalFlight = item.value;
        if (lbl === "arrival airline") arrivalAirline = item.value;
        if (lbl === "origin / from" || lbl === "origin" || lbl.startsWith("origin") || lbl.includes("מוצא") || lbl.includes("הגעה")) origin = item.value;
        
        if (lbl === "departure date") departure = formatFlightDate(item.value);
        if (lbl === "departure time") departureTime = formatFlightTime(item.value);
        if (lbl === "departure flight") departureFlight = item.value;
        if (lbl === "departure airline") departureAirline = item.value;
        if (lbl === "destination / to" || lbl === "destination" || lbl.startsWith("destination") || lbl.includes("יעד חזרה") || (lbl.includes("חזרה") && !lbl.includes("תאריך") && !lbl.includes("שעת"))) dest = item.value;
        
        if (lbl === "shuttle" || lbl.includes("shuttle") || lbl.includes("שאטל") || lbl.includes("הסעה")) shuttle = item.value;
        if (lbl === "together with" || lbl.startsWith("together") || lbl.includes("ביחד") || lbl.includes("יחד") || lbl.includes("נוסע") || lbl.includes("שותפ") || lbl.includes("passengers")) togetherWith = item.value;
        if (lbl === "final ticket link" || lbl.includes("ticket link") || lbl.includes("כרטיס")) ticketLink = item.value;
      });

      const formattedShuttle = formatShuttleTime(shuttle);
      const hasShuttle = formattedShuttle !== "";

      const cleanTogetherWith = togetherWith ? String(togetherWith).trim() : "";
      const hasTogetherWith = cleanTogetherWith !== "" && 
                              !cleanTogetherWith.startsWith("#") && 
                              !cleanTogetherWith.startsWith("=") && 
                              !/^n\/?a$/i.test(cleanTogetherWith) && 
                              !/^none$/i.test(cleanTogetherWith) && 
                              !/^null$/i.test(cleanTogetherWith) && 
                              cleanTogetherWith !== "-";

      const togetherNames = hasTogetherWith
        ? cleanTogetherWith
            .split(/[,;\n+&،/]+|\s+and\s+|\s+וגם\s+/i)
            .map(n => n.trim())
            .filter(n => n && !/^n\/?a$/i.test(n) && !/^none$/i.test(n) && !/^null$/i.test(n) && n !== "-")
        : [];

      let html = '';

      if (ticketLink) {
        html += renderTicketButtonsHtml(ticketLink);
      }

      html += `
        <div class="boarding-pass" style="margin-bottom: 12px;">
          <div class="bp-header">
            <span>OFFICIAL ITINERARY</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M21,16v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/></svg>
          </div>
          <div class="bp-body">
            <div class="bp-flight">
              <div class="bp-label" style="display: flex; justify-content: space-between;">
                <span>INBOUND TO ISRAEL</span>
                ${arrivalFlight ? `<span style="font-weight:bold; color:var(--accent);">${arrivalFlight}</span>` : ''}
              </div>
              <div class="bp-route">
                <span class="bp-city">${origin}</span>
                <span class="bp-arrow">→</span>
                <span class="bp-city">TLV</span>
              </div>
              <div class="bp-date" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span>${arrivalAirline ? arrivalAirline + ' | ' : ''}${arrival} ${arrivalTime ? '- ' + arrivalTime : ''}</span>
              </div>
            </div>

            <div class="bp-divider"></div>
            <div class="bp-flight">
              <div class="bp-label" style="display: flex; justify-content: space-between;">
                <span>OUTBOUND FROM ISRAEL</span>
                ${departureFlight ? `<span style="font-weight:bold; color:var(--accent);">${departureFlight}</span>` : ''}
              </div>
              <div class="bp-route">
                <span class="bp-city">TLV</span>
                <span class="bp-arrow">→</span>
                <span class="bp-city">${dest}</span>
              </div>
              <div class="bp-date" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span>${departureAirline ? departureAirline + ' | ' : ''}${departure} ${departureTime ? '- ' + departureTime : ''}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Shuttle Information Rubric (shown if shuttle is assigned or fellow passengers are scheduled)
      if (hasShuttle || togetherNames.length > 0) {
        const isTimeOnly = /^\d{2}:\d{2}$/.test(formattedShuttle);
        let shuttleTextHtml = '';
        if (hasShuttle) {
          shuttleTextHtml = isTimeOnly
            ? `You are on the shuttle from Ben Gurion airport leaving at <strong>${formattedShuttle}</strong>.`
            : `You are on the shuttle from Ben Gurion airport: <strong>${formattedShuttle}</strong>.`;
        } else {
          shuttleTextHtml = `You are scheduled on a shuttle from Ben Gurion airport.`;
        }

        const passengersHtml = togetherNames.length > 0 ? `
          <div class="shuttle-passengers-wrap">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--foreground-muted); display: block; margin-bottom: 6px;">
              Together with:
            </span>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${togetherNames.map(name => `
                <button type="button" class="shuttle-passenger-badge" onclick="openPassengerProfile('${escapeHtml(name).replace(/'/g, "\\'")}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <span>${escapeHtml(name)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : '';

        html += `
          <div class="shuttle-info-card">
            <h4 style="margin: 0 0 10px 0; color: var(--accent); display: flex; align-items: center; gap: 8px; font-size: 1.05rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
              Shuttle Information
            </h4>
            <p style="margin: 0; font-size: 0.95rem;">
              ${shuttleTextHtml}
            </p>
            ${passengersHtml}
          </div>
        `;
      }

      container.innerHTML = html;
    }

    function formatHotelDateStrict(raw) {
      if (!raw) return '';
      const s = String(raw).trim();
      if (s === '-' || s.toLowerCase() === 'n/a') return '';
      // If YYYY-MM-DD
      const yyyymmdd = s.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
      if (yyyymmdd) {
        const year = yyyymmdd[1];
        const month = yyyymmdd[2].padStart(2, '0');
        const day = yyyymmdd[3].padStart(2, '0');
        return `${month}/${day}/${year}`;
      }
      // If already DD/MM/YYYY or MM/DD/YYYY
      const slashDate = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
      if (slashDate) {
        const p1 = parseInt(slashDate[1], 10);
        const p2 = parseInt(slashDate[2], 10);
        const year = slashDate[3];
        let day, month;
        if (p1 > 12) {
          // Definitely DD/MM/YYYY
          day = String(p1).padStart(2, '0');
          month = String(p2).padStart(2, '0');
        } else if (p2 > 12) {
          // Definitely MM/DD/YYYY
          month = String(p1).padStart(2, '0');
          day = String(p2).padStart(2, '0');
        } else {
          // Default for Israeli Sheets is DD/MM/YYYY
          day = String(p1).padStart(2, '0');
          month = String(p2).padStart(2, '0');
        }
        return `${month}/${day}/${year}`;
      }
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${month}/${day}/${year}`;
      }
      return s.replace(/\s+00:00.*$/, '').replace(/T00:00.*$/, '');
    }

    function translateRoomType(raw) {
      if (!raw) return '';
      const s = String(raw).trim();
      const lower = s.toLowerCase();
      if (s.includes('יחיד') || lower.includes('single') || lower === 'sgl') {
        return 'Single';
      }
      if (s.includes('זוגי') || lower.includes('double') || lower.includes('twin') || lower === 'dbl') {
        return 'Double';
      }
      return s;
    }

    function renderHotelData(jerusalemData, telAvivData, hotelLinks) {
      const jlmContainer = document.getElementById("hotel-jerusalem-content");
      const tlvContainer = document.getElementById("hotel-telaviv-content");

      // Update Map Links
      const jlmBtn = document.getElementById("hotel-jlm-map-btn");
      const tlvBtn = document.getElementById("hotel-tlv-map-btn");
      let jlmLink = (hotelLinks && hotelLinks.jerusalem) || "";
      let tlvLink = (hotelLinks && hotelLinks.telAviv) || "";

      if ((!jlmLink || !tlvLink) && typeof guideDataCache !== 'undefined' && guideDataCache && guideDataCache.items) {
        guideDataCache.items.forEach(it => {
          const cat = String(it.category || "").toLowerCase();
          const city = String(it.city || "").toLowerCase();
          const name = String(it.name || "").toLowerCase();
          const link = String(it.link || "").trim();
          if ((cat.includes('מלון') || cat.includes('hotel') || name.includes('arthur') || name.includes('cinema')) && link) {
            if (!jlmLink && (city.includes('ירושלים') || city.includes('jerusalem') || name.includes('arthur'))) {
              jlmLink = link;
            }
            if (!tlvLink && (city.includes('תל אביב') || city.includes('tel aviv') || name.includes('cinema'))) {
              tlvLink = link;
            }
          }
        });
      }

      if (jlmBtn && jlmLink) jlmBtn.href = jlmLink;
      if (tlvBtn && tlvLink) tlvBtn.href = tlvLink;

      const buildHotelCard = (dataArray, cityName) => {
        if (!dataArray || !Array.isArray(dataArray)) {
          return `<p class="empty-state">No ${cityName} accommodation details confirmed yet.</p>`;
        }

        const map = {};
        dataArray.forEach(item => {
          if (item && item.label) {
            map[item.label] = item.value;
          }
        });

        const nights = map["Nights Count"] || map["כמות לילות"] || map["Total Nights"] || map["סה\"כ לילות"] || "";
        const arrivalRaw = map["Arrival Date"] || map["תאריך הגעה"] || "";
        const departureRaw = map["Departure Date"] || map["תאריך יציאה"] || map["תאריך עזיבה"] || "";
        const roomTypeRaw = map["Room Type"] || map["סוג חדר"] || "";

        const arrivalFormatted = formatHotelDateStrict(arrivalRaw);
        const departureFormatted = formatHotelDateStrict(departureRaw);
        const roomTypeFormatted = translateRoomType(roomTypeRaw);

        const hasDetails = (nights && String(nights).trim() !== "") || 
                           (arrivalFormatted && arrivalFormatted.trim() !== "") ||
                           (departureFormatted && departureFormatted.trim() !== "") ||
                           (roomTypeFormatted && roomTypeFormatted.trim() !== "");

        if (!hasDetails) {
          return `<p class="empty-state">No ${cityName} accommodation details confirmed yet.</p>`;
        }

        return `
          <div class="hotel-spec-card">
            <div class="hotel-spec-row">
              <span class="hotel-spec-label">Nights Count</span>
              <span class="hotel-spec-value">${nights ? `${nights}` : '—'}</span>
            </div>
            <div class="hotel-spec-row">
              <span class="hotel-spec-label">Arrival Date</span>
              <span class="hotel-spec-value">${arrivalFormatted || '—'}</span>
            </div>
            <div class="hotel-spec-row">
              <span class="hotel-spec-label">Departure Date</span>
              <span class="hotel-spec-value">${departureFormatted || '—'}</span>
            </div>
            <div class="hotel-spec-row">
              <span class="hotel-spec-label">Room Type</span>
              <span class="hotel-spec-value">${roomTypeFormatted || '—'}</span>
            </div>
          </div>
        `;
      };

      if (jlmContainer) jlmContainer.innerHTML = buildHotelCard(jerusalemData, "Jerusalem");
      if (tlvContainer) tlvContainer.innerHTML = buildHotelCard(telAvivData, "Tel Aviv");
    }

    function populateCountries(directoryArray) {
      const countrySelect = document.getElementById('guest-country-filter');
      const currentVal = countrySelect.value;
      const countries = new Set();
      directoryArray.forEach(g => {
        if (g["Country"]) countries.add(g["Country"].trim());
      });
      const sortedCountries = Array.from(countries).filter(c => c).sort();
      
      let html = '<option value="All">All Countries</option>';
      sortedCountries.forEach(c => {
        html += `<option value="${c}">${c}</option>`;
      });
      countrySelect.innerHTML = html;
      
      if (sortedCountries.includes(currentVal)) {
        countrySelect.value = currentVal;
      }
    }

    function filterDirectory() {
      const searchTxt = document.getElementById('guest-search').value.toLowerCase().trim();
      const clearBtn = document.getElementById('clear-search-btn');
      if (searchTxt) {
        clearBtn.style.display = "flex";
      } else {
        clearBtn.style.display = "none";
      }
      
      const genreVal = document.getElementById('guest-genre-filter').value;
      const countryVal = document.getElementById('guest-country-filter').value;
      
      const filtered = globalDirectoryData.filter(guest => {
        // Match Search
        const searchStr = `${guest["First Name"] || ""} ${guest["Last Name"] || ""} ${guest["Company / Organization"] || ""} ${guest["Role / Title"] || ""} ${guest["Country"] || ""} ${guest["Biography"] || ""} ${guest["Genre / Style"] || ""}`.toLowerCase();
        const matchesSearch = !searchTxt || searchStr.includes(searchTxt);
        
        // Match Genre
        let matchesGenre = true;
        const guestGenre = (guest["Genre / Style"] || "").toLowerCase();
        if (genreVal !== "All") {
          if (guestGenre.includes("both") || guestGenre.includes("all")) {
            matchesGenre = true;
          } else {
            matchesGenre = guestGenre.includes(genreVal.split('/')[0].toLowerCase().trim()) || 
                           guestGenre.includes(genreVal.toLowerCase().trim());
          }
        }
        
        // Match Country
        let matchesCountry = true;
        const guestCountry = (guest["Country"] || "").trim();
        if (countryVal !== "All") {
          matchesCountry = (guestCountry === countryVal);
        }
        
        return matchesSearch && matchesGenre && matchesCountry;
      });
      
      renderDirectoryCards(filtered);
      
      const statusDiv = document.getElementById('directory-status');
      statusDiv.innerHTML = `Showing ${filtered.length} of ${globalDirectoryData.length} delegates`;
      if (filtered.length < globalDirectoryData.length) {
        statusDiv.innerHTML += ` &nbsp;&middot;&nbsp; <a href="javascript:void(0)" onclick="resetFilters()" style="color: var(--accent); text-decoration: none; font-weight: 500;">Clear</a>`;
      }
    }

    function clearSearch() {
      document.getElementById('guest-search').value = "";
      filterDirectory();
    }
    
    function resetFilters() {
      document.getElementById('guest-search').value = "";
      document.getElementById('guest-genre-filter').value = "All";
      document.getElementById('guest-country-filter').value = "All";
      filterDirectory();
    }

    function renderDirectory(directoryArray) {
      globalDirectoryData = (directoryArray || []).filter(guest => {
        const guestEmail = String(guest["Email"] || "").trim();
        const guestRole = String(guest["Role / Title"] || "").trim();
        return guestEmail !== "" && guestRole !== "הפקה חשיפה" && Boolean((guest["First Name"] || "").trim() || (guest["Last Name"] || "").trim());
      });
      const container = document.getElementById("directory-container");
      
      if (globalDirectoryData.length === 0) {
        container.innerHTML = `<p class="empty-state">Delegate directory available soon.</p>`;
        return;
      }
      
      document.getElementById('directory-filters').style.display = "flex";
      document.getElementById('directory-status').style.display = "block";
      
      populateCountries(globalDirectoryData);
      filterDirectory();
    }

    function getThumbnailUrl(url) {
      if (url && url.includes("drive.google.com")) {
        const match = url.match(/[-\w]{25,}/);
        if (match) {
          return "https://drive.google.com/thumbnail?id=" + match[0] + "&sz=w800";
        }
      }
      return url;
    }

    function renderDirectoryCards(filteredArray) {
      const container = document.getElementById("directory-container");
      if (filteredArray.length === 0) {
        container.innerHTML = `
          <div class="empty-category-card" style="grid-column: 1 / -1; min-height: 200px;">
            <svg class="empty-category-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div class="empty-category-title">No delegates match your filters</div>
            <button class="secondary" onclick="resetFilters()" style="width: auto; margin-top: 10px; min-height: 38px; font-size: 0.85rem;">Clear Filters</button>
          </div>
        `;
        return;
      }
      
      let html = '';
      filteredArray.forEach((guest, idx) => {
        let genreText = guest["Genre / Style"] || "";
        if (genreText.toLowerCase().includes("both")) genreText = "All Genres";
        
        const photoUrl = guest["Photo"] ? getThumbnailUrl(guest["Photo"]) : '';
        const fullName = `${guest["First Name"] || ""} ${guest["Last Name"] || ""}`.trim();
        const country = guest["Country"] || "N/A";
        
        // Pass index to openGuestSheet so we can easily find the guest in globalDirectoryData
        const originalIndex = globalDirectoryData.indexOf(guest);
        
        const bgStyle = photoUrl ? `background-image: url('${photoUrl}')` : `background-color: #000`;
        
        html += `
          <div class="artist-card" style="${bgStyle}" onclick="openGuestSheet(${originalIndex})">
            <div class="artist-card-overlay">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
                <div class="artist-card-name" style="margin-bottom: 0;">${fullName}</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="color: #fff; font-size: 0.8rem; font-weight: 500; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${country}</div>
                <div style="color: #fff; font-size: 0.75rem; font-weight: 400; text-shadow: 0 1px 3px rgba(0,0,0,0.8); opacity: 0.9;">${genreText}</div>
              </div>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
      container.className = "artists-grid";
    }

    function openGuestSheet(target) {
      const sheetEl = document.getElementById('guest-bottom-sheet');
      if (sheetEl) {
        sheetEl.scrollTop = 0;
        const sheetContentEl = sheetEl.querySelector('.sheet-content');
        if (sheetContentEl) sheetContentEl.scrollTop = 0;
      }

      let guest = null;
      if (typeof target === 'number') {
        guest = globalDirectoryData[target];
      } else if (target && typeof target === 'object') {
        guest = target;
      }
      if (!guest) return;
      
      const photoUrl = guest["Photo"] ? getThumbnailUrl(guest["Photo"]) : '';
      const fullName = `${guest["First Name"] || ""} ${guest["Last Name"] || ""}`.trim() || (guest["Email"] || "Guest Profile");
      let genreText = guest["Genre / Style"] || "";
      if (genreText.toLowerCase().includes("both")) genreText = "All Genres";
      
      const imgEl = document.getElementById('sheet-guest-img');
      if (photoUrl) {
        imgEl.style.backgroundImage = `url('${photoUrl}')`;
        imgEl.style.backgroundColor = 'transparent';
      } else {
        imgEl.style.backgroundImage = 'none';
        imgEl.style.backgroundColor = '#000';
      }
      
      document.getElementById('sheet-guest-name').innerText = fullName;
      document.getElementById('sheet-guest-genre').innerText = genreText;
      document.getElementById('sheet-guest-country').innerText = guest["Country"] || "N/A";
      
      document.getElementById('sheet-guest-company').innerText = guest["Company / Organization"] || "Independent";
      document.getElementById('sheet-guest-role').innerText = guest["Role / Title"] || "";
      
      const website = guest["Website"] || "";
      const websiteSection = document.getElementById('sheet-guest-website-section');
      if (website) {
        websiteSection.style.display = 'block';
        const urls = website.split(/\r?\n/).filter(u => u.trim() !== "");
        websiteSection.innerHTML = urls.map(u => {
          const urlStr = u.trim();
          const href = urlStr.startsWith('http') ? urlStr : 'https://' + urlStr;
          return `<a href="${href}" target="_blank" style="color: var(--accent-bright); text-decoration: underline; font-size: 0.9rem; word-break: break-all; display: block; margin-bottom: 4px;">${urlStr}</a>`;
        }).join('');
      } else {
        websiteSection.style.display = 'none';
        websiteSection.innerHTML = '';
      }
      
      document.getElementById('sheet-guest-bio').innerText = guest["Biography"] || "No biography available.";
      
      const email = guest["Email"] || "";
      const emailContainer = document.getElementById('sheet-guest-email-container');
      const emailLink = document.getElementById('sheet-guest-email');
      if (email) {
        emailContainer.style.display = 'block';
        emailLink.href = 'mailto:' + email;
        emailLink.innerText = email;
      } else {
        emailContainer.style.display = 'none';
      }
      
      const phone = guest["Phone"] || "";
      const phoneContainer = document.getElementById('sheet-guest-phone-container');
      const phoneLink = document.getElementById('sheet-guest-phone');
      if (phone) {
        phoneContainer.style.display = 'block';
        let cleanPhone = String(phone).replace(/[^0-9+]/g, '');
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '972' + cleanPhone.substring(1);
        } else {
          cleanPhone = cleanPhone.replace('+', '');
        }
        phoneLink.href = 'https://wa.me/' + cleanPhone;
        phoneLink.innerText = phone;
      } else {
        phoneContainer.style.display = 'none';
      }

      // If an admin sheet is open, ensure guest sheet appears cleanly on top
      const overlayEl = document.getElementById('guest-sheet-overlay');
      const adminSheet = document.getElementById('admin-bottom-sheet');
      if (adminSheet && adminSheet.classList.contains('active')) {
        overlayEl.style.zIndex = '1010';
        sheetEl.style.zIndex = '1011';
      } else {
        overlayEl.style.zIndex = '';
        sheetEl.style.zIndex = '';
      }

      overlayEl.classList.add('active');
      sheetEl.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Reset scroll position to top
      if (sheetEl) {
        sheetEl.scrollTop = 0;
        const sheetContentEl = sheetEl.querySelector('.sheet-content');
        if (sheetContentEl) sheetContentEl.scrollTop = 0;
      }
      requestAnimationFrame(() => {
        if (sheetEl) {
          sheetEl.scrollTop = 0;
          const sheetContentEl = sheetEl.querySelector('.sheet-content');
          if (sheetContentEl) sheetContentEl.scrollTop = 0;
        }
      });
      
      window.location.hash = "guestsheet";
    }

    function closeGuestSheet(isHashChange) {
      const overlayEl = document.getElementById('guest-sheet-overlay');
      const sheetEl = document.getElementById('guest-bottom-sheet');
      if (sheetEl) {
        sheetEl.scrollTop = 0;
        const sheetContentEl = sheetEl.querySelector('.sheet-content');
        if (sheetContentEl) sheetContentEl.scrollTop = 0;
      }
      overlayEl.classList.remove('active');
      sheetEl.classList.remove('active');
      overlayEl.style.zIndex = '';
      sheetEl.style.zIndex = '';
      
      const adminSheet = document.getElementById('admin-bottom-sheet');
      if (!adminSheet || !adminSheet.classList.contains('active')) {
        document.body.style.overflow = '';
      }
      
      if (isHashChange !== true && window.location.hash === "#guestsheet") {
        history.back();
      }
    }

    window.openPassengerProfile = function(passengerName) {
      if (!passengerName) return;
      const cleanQ = String(passengerName).trim();
      if (!cleanQ) return;
      const lowerQ = cleanQ.toLowerCase();

      // 1. Instant match in local globalDirectoryData
      if (Array.isArray(globalDirectoryData) && globalDirectoryData.length > 0) {
        let found = globalDirectoryData.find(g => {
          const fn = String(g["First Name"] || "").trim().toLowerCase();
          const ln = String(g["Last Name"] || "").trim().toLowerCase();
          const full1 = `${fn} ${ln}`.trim();
          const full2 = `${ln} ${fn}`.trim();
          return (full1 && full1 === lowerQ) || (full2 && full2 === lowerQ);
        });

        if (!found) {
          found = globalDirectoryData.find(g => String(g["Email"] || "").trim().toLowerCase() === lowerQ);
        }

        if (!found) {
          found = globalDirectoryData.find(g => String(g["First Name"] || "").trim().toLowerCase() === lowerQ);
        }

        if (!found) {
          found = globalDirectoryData.find(g => {
            const fn = String(g["First Name"] || "").trim().toLowerCase();
            const ln = String(g["Last Name"] || "").trim().toLowerCase();
            const full = `${fn} ${ln}`.trim();
            return full && (full.includes(lowerQ) || lowerQ.includes(full));
          });
        }

        if (found) {
          openGuestSheet(found);
          return;
        }
      }

      // 2. Fallback: Search via backend by name to get email and profile
      if (typeof showToast === 'function') {
        showToast("Opening " + cleanQ + "'s profile...", 1800);
      }

      if (window.google && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.success && res.guest) {
              if (Array.isArray(globalDirectoryData)) {
                globalDirectoryData.push(res.guest);
              }
              openGuestSheet(res.guest);
            } else {
              if (typeof showToast === 'function') {
                showToast("Profile details not found for " + cleanQ);
              }
            }
          })
          .withFailureHandler(function(err) {
            if (typeof showToast === 'function') {
              showToast("Error loading passenger profile");
            }
          })
          .getGuestByPassengerName(cleanQ);
      }
    };

    function submitBio() {
      const bioText = document.getElementById("bio-input").value.trim();
      const alertDiv = document.getElementById("bio-alert");
      const loader = document.getElementById("bio-loader");
      if (!bioText) return;
      loader.style.display = "block";
      alertDiv.style.display = "none";
      google.script.run
        .withSuccessHandler(res => {
          loader.style.display = "none";
          alertDiv.className = "alert alert-success";
          alertDiv.innerText = "Biography updated!";
          alertDiv.style.display = "block";
        })
        .withFailureHandler(err => {
          loader.style.display = "none";
          alertDiv.className = "alert alert-danger";
          alertDiv.innerText = "Failed to update bio.";
          alertDiv.style.display = "block";
        })
        .saveGuestBio(localStorage.getItem('guestSessionToken'), bioText);
    }

    function submitMissingInfo() {
      const inputs = document.querySelectorAll('.missing-item-answer');
      let combinedAnswers = [];
      let allEmpty = true;
      inputs.forEach(input => {
         if (input.value.trim()) {
            combinedAnswers.push(`${input.getAttribute('data-question')}: ${input.value.trim()}`);
            allEmpty = false;
         }
      });
      if (allEmpty) return;
      const text = combinedAnswers.join('\n');
      
      const alertDiv = document.getElementById("missing-info-alert");
      const loader = document.getElementById("missing-info-loader");
      loader.style.display = "block";
      alertDiv.style.display = "none";
      google.script.run
        .withSuccessHandler(res => {
          loader.style.display = "none";
          if(res.success) {
            alertDiv.className = "alert alert-success";
            alertDiv.innerText = "Information submitted successfully!";
            inputs.forEach(input => input.disabled = true);
          } else {
            alertDiv.className = "alert alert-danger";
            alertDiv.innerText = "Failed: " + res.message;
          }
          alertDiv.style.display = "block";
        })
        .withFailureHandler(err => {
          loader.style.display = "none";
          alertDiv.className = "alert alert-danger";
          alertDiv.innerText = "Error: " + err.message;
          alertDiv.style.display = "block";
        })
        .submitGeneralMissingInfo(localStorage.getItem('guestSessionToken'), text);
    }

    function compressImage(file, callback) {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => callback(e.target.result);
        reader.readAsDataURL(file);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.8);
          callback(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function uploadFile(type) {
      const fileInput = document.getElementById(type === 'passport' ? 'passport-file' : 'photo-file');
      const loader = document.getElementById(type === 'passport' ? 'passport-loader' : 'photo-loader');
      const alertDiv = document.getElementById(type === 'passport' ? 'passport-alert' : 'photo-alert');
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];
      
      loader.style.display = "block";
      alertDiv.style.display = "none";
      
      compressImage(file, function(fileData) {
        google.script.run
          .withSuccessHandler(res => {
            loader.style.display = "none";
            if (res.success) {
              alertDiv.className = "alert alert-success";
              alertDiv.innerText = "Uploaded successfully!";
            } else {
              alertDiv.className = "alert alert-danger";
              alertDiv.innerText = "Upload failed: " + res.error;
            }
            alertDiv.style.display = "block";
          })
          .withFailureHandler(err => {
            loader.style.display = "none";
            alertDiv.className = "alert alert-danger";
            alertDiv.innerText = "Upload error: " + err.message;
            alertDiv.style.display = "block";
          })
          .uploadGuestFile({
            sessionToken: localStorage.getItem('guestSessionToken'),
            fileData: fileData,
            fileName: file.name,
            fileType: file.type,
            uploadType: type
          });
      });
    }

    // SPOTLIGHT EFFECT
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });

    // THEME TOGGLE (SLIDER SWITCH)
    function updateThemeUI(isLight) {
      const toggleBtn = document.getElementById('theme-toggle');
      if (isLight) {
        document.body.classList.add('light-mode');
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-checked', 'true');
        }
      } else {
        document.body.classList.remove('light-mode');
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-checked', 'false');
        }
      }
    }

    function initTheme() {
      try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
          updateThemeUI(true);
        } else {
          updateThemeUI(false);
        }
      } catch (e) {
        updateThemeUI(false);
      }
    }

    function toggleTheme() {
      const isCurrentlyLight = document.body.classList.contains('light-mode');
      const nextIsLight = !isCurrentlyLight;
      updateThemeUI(nextIsLight);
      try {
        localStorage.setItem('theme', nextIsLight ? 'light' : 'dark');
      } catch (e) {}
    }

    initTheme();

    /* ================= LIVE UPDATES ================= */
    let updatesPollingInterval = null;
    let knownUpdateCount = 0;
    let cachedUpdatesList = [];
    let hasPromptedUnreadModal = false;

    function getDismissedUpdates() {
      if (!currentGuestEmail) return [];
      try {
        return JSON.parse(localStorage.getItem('dismissedUpdates_' + currentGuestEmail) || '[]');
      } catch(e) { return []; }
    }

    function getReadUpdates() {
      if (!currentGuestEmail) return [];
      try {
        return JSON.parse(localStorage.getItem('readUpdates_' + currentGuestEmail) || '[]');
      } catch(e) { return []; }
    }

    function toggleUpdatesPanel(isHashChange) {
      const panel = document.getElementById("updates-panel");
      const overlay = document.getElementById("updates-overlay");
      const isOpening = panel.style.left !== "0px";
      
      if (isOpening) {
        panel.style.left = "0px";
        overlay.style.display = "block";
        setTimeout(() => overlay.style.opacity = "1", 10);
        
        // Hide badge and pulse
        const badge = document.getElementById("notification-badge");
        if (badge) badge.style.display = "none";
        const bell = document.getElementById("notification-bell-container");
        if (bell) bell.classList.remove("has-new");
        
        // Mark all active updates as read
        markAllUpdatesAsRead();
        
        window.location.hash = "updates";
      } else {
        panel.style.left = "-100%";
        overlay.style.opacity = "0";
        setTimeout(() => overlay.style.display = "none", 300);
        
        if (isHashChange !== true && window.location.hash === "#updates") {
          history.back();
        }
      }
    }

    function markAllUpdatesAsRead() {
      if (!currentGuestEmail || !cachedUpdatesList.length) return;
      const readSet = new Set(getReadUpdates());
      cachedUpdatesList.forEach(u => {
        if (u.id) readSet.add(u.id);
      });
      localStorage.setItem('readUpdates_' + currentGuestEmail, JSON.stringify(Array.from(readSet)));
      
      // Also hide unread badge on bell
      const badge = document.getElementById("notification-badge");
      if (badge) badge.style.display = "none";
      const bell = document.getElementById("notification-bell-container");
      if (bell) bell.classList.remove("has-new");
    }

    function openNewMessagePanel() {
      closeNewMessageModal();
      toggleUpdatesPanel();
    }

    function closeNewMessageModal() {
      const overlay = document.getElementById("new-message-modal-overlay");
      if (overlay) overlay.style.display = "none";
      if (currentGuestEmail) {
        sessionStorage.setItem('dismissedPopupForSession_' + currentGuestEmail, 'true');
      }
    }

    function checkAndShowUnreadModal(unreadUpdates) {
      if (!unreadUpdates || unreadUpdates.length === 0) return;
      if (!currentGuestEmail) return;
      
      // Don't show if user already dismissed the popup in this browser session
      if (sessionStorage.getItem('dismissedPopupForSession_' + currentGuestEmail) === 'true') {
        return;
      }
      
      const overlay = document.getElementById("new-message-modal-overlay");
      if (!overlay) return;
      
      const titleEl = document.getElementById("new-message-modal-title");
      const textEl = document.getElementById("new-message-modal-text");
      
      const hasPersonal = unreadUpdates.some(u => u.type === 'personal');
      if (hasPersonal) {
        if (titleEl) titleEl.innerText = "You Have a Personal Message";
        if (textEl) textEl.innerText = "The festival team sent you a personal update. Tap READ to view it in your notifications.";
      } else {
        if (titleEl) titleEl.innerText = "You Have a New Message";
        if (textEl) textEl.innerText = "A new festival announcement has arrived. Tap READ to view it in your notifications.";
      }
      
      overlay.style.display = "flex";
      hasPromptedUnreadModal = true;
    }

    function startLiveUpdatesPolling() {
      fetchUpdates();
      if (updatesPollingInterval) clearInterval(updatesPollingInterval);
      updatesPollingInterval = setInterval(fetchUpdates, 30000); // Check every 30s
    }

    function fetchUpdates() {
      if (!currentGuestEmail) return;
      google.script.run
        .withSuccessHandler(res => {
          if (res.success && res.updates) {
            renderUpdates(res.updates);
          }
        })
        .getLiveUpdates(localStorage.getItem('guestSessionToken'));
    }

    function dismissUpdate(updateId) {
      if (!currentGuestEmail || !updateId) return;
      const dismissed = getDismissedUpdates();
      if (!dismissed.includes(updateId)) {
        dismissed.push(updateId);
        localStorage.setItem('dismissedUpdates_' + currentGuestEmail, JSON.stringify(dismissed));
      }
      
      // Re-filter cached updates and re-render
      renderUpdates(cachedUpdatesList, true);
    }

    function renderUpdates(updates, isDismissAction) {
      const bellContainer = document.getElementById("notification-bell-container");
      if (bellContainer) bellContainer.style.display = "flex";
      const body = document.getElementById("updates-body");
      if (!body) return;
      
      cachedUpdatesList = updates || [];
      
      // Filter out dismissed
      const dismissedIds = getDismissedUpdates();
      const activeUpdates = (updates || []).map(u => {
        if (!u.id) {
          u.id = u.type + '_' + (u.rowIndex || (u.message || '').slice(0, 25).replace(/\s+/g, '_'));
        }
        return u;
      }).filter(u => !dismissedIds.includes(u.id));
      
      // Check unread
      const readIds = getReadUpdates();
      const unreadUpdates = activeUpdates.filter(u => !readIds.includes(u.id));
      
      const badge = document.getElementById("notification-badge");
      if (unreadUpdates.length > 0) {
        if (badge) badge.style.display = "inline-block";
        if (bellContainer) bellContainer.classList.add("has-new");
        if (!isDismissAction) {
          checkAndShowUnreadModal(unreadUpdates);
        }
      } else {
        if (badge) badge.style.display = "none";
        if (bellContainer) bellContainer.classList.remove("has-new");
      }
      
      if (activeUpdates.length === 0) {
        body.innerHTML = `<p class="empty-state" style="text-align: center; margin-top: 40px; color: var(--foreground-muted);">No new updates at this time.</p>`;
        return;
      }
      
      let html = "";
      activeUpdates.forEach(u => {
        const isPersonal = u.type === 'personal';
        const isUnread = !readIds.includes(u.id);
        const safeId = String(u.id).replace(/'/g, "\\'");
        
        html += `
          <div class="update-msg ${isPersonal ? 'personal' : ''}" id="update-msg-${safeId}">
            <div class="update-msg-header">
              <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
                ${isPersonal 
                  ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> <span>Private Message</span>' 
                  : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg> <span>Announcement</span>'}
                ${isUnread ? '<span class="update-msg-new-badge">NEW</span>' : ''}
              </div>
              <span class="update-msg-time">${u.timestampStr || ''}</span>
            </div>
            <div class="update-msg-text">${u.message}</div>
            <div class="update-msg-footer">
              <button class="update-msg-delete-btn" type="button" onclick="event.stopPropagation(); dismissUpdate('${safeId}')" title="Delete notification">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        `;
      });
      body.innerHTML = html;
    }

    window.openNewMessagePanel = openNewMessagePanel;
    window.closeNewMessageModal = closeNewMessageModal;
    window.dismissUpdate = dismissUpdate;

    /* ================= SCHEDULE ================= */
    let scheduleDataCache = null;
    let currentSelectedScheduleDate = null;

    function renderScheduleTabs() {
      if (!scheduleDataCache) return;
      const dates = Object.keys(scheduleDataCache).sort();
      const nav = document.getElementById("schedule-days-nav");
      const container = document.getElementById("schedule-container");
      
      if (dates.length === 0) {
        if (nav) nav.style.display = "none";
        if (container) container.innerHTML = `<p class="empty-state">Itinerary will be published here.</p>`;
        return;
      }
      
      if (nav) nav.style.display = "flex";
      let html = "";
      
      const todayStr = new Date().toISOString().split('T')[0];
      let activeDate = (currentSelectedScheduleDate && dates.includes(currentSelectedScheduleDate))
        ? currentSelectedScheduleDate
        : (dates.includes(todayStr) ? todayStr : dates[0]);
      currentSelectedScheduleDate = activeDate;
      
      dates.forEach(d => {
        let dayName = d;
        let dayNum = '';
        
        // Parse date gracefully (YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY)
        let dateObj = null;
        if (d.includes('-')) {
          const parts = d.split('-');
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
              dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
          }
        } else if (d.includes('.')) {
          const parts = d.split('.');
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
              dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
          }
        } else if (d.includes('/')) {
          const parts = d.split('/');
          if (parts.length === 3) {
            dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          }
        } else {
          dateObj = new Date(d);
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
          dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          dayNum = dateObj.getDate();
        } else {
          dayName = d;
          dayNum = '';
        }
        
        const isActive = d === activeDate;
        html += `
          <button type="button" class="schedule-pill ${isActive ? 'active' : ''}" data-date="${d}" title="${d}">
            <span class="day-weekday">${escapeHtml(dayName)}</span>
            <span class="day-num">${escapeHtml(String(dayNum || d))}</span>
          </button>
        `;
      });

      if (nav) {
        nav.innerHTML = html;

        // Rock-solid delegated listener on nav container
        if (!nav.dataset.listenerAttached) {
          nav.dataset.listenerAttached = "true";
          nav.addEventListener('click', function(ev) {
            const btn = ev.target.closest('.schedule-pill');
            if (btn) {
              const targetDate = btn.getAttribute('data-date');
              if (targetDate) {
                selectScheduleDate(targetDate);
              }
            }
          });
        }
      }
      
      renderScheduleForDate(activeDate);
    }
    
    function selectScheduleDate(dateStr) {
      if (!scheduleDataCache || !scheduleDataCache[dateStr]) return;
      currentSelectedScheduleDate = dateStr;
      const pills = document.querySelectorAll('#schedule-days-nav .schedule-pill');
      
      pills.forEach(p => {
        if (p.getAttribute('data-date') === dateStr) {
          p.classList.add('active');
          try {
            p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          } catch(e) {}
        } else {
          p.classList.remove('active');
        }
      });
      
      renderScheduleForDate(dateStr);
    }

    window.selectScheduleDate = selectScheduleDate;
    window.renderScheduleTabs = renderScheduleTabs;
    window.renderScheduleForDate = renderScheduleForDate;
    
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    function renderScheduleForDate(dateStr) {
      const events = scheduleDataCache[dateStr] || [];
      const container = document.getElementById("schedule-container");
      
      if (events.length === 0) {
        container.innerHTML = `<p class="empty-state">No events scheduled for this day.</p>`;
        return;
      }
      
      let html = '<div class="schedule-events-list">';
      events.forEach(e => {
        const sTime = e.startTime ? String(e.startTime).trim() : "";
        const eTime = e.endTime ? String(e.endTime).trim() : "";
        let timeHtml = "";
        if (sTime && eTime) {
          timeHtml = `<span class="event-time"><span class="time-part">${escapeHtml(sTime)}</span><span class="time-dash">-</span><span class="time-part">${escapeHtml(eTime)}</span></span>`;
        } else if (sTime) {
          timeHtml = `<span class="event-time"><span class="time-part">${escapeHtml(sTime)}</span></span>`;
        } else {
          timeHtml = `<span class="event-time"><span class="time-part">-</span></span>`;
        }
        
        let mapsUrl = (e.locationLink && String(e.locationLink).trim() !== "") ? String(e.locationLink).trim() : "";
        let locName = e.location ? e.location.trim() : "";

        if (!mapsUrl && locName !== "") {
          if (locName.startsWith('http://') || locName.startsWith('https://')) {
            mapsUrl = locName;
          } else {
            // Check if matches a venue or place in guideDataCache
            if (guideDataCache && guideDataCache.items) {
              const matched = guideDataCache.items.find(item => 
                item.name && item.name.toLowerCase().trim() === locName.toLowerCase()
              );
              if (matched) {
                if (matched.link && matched.link.startsWith('http')) {
                  mapsUrl = matched.link;
                } else if (matched.address) {
                  mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matched.name + ' ' + matched.address + ', Israel')}`;
                }
              }
            }
            // Direct Google Maps search fallback
            if (!mapsUrl) {
              mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locName + ', Israel')}`;
            }
          }
        }

        let catBadge = "";
        if (e.category) {
          const catIcons = {
            'Concerts': '🎸',
            'Shuttle': '🚌',
            'Food & Drinks': '🍽️',
            'Social & Food': '🍽️',
            'Free Time': '🌴',
            'Tour': '🧭',
            'Networking': '🤝',
            'Party': '🎉',
            'Logistics': 'ℹ️'
          };
          const icon = catIcons[e.category] || '📌';
          catBadge = `<span class="schedule-cat-badge" data-category="${escapeHtml(e.category)}">${icon} <span>${escapeHtml(e.category)}</span></span>`;
        }

        let titleHtml = `<span class="event-title">${escapeHtml(e.title)}</span>`;
        let locHtml = "";
        if (locName !== "" && mapsUrl !== "") {
          locHtml = `
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="schedule-loc-link" title="Open in Maps / Info">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>${escapeHtml(locName)}</span>
            </a>
          `;
        }

        html += `
          <div class="schedule-event-inline fade-up">
            ${timeHtml}
            <div class="schedule-event-details">
              <div class="schedule-title-row">
                ${titleHtml}
                ${catBadge}
                ${locHtml}
              </div>
              ${e.description ? `<span class="event-desc">${escapeHtml(e.description)}</span>` : ''}
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }

    /* ========================================================= */
    /* GUIDE & ESSENTIALS UI LOGIC                               */
    /* ========================================================= */
    let guideDataCache = null;
    let currentGuideCity = 'jerusalem';

    function initGuide(guideData) {
      if (guideData) {
        guideDataCache = guideData;
        try {
          localStorage.setItem('imsf_guide_cache', JSON.stringify(guideData));
        } catch(e) {}
      } else {
        const cached = localStorage.getItem('imsf_guide_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const items = parsed && parsed.items ? parsed.items : [];
            const itemsWithLinks = items.filter(it => it.link);
            const hasLabels = itemsWithLinks.some(it => typeof it.linkLabel !== 'undefined');
            if (itemsWithLinks.length > 0 && !hasLabels) {
              localStorage.removeItem('imsf_guide_cache');
              guideDataCache = null;
            } else {
              guideDataCache = parsed;
            }
          } catch(e) {}
        }
      }
      if (guideDataCache) {
        renderGuideCityContent(currentGuideCity);
      }
    }

    function fetchGuideData() {
      const loader = document.getElementById('guide-loader');
      if (!guideDataCache && loader) loader.style.display = 'flex';
      
      google.script.run
        .withSuccessHandler(function(res) {
          if (loader) loader.style.display = 'none';
          if (res && res.success && res.guide) {
            initGuide(res.guide);
          } else {
            const container = document.getElementById('guide-content-area');
            if (container && (!guideDataCache || !guideDataCache.items || guideDataCache.items.length === 0)) {
              container.innerHTML = '<p class="empty-state">No guide recommendations published yet.</p>';
            }
          }
        })
        .withFailureHandler(function(err) {
          if (loader) loader.style.display = 'none';
          console.error("Guide fetch error:", err);
        })
        .getGuideData(false);
    }

    function selectGuideCity(city) {
      currentGuideCity = city;
      ['jerusalem', 'telaviv', 'essentials'].forEach(c => {
        const pill = document.getElementById('guide-pill-' + c);
        if (pill) {
          if (c === city) {
            pill.classList.add('active');
          } else {
            pill.classList.remove('active');
          }
        }
      });
      renderGuideCityContent(city);
    }

    function getGuideCategoryIcon(catName) {
      const lower = (catName || '').toLowerCase();
      if (lower.includes('venue') || lower.includes('לוקיישן')) return '🎪';
      if (lower.includes('bar') || lower.includes('night') || lower.includes('בר') || lower.includes('pub') || lower.includes('פאב')) return '🍸';
      if (lower.includes('food') || lower.includes('restaurant') || lower.includes('coffee') || lower.includes('cafe') || lower.includes('אוכל') || lower.includes('קפה') || lower.includes('מסעד')) return '🍽️';
      if (lower.includes('hotel') || lower.includes('מלון') || lower.includes('אירוח') || lower.includes('לינה')) return '🏨';
      if (lower.includes('transit') || lower.includes('taxi') || lower.includes('מוני') || lower.includes('app') || lower.includes('אפליקצי')) return '📱';
      if (lower.includes('faq') || lower.includes('q&a') || lower.includes('שאלה') || lower.includes('מידע')) return '💡';
      if (lower.includes('emergency') || lower.includes('חירום') || lower.includes('health') || lower.includes('בריאות')) return '🚨';
      if (lower.includes('pay') || lower.includes('money') || lower.includes('תשלום') || lower.includes('כסף')) return '💳';
      return '📍';
    }

    function resolveGuideItemLink(item, defaultCity) {
      let url = (item.link || '').trim();
      let label = (item.linkLabel || '').trim();

      // Client-side fallback if label was not pre-parsed by backend
      if (!label && url) {
        const md = url.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        if (md) {
          label = md[1].trim();
          url = md[2].trim();
        } else {
          const html = url.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
          if (html) {
            url = html[1].trim();
            label = html[2].replace(/<[^>]+>/g, '').trim();
          } else {
            const urlM = url.match(/(https?:\/\/[^\s]+)/i);
            if (urlM) {
              const found = urlM[1].trim();
              const rest = url.replace(found, '').replace(/^[-–—:\s()]+|[-–—:\s()]+$/g, '').trim();
              if (rest) {
                url = found;
                label = rest;
              }
            } else if (!url.includes('.') && !url.includes('/')) {
              label = url;
              url = '';
            }
          }
        }
      }

      if (label) {
        const lLower = label.toLowerCase();
        if (label === url || lLower.startsWith('http://') || lLower.startsWith('https://') || lLower.startsWith('www.')) {
          label = '';
        }
      }

      // If no URL but has address or venue name in Jerusalem/Tel Aviv, generate Google Maps query
      if (!url && (item.address || (item.name && defaultCity && defaultCity !== 'essentials'))) {
        const cityNameStr = (defaultCity === 'jerusalem' ? 'Jerusalem' : (defaultCity === 'telaviv' ? 'Tel Aviv' : ''));
        const query = [item.name, item.address, cityNameStr, 'Israel'].filter(Boolean).join(', ');
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      }

      // Rule: If custom text with link is present -> use it. If only raw link -> display "Maps".
      const isCustom = Boolean(label);
      const btnLabel = isCustom ? label : 'Maps';

      return { url, btnLabel, isCustom };
    }

    function renderGuideItemCards(catItems, defaultCity) {
      return catItems.map(item => {
        const { url, btnLabel, isCustom } = resolveGuideItemLink(item, defaultCity);

        let btnHtml = '';
        if (url) {
          let href = url;
          if (!href.startsWith('http://') && !href.startsWith('https://')) {
            href = 'https://' + href;
          }

          const isMap = !isCustom || btnLabel.toLowerCase().includes('map');
          const iconSvg = isMap
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
               </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
               </svg>`;

          btnHtml = `
            <div class="guide-item-side">
              <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="guide-map-btn" title="${escapeHtml(btnLabel)}">
                ${iconSvg}
                <span>${escapeHtml(btnLabel)}</span>
              </a>
            </div>
          `;
        }

        return `
          <div class="guide-item-card fade-up">
            <div class="guide-item-main">
              <div class="guide-item-header">
                <span class="guide-item-name" dir="auto">${escapeHtml(item.name || '')}</span>
                ${item.tag ? `<span class="guide-item-tag">${escapeHtml(item.tag)}</span>` : ''}
              </div>
              ${item.description ? `<p class="guide-item-desc" dir="auto">${escapeHtml(item.description)}</p>` : ''}
              ${item.address ? `
                <div class="guide-item-address" dir="auto">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>${escapeHtml(item.address)}</span>
                </div>
              ` : ''}
            </div>
            ${btnHtml}
          </div>
        `;
      }).join('');
    }

    function renderGuideCityContent(city) {
      const container = document.getElementById('guide-content-area');
      if (!container) return;

      if (!guideDataCache) {
        container.innerHTML = '<p class="empty-state">Loading recommendations...</p>';
        return;
      }

      let items = [];
      if (city === 'jerusalem') {
        items = guideDataCache.jerusalem || [];
      } else if (city === 'telaviv') {
        items = guideDataCache.telAviv || [];
      } else if (city === 'essentials') {
        items = guideDataCache.essentials || [];
      }

      if (!items || items.length === 0) {
        container.innerHTML = `<p class="empty-state">No recommendations added for this section yet.</p>`;
        return;
      }

      if (city === 'essentials') {
        renderEssentialsContent(items, container);
        return;
      }

      // Group by Category (Venues, Bars, Food, Hotels, etc.)
      const categories = {};
      items.forEach(item => {
        const cat = item.category || 'General';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      let html = '<div class="guide-sections-wrapper">';
      Object.keys(categories).forEach(catName => {
        const catItems = categories[catName];
        const catIcon = getGuideCategoryIcon(catName);

        html += `
          <details class="guide-category-accordion" name="guide-category">
            <summary class="guide-category-summary">
              <div class="guide-category-info">
                <span class="guide-category-icon">${catIcon}</span>
                <span class="guide-category-title">${escapeHtml(catName)}</span>
              </div>
              <div class="guide-category-meta">
                <span class="guide-category-badge">${catItems.length}</span>
                <span class="guide-category-chevron">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </summary>
            <div class="guide-category-content">
              <div class="guide-cards-list">
                ${renderGuideItemCards(catItems, city)}
              </div>
            </div>
          </details>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }

    function renderEssentialsContent(items, container) {
      // Group by Category (Q&A, Apps & Transit, Payments, etc.)
      const categories = {};
      items.forEach(item => {
        let cat = (item.category || '').trim();
        if (!cat) {
          const tagLower = (item.tag || '').toLowerCase();
          const nameLower = (item.name || '').toLowerCase();
          if (tagLower.includes('faq') || tagLower.includes('q&a') || nameLower.includes('faq') || nameLower.includes('q&a')) {
            cat = 'Q&A';
          } else {
            cat = 'Essential Apps & Services';
          }
        }
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      let html = '<div class="guide-sections-wrapper">';
      Object.keys(categories).forEach(catName => {
        const catItems = categories[catName];
        const catIcon = getGuideCategoryIcon(catName);

        html += `
          <details class="guide-category-accordion" name="guide-category">
            <summary class="guide-category-summary">
              <div class="guide-category-info">
                <span class="guide-category-icon">${catIcon}</span>
                <span class="guide-category-title">${escapeHtml(catName)}</span>
              </div>
              <div class="guide-category-meta">
                <span class="guide-category-badge">${catItems.length}</span>
                <span class="guide-category-chevron">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </summary>
            <div class="guide-category-content">
              <div class="guide-cards-list">
                ${renderGuideItemCards(catItems, 'essentials')}
              </div>
            </div>
          </details>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }

    // Exclusive accordion: only one category can be open at a time (Desktop & Mobile)
    document.addEventListener('click', function(e) {
      const summary = e.target.closest('.guide-category-summary');
      if (!summary) return;
      const acc = summary.closest('details.guide-category-accordion');
      if (!acc) return;

      if (!acc.open) {
        const container = acc.closest('#guide-content-area') || acc.parentElement;
        if (container) {
          container.querySelectorAll('details.guide-category-accordion[open]').forEach(other => {
            if (other !== acc) {
              other.removeAttribute('open');
            }
          });
        }
      }
    });

    document.addEventListener('toggle', function(e) {
      const acc = e.target;
      if (!acc || !acc.classList || !acc.classList.contains('guide-category-accordion')) return;
      if (acc.open) {
        const container = acc.closest('#guide-content-area') || acc.parentElement;
        if (container) {
          container.querySelectorAll('details.guide-category-accordion[open]').forEach(other => {
            if (other !== acc) {
              other.removeAttribute('open');
            }
          });
        }
      }
    }, true);
    /* ========================================================= */
    /* ARTISTS UI LOGIC                                          */
    /* ========================================================= */
    let globalArtistsData = [];
    let showFavsOnly = false;
    let currentOpenArtistId = null;
    let lastOpenedArtistId = null;
    let artistOpenedFromSubTab = 'directory';

    // Load favorites from local storage
    function getFavorites() {
      try {
        const stored = localStorage.getItem('artist_favs_' + currentGuestEmail);
        return stored ? JSON.parse(stored) : {};
      } catch(e) { return {}; }
    }
    function saveFavorites(favs) {
      localStorage.setItem('artist_favs_' + currentGuestEmail, JSON.stringify(favs));
      if (typeof updateTimetableFavCount === 'function') {
        updateTimetableFavCount();
      }
      if (typeof currentArtistsSubTab !== 'undefined' && currentArtistsSubTab === 'timetable' && typeof renderTimetableShows === 'function') {
        renderTimetableShows();
      }
    }

    // Load notes from local storage
    function getPrivateNote(artistId) {
      try {
        const stored = localStorage.getItem(`artist_note_${currentGuestEmail}_${artistId}`);
        return stored || "";
      } catch(e) { return ""; }
    }
    function savePrivateNoteLocally(artistId, note) {
      localStorage.setItem(`artist_note_${currentGuestEmail}_${artistId}`, note);
    }

    // Load & Save intent tags
    function getArtistTags(artistId) {
      try {
        const stored = localStorage.getItem(`artist_tags_${currentGuestEmail}_${artistId}`);
        return stored ? JSON.parse(stored) : [];
      } catch(e) { return []; }
    }
    function saveArtistTagsLocally(artistId, tags) {
      localStorage.setItem(`artist_tags_${currentGuestEmail}_${artistId}`, JSON.stringify(tags));
    }

    // Toggle Intent Tag
    function toggleIntentTag(tag) {
      if (!currentOpenArtistId) return;
      const currentTags = getArtistTags(currentOpenArtistId);
      const idx = currentTags.indexOf(tag);
      if (idx >= 0) {
        currentTags.splice(idx, 1);
      } else {
        currentTags.push(tag);
      }
      saveArtistTagsLocally(currentOpenArtistId, currentTags);

      // Update button visual
      const btn = document.querySelector(`.sheet-intent-tag-btn[data-tag="${tag}"]`);
      if (btn) {
        if (currentTags.includes(tag)) btn.classList.add('active');
        else btn.classList.remove('active');
      }

      // If user tags Booking or Connect, automatically mark artist as favorite if not already
      const favs = getFavorites();
      if (!favs[currentOpenArtistId] && (tag === "Booking" || tag === "Connect")) {
        favs[currentOpenArtistId] = true;
        saveFavorites(favs);
        const favBtn = document.getElementById('sheet-fav-btn');
        if (favBtn) {
          favBtn.classList.add('active');
          document.getElementById('sheet-fav-icon').setAttribute('fill', 'currentColor');
        }
      }

      triggerFeedbackAutoSave(1500);
    }

    // Auto-Save & Debounce Engine
    let feedbackSaveTimer = null;
    function triggerFeedbackAutoSave(delay = 3500) {
      const statusElem = document.getElementById('sheet-save-status');
      if (statusElem) statusElem.innerText = 'Saving...';
      if (feedbackSaveTimer) clearTimeout(feedbackSaveTimer);
      feedbackSaveTimer = setTimeout(() => {
        syncArtistFeedbackToServer();
      }, delay);
    }

    function flushFeedbackAutoSave() {
      if (feedbackSaveTimer) {
        clearTimeout(feedbackSaveTimer);
        feedbackSaveTimer = null;
        syncArtistFeedbackToServer();
      }
    }

    // Helper to push feedback for any specific email to server
    function syncLocalGuestFeedbackToServer(targetEmail, callback) {
      if (!targetEmail || !window.google || !google.script || !google.script.run) {
        if (callback) callback(new Error("Environment not ready"));
        return;
      }
      const cleanEmail = targetEmail.trim().toLowerCase();
      
      let favs = {};
      try {
        const rawFavs = localStorage.getItem('artist_favs_' + cleanEmail);
        if (rawFavs) favs = JSON.parse(rawFavs);
      } catch(e) {}

      const allNotes = {};
      const allTags = {};
      try {
        const notePrefix = `artist_note_${cleanEmail}_`;
        const tagPrefix = `artist_tags_${cleanEmail}_`;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(notePrefix)) {
            const aId = k.replace(notePrefix, '');
            const val = localStorage.getItem(k);
            if (val && val.trim()) allNotes[aId] = val.trim();
          } else if (k && k.startsWith(tagPrefix)) {
            const aId = k.replace(tagPrefix, '');
            const val = localStorage.getItem(k);
            if (val) {
              try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed) && parsed.length > 0) allTags[aId] = parsed;
              } catch(e) {}
            }
          }
        }
      } catch(e) {}

      const hasFavs = Object.keys(favs).some(k => !!favs[k]);
      const hasNotes = Object.keys(allNotes).length > 0;
      const hasTags = Object.keys(allTags).length > 0;

      if (hasFavs || hasNotes || hasTags) {
        const payload = {
          favorites: favs,
          notes: allNotes,
          tags: allTags
        };
        google.script.run
          .withSuccessHandler(function(res) {
            console.log("[Auto-Sync] Saved feedback for:", cleanEmail, res);
            if (callback) callback(null, res);
          })
          .withFailureHandler(function(err) {
            console.warn("[Auto-Sync] Error saving feedback for:", cleanEmail, err);
            if (callback) callback(err);
          })
          .saveGuestArtistFeedback(cleanEmail, payload);
      } else {
        if (callback) callback(null, { skipped: true });
      }
    }

    function syncArtistFeedbackToServer() {
      if (!currentGuestEmail) return;
      const statusElem = document.getElementById('sheet-save-status');

      // Aggregate all notes and tags directly from localStorage
      const allNotes = {};
      const allTags = {};
      try {
        const notePrefix = `artist_note_${currentGuestEmail}_`;
        const tagPrefix = `artist_tags_${currentGuestEmail}_`;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(notePrefix)) {
            const aId = k.replace(notePrefix, '');
            const val = localStorage.getItem(k);
            if (val && val.trim()) allNotes[aId] = val.trim();
          } else if (k && k.startsWith(tagPrefix)) {
            const aId = k.replace(tagPrefix, '');
            const val = localStorage.getItem(k);
            if (val) {
              try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed) && parsed.length > 0) allTags[aId] = parsed;
              } catch(e) {}
            }
          }
        }
      } catch(e) {}

      // Also ensure current open artist's latest inputs are captured
      if (currentOpenArtistId) {
        const currentInput = document.getElementById('sheet-private-note');
        if (currentInput && currentInput.value.trim()) {
          allNotes[currentOpenArtistId] = currentInput.value.trim();
        }
        const currentTags = getArtistTags(currentOpenArtistId);
        if (currentTags && currentTags.length > 0) {
          allTags[currentOpenArtistId] = currentTags;
        }
      }

      const payload = {
        favorites: getFavorites(),
        notes: allNotes,
        tags: allTags
      };

      const isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;

      if (!isOnline) {
        try {
          localStorage.setItem('imsf_pending_sync_' + currentGuestEmail, JSON.stringify({
            timestamp: Date.now(),
            payload: payload
          }));
        } catch(e) {}
        if (statusElem) {
          statusElem.innerText = 'Saved on device (offline) • Will sync when connected';
        }
        return;
      }

      if (statusElem) {
        statusElem.innerText = 'Saving...';
      }

      if (window.google && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            try {
              localStorage.removeItem('imsf_pending_sync_' + currentGuestEmail);
            } catch(e) {}
            if (statusElem) {
              statusElem.innerText = 'Saved ✓';
              setTimeout(() => {
                if (statusElem.innerText === 'Saved ✓') statusElem.innerText = '';
              }, 3000);
            }
          })
          .withFailureHandler(function(err) {
            console.warn("Auto-save network error, queued for offline sync:", err);
            try {
              localStorage.setItem('imsf_pending_sync_' + currentGuestEmail, JSON.stringify({
                timestamp: Date.now(),
                payload: payload
              }));
            } catch(e) {}
            if (statusElem) {
              statusElem.innerText = 'Saved on device (offline) • Will sync when connected';
            }
          })
          .saveGuestArtistFeedback(currentGuestEmail, payload);
      }
    }

    function flushPendingArtistFeedback() {
      if (!currentGuestEmail) return;
      const isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
      if (!isOnline) return;

      console.log("[Offline Engine] Network reconnected. Pulling remote data to merge before syncing...");
      // Always pull & merge latest server data first so laptop/other device changes are preserved!
      fetchGuestArtistFeedback(function() {
        console.log("[Offline Engine] Smart 2-way merge complete.");
        const pendingKey = 'imsf_pending_sync_' + currentGuestEmail;
        if (localStorage.getItem(pendingKey)) {
          syncArtistFeedbackToServer();
        }
      });
    }

    // Fetch remote feedback on startup or reconnect for cross-device persistence & smart 2-way merge
    function fetchGuestArtistFeedback(onCompleteCallback) {
      if (!currentGuestEmail || !window.google || !google.script || !google.script.run) {
        if (typeof onCompleteCallback === 'function') onCompleteCallback();
        return;
      }
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.success && res.feedback) {
            const fb = res.feedback;
            const localFavs = getFavorites();
            const serverFavs = fb.favorites || {};
            let needsServerPush = false;

            // 1. Smart Merge Favorites (Union of favorites from both devices)
            const allFavKeys = new Set([...Object.keys(serverFavs), ...Object.keys(localFavs)]);
            const mergedFavs = {};
            allFavKeys.forEach(k => {
              if (localFavs[k] || serverFavs[k]) {
                mergedFavs[k] = true;
              }
            });
            saveFavorites(mergedFavs);
            if (Object.keys(mergedFavs).some(k => !serverFavs[k])) {
              needsServerPush = true;
            }

            // 2. Smart Merge Notes (Granular merge per artist so no notes are lost)
            if (fb.notes) {
              Object.keys(fb.notes).forEach(aId => {
                const serverNote = (fb.notes[aId] || "").trim();
                const localNote = (getPrivateNote(aId) || "").trim();

                if (!localNote && serverNote) {
                  // Computer had a note, phone was empty: save computer's note locally
                  savePrivateNoteLocally(aId, serverNote);
                } else if (localNote && serverNote && localNote !== serverNote) {
                  // Both devices wrote a note for this artist
                  if (localNote.includes(serverNote)) {
                    // Local note already contains the server note (user added more text on phone)
                    needsServerPush = true;
                  } else if (serverNote.includes(localNote)) {
                    // Server note already contains the local note (user added more text on laptop)
                    savePrivateNoteLocally(aId, serverNote);
                  } else {
                    // Two distinct notes written on separate devices: combine them cleanly as continuous text!
                    const mergedNote = `${localNote}\n\n${serverNote}`;
                    savePrivateNoteLocally(aId, mergedNote);
                    needsServerPush = true;
                  }
                } else if (localNote && !serverNote) {
                  // Phone has a note written offline that server doesn't have yet
                  needsServerPush = true;
                }
              });
            }

            // Also check if local storage has any notes for artists not on the server at all
            try {
              const notePrefix = `artist_note_${currentGuestEmail}_`;
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(notePrefix)) {
                  const aId = k.replace(notePrefix, '');
                  const n = localStorage.getItem(k);
                  if (n && n.trim() && (!fb.notes || !fb.notes[aId])) {
                    needsServerPush = true;
                  }
                }
              }
            } catch(e) {}

            // 3. Smart Merge Intent Tags (Union of tags from both devices)
            if (fb.tags) {
              Object.keys(fb.tags).forEach(aId => {
                const serverTagList = Array.isArray(fb.tags[aId]) ? fb.tags[aId] : [];
                const localTagList = getArtistTags(aId);
                const mergedTags = Array.from(new Set([...serverTagList, ...localTagList]));

                if (mergedTags.length !== localTagList.length || !mergedTags.every(t => localTagList.includes(t))) {
                  saveArtistTagsLocally(aId, mergedTags);
                }
                if (mergedTags.length !== serverTagList.length || !mergedTags.every(t => serverTagList.includes(t))) {
                  needsServerPush = true;
                }
              });
            }

            // Also check if local storage has tags for artists not on server
            try {
              const tagPrefix = `artist_tags_${currentGuestEmail}_`;
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(tagPrefix)) {
                  const aId = k.replace(tagPrefix, '');
                  const t = localStorage.getItem(k);
                  if (t && (!fb.tags || !fb.tags[aId])) {
                    needsServerPush = true;
                  }
                }
              }
            } catch(e) {}

            // If an artist sheet is currently open, refresh its display with the merged data
            if (currentOpenArtistId) {
              const noteInput = document.getElementById('sheet-private-note');
              if (noteInput && document.activeElement !== noteInput) {
                noteInput.value = getPrivateNote(currentOpenArtistId);
              }
              const currentTags = getArtistTags(currentOpenArtistId);
              document.querySelectorAll('.sheet-intent-tag-btn').forEach(btn => {
                const t = btn.getAttribute('data-tag');
                if (currentTags.includes(t)) btn.classList.add('active');
                else btn.classList.remove('active');
              });
              const favBtn = document.getElementById('sheet-fav-btn');
              const isFav = !!mergedFavs[currentOpenArtistId];
              if (favBtn) {
                if (isFav) {
                  favBtn.classList.add('active');
                  const icon = document.getElementById('sheet-fav-icon');
                  if (icon) icon.setAttribute('fill', 'currentColor');
                } else {
                  favBtn.classList.remove('active');
                  const icon = document.getElementById('sheet-fav-icon');
                  if (icon) icon.setAttribute('fill', 'none');
                }
              }
            }

            filterArtists();

            // Retroactive Auto-Sync:
            // If local storage has favorites, tags or notes that aren't on the server yet,
            // push the merged multi-device dataset to Google Sheets!
            if (needsServerPush) {
              console.log("[Smart Merge Sync] Pushing merged multi-device dataset to Google Sheets for:", currentGuestEmail);
              syncArtistFeedbackToServer();
            }

            if (typeof onCompleteCallback === 'function') onCompleteCallback();
          } else {
            if (typeof onCompleteCallback === 'function') onCompleteCallback();
          }
        })
        .withFailureHandler(function(err) {
          console.warn("Could not fetch remote artist feedback:", err);
          if (typeof onCompleteCallback === 'function') onCompleteCallback();
        })
        .getGuestArtistFeedback(currentGuestEmail);
    }

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        flushFeedbackAutoSave();
      }
    });

    function fetchArtistsData() {
      const grid = document.getElementById('artists-grid');
      const cacheKey = 'swr_artistsData_v4';
      
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.some(a => a.genre)) {
            globalArtistsData = parsed.sort((a, b) => a.name.localeCompare(b.name));
            initArtistsUI();
            fetchGuestArtistFeedback();
          }
        } catch(e) {}
      }
      
      if (!globalArtistsData || globalArtistsData.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px 0;">
          <div class="musical-loader-wrapper" style="display: flex; margin: 0 auto; flex-direction: column;">
            <div class="musical-loader">
              <span class="music-note music-note-1">🎵</span>
              <span class="drummer-emoji">🥁</span>
              <span class="music-note music-note-2">🎶</span>
            </div>
            <p class="loader-text">Finishing sound-check,<br>Soon we&apos;ll open the doors</p>
          </div>
        </div>`;
      }
      
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.success && res.artists) {
            localStorage.setItem(cacheKey, JSON.stringify(res.artists));
            globalArtistsData = res.artists.sort((a, b) => a.name.localeCompare(b.name));
            initArtistsUI();
            fetchGuestArtistFeedback();
          } else {
            if (!globalArtistsData || globalArtistsData.length === 0) grid.innerHTML = `<p class="empty-state">The artists lineup is currently being updated. Please check back shortly.</p>`;
          }
        })
        .withFailureHandler(function(err) {
          if (!globalArtistsData || globalArtistsData.length === 0) grid.innerHTML = `<p class="empty-state">The artists lineup is currently being updated. Please check back shortly.</p>`;
        })
        .getArtistsData();
    }

    // Initialize Artists UI
    function initArtistsUI() {
      // Setup Genre Filter
      const genreSelect = document.getElementById('artist-genre-filter');
      const currentVal = genreSelect ? genreSelect.value : 'All';
      const predefinedGenres = ["Rock, Indie & Electronic", "Jazz & World Music"];
      const genres = new Set([...predefinedGenres, ...globalArtistsData.map(a => a.genre).filter(g => g && g.trim())]);
      let genreHtml = '<option value="All">All Genres</option>';
      genres.forEach(g => {
        const isSelected = (g === currentVal) ? 'selected' : '';
        genreHtml += `<option value="${g}" ${isSelected}>${g}</option>`;
      });
      if (genreSelect) {
        genreSelect.innerHTML = genreHtml;
        if (currentVal && (currentVal === 'All' || genres.has(currentVal))) {
          genreSelect.value = currentVal;
        }
      }

      // Setup Live Banner
      const liveBanner = document.getElementById('artists-live-banner');
      if (liveBanner) liveBanner.style.display = 'none';

      filterArtists();
      if (typeof updateTimetableFavCount === 'function') {
        updateTimetableFavCount();
      }
      if (typeof currentArtistsSubTab !== 'undefined' && currentArtistsSubTab === 'timetable' && typeof renderTimetableShows === 'function') {
        renderTimetableShows();
      }
    }

    function renderArtistsGrid(artists) {
      const grid = document.getElementById('artists-grid');
      const favs = getFavorites();
      
      if (artists.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--foreground-muted);">No artists found.</div>`;
        return;
      }

      let html = '';
      artists.forEach(artist => {
        const isFav = !!favs[artist.id];
        const favButtonHtml = showFavsOnly
          ? `<span class="fav-btn-inline active" style="pointer-events: none;" aria-label="Favorite">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            </span>`
          : `<button class="fav-btn-inline ${isFav ? 'active' : ''}" onclick="toggleCardFav(event, '${artist.id}')" aria-label="Toggle favorite">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            </button>`;

        html += `
          <div class="artist-card" style="background-image: url('${artist.image}')" onclick="openArtistSheet('${artist.id}')">
            <div class="artist-card-overlay">
              <div style="display: flex; align-items: center; justify-content: flex-start; gap: 6px; margin-bottom: 2px;">
                <div class="artist-card-name" style="margin-bottom: 0;">${artist.name}</div>
                ${favButtonHtml}
              </div>
              <div class="artist-card-genre">${artist.genre}</div>
            </div>
          </div>
        `;
      });
      grid.innerHTML = html;

      // Handle Export Briefcase visibility
      const hasFavs = Object.keys(favs).length > 0;
      document.getElementById('export-briefcase-container').style.display = hasFavs ? 'block' : 'none';
    }

    function toggleCardFav(event, artistId) {
      if (showFavsOnly) {
        if (event) event.stopPropagation();
        openArtistSheet(artistId);
        return;
      }
      if (event) {
        event.stopPropagation();
        if (event.preventDefault) event.preventDefault();
      }
      const favs = getFavorites();
      const willBeFav = !favs[artistId];
      if (willBeFav) {
        favs[artistId] = true;
      } else {
        delete favs[artistId];
      }
      saveFavorites(favs);
      triggerFeedbackAutoSave(1500);
      if (typeof updateTimetableFavCount === 'function') updateTimetableFavCount();

      const btn = (event && event.currentTarget) || (event && event.target && event.target.closest('.fav-btn-inline'));
      if (btn) {
        if (willBeFav) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      } else {
        filterArtists();
      }

      // Handle Export Briefcase visibility
      const hasFavs = Object.keys(favs).length > 0;
      const exportContainer = document.getElementById('export-briefcase-container');
      if (exportContainer) exportContainer.style.display = hasFavs ? 'block' : 'none';
    }

    function filterArtists() {
      const searchTxt = document.getElementById('artist-search').value.toLowerCase().trim();
      const genreVal = document.getElementById('artist-genre-filter') ? document.getElementById('artist-genre-filter').value : 'All';
      const clearBtn = document.getElementById('clear-artist-search-btn');
      const favs = getFavorites();

      if (clearBtn) clearBtn.style.display = searchTxt ? 'flex' : 'none';

      const filtered = globalArtistsData.filter(a => {
        const aGenre = (a.genre || "").trim();
        const matchesSearch = !searchTxt || (a.name && a.name.toLowerCase().includes(searchTxt)) || aGenre.toLowerCase().includes(searchTxt);
        
        let matchesGenre = false;
        if (!genreVal || genreVal === 'All') {
          matchesGenre = true;
        } else if (aGenre) {
          const gArtist = aGenre.toLowerCase();
          const gTarget = genreVal.trim().toLowerCase();
          matchesGenre = (gArtist === gTarget) || gArtist.includes(gTarget) || gTarget.includes(gArtist);
        }

        const matchesFav = !showFavsOnly || !!favs[a.id];
        return matchesSearch && matchesGenre && matchesFav;
      });

      renderArtistsGrid(filtered);
    }

    function clearArtistSearch() {
      document.getElementById('artist-search').value = "";
      filterArtists();
    }

    function toggleFavFilter() {
      showFavsOnly = !showFavsOnly;
      const btn = document.getElementById('artist-fav-filter-btn');
      if (btn) {
        if (showFavsOnly) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
      filterArtists();
    }

    // Bottom Sheet
    function openArtistSheet(artistId, isFromHash) {
      if (!artistId) return;

      const artistSheetEl = document.getElementById('artist-bottom-sheet');
      if (artistSheetEl) {
        artistSheetEl.scrollTop = 0;
        const sheetContentEl = artistSheetEl.querySelector('.sheet-content');
        if (sheetContentEl) sheetContentEl.scrollTop = 0;
      }

      lastOpenedArtistId = artistId;
      if (typeof currentArtistsSubTab !== 'undefined') {
        artistOpenedFromSubTab = currentArtistsSubTab;
      }
      currentOpenArtistId = artistId;
      const artist = globalArtistsData.find(a => a.id === artistId);
      if (!artist) return;

      const favs = getFavorites();
      const isFav = !!favs[artistId];

      document.getElementById('sheet-artist-img').style.backgroundImage = `url('${artist.image}')`;
      document.getElementById('sheet-artist-name').innerText = artist.name;
      
      const genreElem = document.getElementById('sheet-artist-genre');
      if (genreElem) {
        genreElem.innerText = artist.genre || "";
        genreElem.style.display = artist.genre ? "block" : "none";
      }

      const contactElem = document.getElementById('sheet-artist-contact');
      if (contactElem) {
        const contactName = (artist.contactName || "").trim();
        const rawEmail = (artist.contactEmail || "").trim();
        contactElem.innerHTML = "";

        const emails = rawEmail ? rawEmail.split(/[\r\n,;]+/).map(e => e.trim()).filter(Boolean) : [];

        if (contactName || emails.length > 0) {
          contactElem.appendChild(document.createTextNode("Contact: "));
          if (contactName) {
            contactElem.appendChild(document.createTextNode(contactName));
            if (emails.length > 0) {
              contactElem.appendChild(document.createTextNode(" - "));
            }
          }
          emails.forEach((email, idx) => {
            if (idx > 0) {
              contactElem.appendChild(document.createTextNode(", "));
            }
            const link = document.createElement("a");
            link.href = "mailto:" + email;
            link.className = "sheet-contact-email";
            link.textContent = email;
            contactElem.appendChild(link);
          });
          contactElem.style.display = "block";
        } else {
          contactElem.style.display = "none";
        }
      }

      // Showtime & Stage info in Bottom Sheet
      const showtimeElem = document.getElementById('sheet-artist-showtime');
      if (showtimeElem) {
        const artistShows = (typeof FESTIVAL_SHOWS_SCHEDULE !== 'undefined')
          ? FESTIVAL_SHOWS_SCHEDULE.filter(s => {
              if (s.artistId && s.artistId === artist.id) return true;
              const matched = findMatchedArtist(s.artistName, s.aliases);
              if (matched && (matched.id === artist.id || matched.name === artist.name)) return true;
              const normShow = normalizeArtistString(s.artistName);
              const normArt = normalizeArtistString(artist.name);
              if (normShow === normArt || (normShow.length >= 4 && (normShow.includes(normArt) || normArt.includes(normShow)))) return true;
              return false;
            })
          : [];

        if (artistShows.length > 0) {
          let showtimesHtml = '';
          artistShows.forEach(s => {
            const dayObj = (typeof FESTIVAL_TIMETABLE_DAYS !== 'undefined')
              ? FESTIVAL_TIMETABLE_DAYS.find(d => d.date === s.date)
              : null;
            
            const dayLabel = dayObj ? `${dayObj.dayOfWeek} ${dayObj.dayNum}.11` : s.date;
            const venueLabel = dayObj ? dayObj.venue : '';
            const cityLabel = dayObj ? dayObj.city : '';
            const locationStr = venueLabel ? `${venueLabel}${cityLabel ? ' (' + cityLabel + ')' : ''}` : '';
            const timeStr = s.startTime ? `${s.startTime}${s.endTime ? ' - ' + s.endTime : ''}` : 'DJ Set (Time TBA)';

            showtimesHtml += `
              <div class="sheet-showtime-row clickable" onclick="jumpToTimetableShow('${s.date}', '${s.id}', '${artist.id}')" title="Tap to view in Festival Timetable">
                <div class="sheet-showtime-accent-bar"></div>
                <div class="sheet-showtime-info">
                  <div class="sheet-showtime-top">
                    <span class="sheet-showtime-datetime">📅 ${escapeHtml(dayLabel)} • <strong>${escapeHtml(timeStr)}</strong></span>
                    ${s.format ? `<span class="sheet-showtime-format">${escapeHtml(s.format)}</span>` : ''}
                  </div>
                  <div class="sheet-showtime-bottom">
                    <span class="sheet-showtime-venue">📍 ${escapeHtml(locationStr)}</span>
                    <span class="sheet-showtime-stage">Stage: <strong>${escapeHtml(s.stage)}</strong></span>
                    <span class="sheet-showtime-jump-cta">View in Timetable →</span>
                  </div>
                </div>
              </div>
            `;
          });
          showtimeElem.innerHTML = showtimesHtml;
          showtimeElem.style.display = 'flex';
        } else {
          showtimeElem.innerHTML = '';
          showtimeElem.style.display = 'none';
        }
      }

      // Empty state handling
      const hasBio = !!(artist.bio && String(artist.bio).trim() !== "");
      const hasMembers = !!(artist.members && String(artist.members).trim() !== "");
      const hasLinks = !!(artist.socialLinks && artist.socialLinks.length > 0);

      const emptyNoticeElem = document.getElementById('sheet-empty-notice');
      const bioSection = document.getElementById('sheet-bio-section');
      const membersSection = document.getElementById('sheet-members-section');
      const linksSection = document.getElementById('sheet-links-section');

      if (!hasBio && !hasMembers && !hasLinks) {
        if (emptyNoticeElem) emptyNoticeElem.style.display = 'block';
        if (bioSection) bioSection.style.display = 'none';
        if (membersSection) membersSection.style.display = 'none';
        if (linksSection) linksSection.style.display = 'none';
      } else {
        if (emptyNoticeElem) emptyNoticeElem.style.display = 'none';

        if (bioSection) {
          bioSection.style.display = hasBio ? 'block' : 'none';
          const bioP = document.getElementById('sheet-artist-bio');
          if (bioP) bioP.innerText = artist.bio || "";
        }

        if (membersSection) {
          membersSection.style.display = hasMembers ? 'block' : 'none';
          const memDiv = document.getElementById('sheet-artist-members');
          if (memDiv) memDiv.innerText = artist.members || "";
        }

        if (linksSection) {
          linksSection.style.display = hasLinks ? 'block' : 'none';
          const linksContainer = document.getElementById('sheet-artist-links');
          if (linksContainer) {
            if (hasLinks) {
              linksContainer.innerHTML = artist.socialLinks.flatMap(link => {
                const urls = link.url.split(/\r?\n/).filter(u => u.trim() !== "");
                return urls.map(u => {
                  const urlStr = u.trim();
                  const href = urlStr.startsWith('http') ? urlStr : 'https://' + urlStr;
                  return `<a href="${href}" target="_blank" class="sheet-link-btn">${link.label}</a>`;
                });
              }).join('');
            } else {
              linksContainer.innerHTML = '';
            }
          }
        }
      }
      
      const favBtn = document.getElementById('sheet-fav-btn');
      if (isFav) {
        favBtn.classList.add('active');
        document.getElementById('sheet-fav-icon').setAttribute('fill', 'currentColor');
      } else {
        favBtn.classList.remove('active');
        document.getElementById('sheet-fav-icon').setAttribute('fill', 'none');
      }

      // Notes
      document.getElementById('sheet-private-note').value = getPrivateNote(artistId);

      // Intent Tags
      const currentTags = getArtistTags(artistId);
      document.querySelectorAll('.sheet-intent-tag-btn').forEach(btn => {
        const t = btn.getAttribute('data-tag');
        if (currentTags.includes(t)) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      const statusElem = document.getElementById('sheet-save-status');
      if (statusElem) {
        const isOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);
        const hasPending = !!localStorage.getItem('imsf_pending_sync_' + currentGuestEmail);
        if (isOffline || hasPending) {
          statusElem.innerText = 'Saved on device (offline)';
        } else {
          statusElem.innerText = '';
        }
      }

      // Media Embed - Removed Spotify Embed
      const mediaContainer = document.getElementById('sheet-media-container');
      const embedWrapper = document.getElementById('sheet-embed-wrapper');
      embedWrapper.innerHTML = '';
      mediaContainer.style.display = 'none';

      // Show
      const artistSheet = document.getElementById('artist-bottom-sheet');
      document.getElementById('artist-sheet-overlay').classList.add('active');
      if (artistSheet) artistSheet.classList.add('active');
      document.body.style.overflow = 'hidden'; // prevent bg scrolling

      // Ensure scroll is reset to top on open
      if (artistSheet) {
        artistSheet.scrollTop = 0;
        const sheetContentEl = artistSheet.querySelector('.sheet-content');
        if (sheetContentEl) sheetContentEl.scrollTop = 0;
      }
      requestAnimationFrame(() => {
        if (artistSheet) {
          artistSheet.scrollTop = 0;
          const sheetContentEl = artistSheet.querySelector('.sheet-content');
          if (sheetContentEl) sheetContentEl.scrollTop = 0;
        }
      });
      
      // Setting hash creates a reliable history entry on all mobile browsers
      if (!isFromHash && window.location.hash !== "#sheet") {
        window.location.hash = "sheet";
      }
    }

    function closeArtistSheet(isHashChange) {
      flushFeedbackAutoSave();
      const artistSheet = document.getElementById('artist-bottom-sheet');
      if (artistSheet) {
        artistSheet.scrollTop = 0;
        const sheetContentEl = artistSheet.querySelector('.sheet-content');
        if (sheetContentEl) sheetContentEl.scrollTop = 0;
        artistSheet.classList.remove('active');
      }
      document.getElementById('artist-sheet-overlay').classList.remove('active');
      document.body.style.overflow = '';
      currentOpenArtistId = null;
      // Re-render grid to reflect any favorite changes from sheet
      filterArtists();
      
      // If we closed it manually via the X or overlay, we must clean up the hash
      if (isHashChange !== true && (window.location.hash === "#sheet" || window.location.hash === "#timetable")) {
        history.back();
      }
    }

    window.addEventListener('hashchange', function() {
      // 1. If returning to #sheet (e.g. Back button pressed from #timetable)
      if (window.location.hash === "#sheet") {
        if (!document.getElementById('artist-bottom-sheet').classList.contains('active')) {
          if (lastOpenedArtistId) {
            if (typeof switchCategoryTab === 'function') {
              switchCategoryTab('artists');
            }
            if (typeof switchArtistsSubTab === 'function') {
              switchArtistsSubTab(artistOpenedFromSubTab || 'directory');
            }
            openArtistSheet(lastOpenedArtistId, true);
          }
        }
        return;
      }

      // 2. If the hash is no longer #sheet, but the artist sheet is open, close it.
      if (window.location.hash !== "#sheet" && document.getElementById('artist-bottom-sheet').classList.contains('active')) {
        closeArtistSheet(true);
      }
      // If the hash is no longer #guestsheet, but the guest sheet is open, close it.
      if (window.location.hash !== "#guestsheet" && document.getElementById('guest-bottom-sheet').classList.contains('active')) {
        closeGuestSheet(true);
      }
      // If the hash is no longer #updates, but the updates panel is open, close it.
      if (window.location.hash !== "#updates" && document.getElementById('updates-panel').style.left === "0px") {
        toggleUpdatesPanel(true);
      }
      // If the hash is no longer #adminsheet, but the admin sheet is open, close it.
      if (window.location.hash !== "#adminsheet" && document.getElementById('admin-bottom-sheet') && document.getElementById('admin-bottom-sheet').classList.contains('active')) {
        closeAdminModal(true);
      }
      // If the hash is no longer #networkingsheet, but the networking sheet is open, close it.
      if (window.location.hash !== "#networkingsheet" && document.getElementById('networking-bottom-sheet') && document.getElementById('networking-bottom-sheet').classList.contains('active')) {
        if (typeof closeNetworkingDetailSheet === 'function') {
          closeNetworkingDetailSheet(true);
        }
      }
    });


    function toggleSheetFav(event) {
      if (!currentOpenArtistId) return;
      event.stopPropagation();
      const favs = getFavorites();
      const favBtn = document.getElementById('sheet-fav-btn');
      
      if (favs[currentOpenArtistId]) {
        delete favs[currentOpenArtistId];
        favBtn.classList.remove('active');
        document.getElementById('sheet-fav-icon').setAttribute('fill', 'none');
      } else {
        favs[currentOpenArtistId] = true;
        favBtn.classList.add('active');
        document.getElementById('sheet-fav-icon').setAttribute('fill', 'currentColor');
      }
      saveFavorites(favs);
      triggerFeedbackAutoSave(1500);
      if (typeof updateTimetableFavCount === 'function') updateTimetableFavCount();
    }

    function savePrivateNote() {
      if (!currentOpenArtistId) return;
      const note = document.getElementById('sheet-private-note').value;
      savePrivateNoteLocally(currentOpenArtistId, note);
      triggerFeedbackAutoSave(3500);
    }

    function exportBriefcase() {
      alert("This will generate and download a PDF summarizing your liked artists and private notes!");
    }

    /* ==========================================================================
       FESTIVAL TIMETABLE CONTROLLER & DATA ENGINE
       ========================================================================== */
    let currentArtistsSubTab = 'directory'; // 'directory' | 'timetable'
    let currentSelectedTimetableDate = '2026-11-17';
    let currentSelectedStage = 'All';
    let currentTimetableMode = 'all'; // 'all' | 'schedule'
    let timetableFavsOnly = false;

    const FESTIVAL_TIMETABLE_DAYS = [
      {
        date: '2026-11-17',
        dayOfWeek: 'Tue',
        dayNum: '17',
        city: 'Jerusalem',
        venue: 'Yellow Submarine & Car Parking Space',
        meta: 'Doors 19:15 | Submarine Hall & Lower Parking Lot | Aftershow 23:10',
        stages: ['All', 'Submarine Hall', 'Parking Lot', 'Aftershow']
      },
      {
        date: '2026-11-18',
        dayOfWeek: 'Wed',
        dayNum: '18',
        city: 'Jerusalem',
        venue: 'Tower of David Museum & Yellow Submarine',
        meta: 'Afternoon at Museum (Doors 12:30) | Evening at Submarine (Doors 19:30)',
        stages: ['All', 'Tower of David', 'Submarine Hall']
      },
      {
        date: '2026-11-19',
        dayOfWeek: 'Thu',
        dayNum: '19',
        city: 'Jerusalem',
        venue: 'Museum of Tolerance',
        meta: 'Doors 18:30 | B2 Main Stage, Grand Hall 1 & 2, Prayer Room, Auditorium, Plaza & Amphi',
        stages: ['All', 'B2 Main Stage', 'Grand Hall 1', 'Grand Hall 2', 'Grand Hall Full', 'Prayer Room', 'Auditorium 400', 'Plaza Stage', 'Amphi', 'Nocturno Club']
      },
      {
        date: '2026-11-20',
        dayOfWeek: 'Fri',
        dayNum: '20',
        city: 'Tel Aviv',
        venue: 'Teder (Tel Aviv Jazz Festival)',
        meta: 'From 18:00 | 4 Simultaneous Stages: Main Plaza, Kissa, Juanita, Matmon',
        stages: ['All', 'Main Plaza', 'Kissa', 'Juanita', 'Matmon']
      },
      {
        date: '2026-11-21',
        dayOfWeek: 'Sat',
        dayNum: '21',
        city: 'Tel Aviv',
        venue: 'Radical Complex & Hameretz 2',
        meta: 'Doors 14:00 | Grand Hall, The Club, Sculpture Yard, Fish Market, Hameretz 2',
        stages: ['All', 'Grand Hall', 'The Club', 'Sculpture Yard', 'Fish Market', 'Hameretz 2']
      },
      {
        date: '2026-11-22',
        dayOfWeek: 'Sun',
        dayNum: '22',
        city: 'Jaffa / Tel Aviv',
        venue: 'Container House, Jaffa Port',
        meta: 'Official Networking (14:00-16:00) | Live Shows, DJ Sets & Closing Event',
        stages: ['All', 'Container House']
      }
    ];

    const DEFAULT_FESTIVAL_SHOWS_SCHEDULE = [
      {
            "id": "show_1_1",
            "date": "2026-11-17",
            "stage": "Submarine Hall",
            "startTime": "18:00",
            "endTime": "19:30",
            "artistName": "Guest Reception (קבלת פנים אורחים)",
            "format": "Deck / Reception",
            "isGeneralEvent": true
      },
      {
            "id": "show_1_2",
            "date": "2026-11-17",
            "stage": "Submarine Hall",
            "startTime": "19:15",
            "endTime": "19:45",
            "artistName": "Doors Opening",
            "format": "Hall Doors",
            "isGeneralEvent": true
      },
      {
            "id": "show_1_3",
            "date": "2026-11-17",
            "stage": "Submarine Hall",
            "startTime": "19:45",
            "endTime": "20:10",
            "artistName": "Daniel Zamir & Zohar Fresco",
            "aliases": [
                  "דניאל זמיר וזהר פרסקו",
                  "דניאל זמיר",
                  "Daniel Zamir"
            ],
            "format": "Seated Show"
      },
      {
            "id": "show_1_4",
            "date": "2026-11-17",
            "stage": "Submarine Hall",
            "startTime": "20:20",
            "endTime": "20:45",
            "artistName": "Yonathan Avishai Ensemble",
            "aliases": [
                  "יונתן אבישי אנסמבל",
                  "יונתן אבישי",
                  "Yonathan Avishai"
            ],
            "format": "Seated Show"
      },
      {
            "id": "show_1_5",
            "date": "2026-11-17",
            "stage": "Parking Lot",
            "startTime": "20:00",
            "endTime": "21:00",
            "artistName": "Doors Opening & DJ Set",
            "format": "Parking Lot Stage",
            "isGeneralEvent": true
      },
      {
            "id": "show_1_6",
            "date": "2026-11-17",
            "stage": "Parking Lot",
            "startTime": "21:00",
            "endTime": "21:30",
            "artistName": "The Kadosh Brothers",
            "aliases": [
                  "האחים קדוש",
                  "Kadosh Brothers"
            ],
            "format": "Standing Show"
      },
      {
            "id": "show_1_7",
            "date": "2026-11-17",
            "stage": "Parking Lot",
            "startTime": "21:45",
            "endTime": "22:15",
            "artistName": "Mark Eliyahu",
            "aliases": [
                  "מארק אליהו"
            ],
            "format": "Standing Show"
      },
      {
            "id": "show_1_8",
            "date": "2026-11-17",
            "stage": "Parking Lot",
            "startTime": "22:30",
            "endTime": "23:00",
            "artistName": "Shaman Shaman Ensemble",
            "aliases": [
                  "שאמאן שאמאן",
                  "Shaman Shaman"
            ],
            "format": "Standing Show"
      },
      {
            "id": "show_1_9",
            "date": "2026-11-17",
            "stage": "Aftershow",
            "startTime": "23:00",
            "endTime": "23:10",
            "artistName": "Aftershow Doors",
            "format": "Yellow Submarine Club",
            "isGeneralEvent": true
      },
      {
            "id": "show_1_10",
            "date": "2026-11-17",
            "stage": "Aftershow",
            "startTime": "23:10",
            "endTime": "23:40",
            "artistName": "KADMON",
            "aliases": [
                  "קדמון"
            ],
            "format": "Aftershow Party / Free Entry"
      },
      {
            "id": "show_1_dj_adi_bareket",
            "date": "2026-11-17",
            "stage": "Parking Lot",
            "startTime": "",
            "endTime": "",
            "artistName": "DJ Adi Bareket",
            "aliases": [
                  "DJ ADI BAREKET",
                  "Adi Bareket",
                  "עדי ברקת"
            ],
            "format": "DJ Set"
      },
      {
            "id": "show_2_1",
            "date": "2026-11-18",
            "stage": "Tower of David",
            "startTime": "12:30",
            "endTime": "13:00",
            "artistName": "Doors Opening",
            "format": "Museum Courtyard",
            "isGeneralEvent": true
      },
      {
            "id": "show_2_2",
            "date": "2026-11-18",
            "stage": "Tower of David",
            "startTime": "13:00",
            "endTime": "13:25",
            "artistName": "Amitai Aricha @ The D-ONE Project",
            "aliases": [
                  "אמיתי אריכא ופרויקט ה-D-ONE",
                  "אמיתי אריכא",
                  "Amitai Aricha & The D-ONE Project"
            ],
            "format": "Museum Courtyard"
      },
      {
            "id": "show_2_3",
            "date": "2026-11-18",
            "stage": "Tower of David",
            "startTime": "13:40",
            "endTime": "14:05",
            "artistName": "Keren Ilan",
            "aliases": [
                  "קרן אילן"
            ],
            "format": "Museum Courtyard"
      },
      {
            "id": "show_2_4",
            "date": "2026-11-18",
            "stage": "Tower of David",
            "startTime": "14:20",
            "endTime": "14:45",
            "artistName": "Yael Deckelbaum",
            "aliases": [
                  "יעל דקלבאום"
            ],
            "format": "Museum Courtyard"
      },
      {
            "id": "show_2_5",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "19:30",
            "endTime": "20:20",
            "artistName": "Doors Opening",
            "format": "Evening Showcase",
            "isGeneralEvent": true
      },
      {
            "id": "show_2_6",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "20:20",
            "endTime": "20:45",
            "artistName": "Yonatan Tagger",
            "aliases": [
                  "יונתן טג'ר",
                  "יונתן תג'ר",
                  "Yonatan Tagger"
            ],
            "format": "Seated Show"
      },
      {
            "id": "show_2_7",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "20:55",
            "endTime": "21:20",
            "artistName": "Alon Near Trio",
            "aliases": [
                  "אלון ניר",
                  "שלישיית אלון ניר"
            ],
            "format": "Seated Show"
      },
      {
            "id": "show_2_8",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "21:30",
            "endTime": "21:55",
            "artistName": "The Israel Jazz Orchestra",
            "aliases": [
                  "תזמורת הג'אז הישראלית",
                  "תזמורת הגאז הישראלית"
            ],
            "format": "Standing Show"
      },
      {
            "id": "show_2_9",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "21:55",
            "endTime": "22:15",
            "artistName": "Intermission (20 min)",
            "format": "Break",
            "isGeneralEvent": true
      },
      {
            "id": "show_2_10",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "22:15",
            "endTime": "22:40",
            "artistName": "Masok",
            "aliases": [
                  "מסוק"
            ],
            "format": "Standing Show"
      },
      {
            "id": "show_2_11",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "22:50",
            "endTime": "23:15",
            "artistName": "HAZE'EVOT",
            "aliases": [
                  "הזאבות",
                  "הדזאבות",
                  "Haze'evot"
            ],
            "format": "Standing Show"
      },
      {
            "id": "show_2_12",
            "date": "2026-11-18",
            "stage": "Submarine Hall",
            "startTime": "23:25",
            "endTime": "00:00",
            "artistName": "BĘÃTFÓØT",
            "aliases": [
                  "BĘÃTFÓØT",
                  "BEATFOOT",
                  "BEĀTFÖØT",
                  "ביטפוט"
            ],
            "format": "Late Night Set"
      },
      {
            "id": "show_3_1",
            "date": "2026-11-19",
            "stage": "Museum of Tolerance",
            "startTime": "18:30",
            "endTime": "19:00",
            "artistName": "Doors Opening",
            "format": "Museum Complex",
            "isGeneralEvent": true
      },
      {
            "id": "show_3_2",
            "date": "2026-11-19",
            "stage": "Plaza",
            "startTime": "19:00",
            "endTime": "19:30",
            "artistName": "Itamar Doari",
            "aliases": [
                  "איתמר דוארי"
            ],
            "format": "Plaza Stage"
      },
      {
            "id": "show_3_3",
            "date": "2026-11-19",
            "stage": "Grand Hall 2",
            "startTime": "19:30",
            "endTime": "20:00",
            "artistName": "Portman-T",
            "aliases": [
                  "פורטמן טי",
                  "Portman T"
            ],
            "format": "Hall Stage"
      },
      {
            "id": "show_3_4",
            "date": "2026-11-19",
            "stage": "B2 Main Stage",
            "startTime": "19:45",
            "endTime": "20:15",
            "artistName": "Deswa",
            "aliases": [
                  "דסווה",
                  "Deswa"
            ],
            "format": "B2 Central"
      },
      {
            "id": "show_3_5",
            "date": "2026-11-19",
            "stage": "Grand Hall 1",
            "startTime": "20:00",
            "endTime": "20:30",
            "artistName": "SHEN",
            "aliases": [
                  "שן",
                  "Shen"
            ],
            "format": "Grand Hall"
      },
      {
            "id": "show_3_6",
            "date": "2026-11-19",
            "stage": "Auditorium 400",
            "startTime": "20:15",
            "endTime": "20:45",
            "artistName": "The Addis Ken Project",
            "aliases": [
                  "פרויקט אדיס קן",
                  "אדיס קן"
            ],
            "format": "Auditorium"
      },
      {
            "id": "show_3_7",
            "date": "2026-11-19",
            "stage": "Prayer Room",
            "startTime": "20:30",
            "endTime": "21:00",
            "artistName": "GRAPE",
            "aliases": [
                  "גרייפ",
                  "חדר תפילה"
            ],
            "format": "Prayer Room Acoustic"
      },
      {
            "id": "show_3_8",
            "date": "2026-11-19",
            "stage": "Plaza",
            "startTime": "21:00",
            "endTime": "21:30",
            "artistName": "Joseph E-Shine",
            "aliases": [
                  "ג'וזף אי שיין",
                  "Joseph E Shine"
            ],
            "format": "Plaza Stage"
      },
      {
            "id": "show_3_9",
            "date": "2026-11-19",
            "stage": "B2 Main Stage",
            "startTime": "21:15",
            "endTime": "21:45",
            "artistName": "SHIRAN&BAKAL",
            "aliases": [
                  "שירן ובקל",
                  "SHIRAN & BAKAL"
            ],
            "format": "B2 Central"
      },
      {
            "id": "show_3_10",
            "date": "2026-11-19",
            "stage": "Grand Hall 2",
            "startTime": "21:30",
            "endTime": "22:00",
            "artistName": "Boogie Balagan",
            "aliases": [
                  "בוגי בלגן"
            ],
            "format": "Hall Stage"
      },
      {
            "id": "show_3_11",
            "date": "2026-11-19",
            "stage": "Auditorium 400",
            "startTime": "21:45",
            "endTime": "22:15",
            "artistName": "Nigun Quartet",
            "aliases": [
                  "רביעיית ניגון"
            ],
            "format": "Auditorium"
      },
      {
            "id": "show_3_12",
            "date": "2026-11-19",
            "stage": "Grand Hall 1",
            "startTime": "22:00",
            "endTime": "22:30",
            "artistName": "The Pretty Please",
            "aliases": [
                  "דה פריטי פליז"
            ],
            "format": "Grand Hall"
      },
      {
            "id": "show_3_13",
            "date": "2026-11-19",
            "stage": "B2 Main Stage",
            "startTime": "22:15",
            "endTime": "22:45",
            "artistName": "MAGI",
            "aliases": [
                  "מאגי"
            ],
            "format": "B2 Central"
      },
      {
            "id": "show_3_14",
            "date": "2026-11-19",
            "stage": "Plaza",
            "startTime": "22:20",
            "endTime": "22:50",
            "artistName": "BILTEEZ\n(Ester Rada, Daniel Zamir, & Michael Meital)",
            "aliases": [
                  "BILTEEZ",
                  "בילטיז",
                  "אסתר רדא דניאל זמיר ומיכאל מיטל",
                  "BILTEEZ (אסתר רדא, דניאל זמיר ומיכאל מיטל)"
            ],
            "format": "Plaza Headline"
      },
      {
            "id": "show_3_15",
            "date": "2026-11-19",
            "stage": "Prayer Room",
            "startTime": "22:45",
            "endTime": "23:15",
            "artistName": "Ice Hokku",
            "aliases": [
                  "אייס הוקו"
            ],
            "format": "Prayer Room Acoustic"
      },
      {
            "id": "show_3_16",
            "date": "2026-11-19",
            "stage": "Grand Hall Full",
            "startTime": "23:15",
            "endTime": "23:45",
            "artistName": "ALAL",
            "aliases": [
                  "עלעל",
                  "אלל"
            ],
            "format": "Grand Hall Full"
      },
      {
            "id": "show_3_17",
            "date": "2026-11-19",
            "stage": "Nocturno Club",
            "startTime": "23:00",
            "endTime": "01:00",
            "artistName": "Las Piratas Piratas",
            "aliases": [
                  "הפיראטיות",
                  "פיראטיות",
                  "אפטר בנוקטורנו הפיראטיות"
            ],
            "format": "Aftershow at Nocturno Club"
      },
      {
            "id": "show_4_1",
            "date": "2026-11-20",
            "stage": "Main Plaza",
            "startTime": "18:00",
            "endTime": "18:45",
            "artistName": "Shay Hazan - DAWA",
            "aliases": [
                  "שי חזן",
                  "Shay Hazan",
                  "DAWA"
            ],
            "format": "Main Courtyard"
      },
      {
            "id": "show_4_2",
            "date": "2026-11-20",
            "stage": "Kissa",
            "startTime": "18:30",
            "endTime": "19:15",
            "artistName": "Tamar Shawki",
            "aliases": [
                  "תמר שאוקי"
            ],
            "format": "Intimate Listening Room"
      },
      {
            "id": "show_4_3",
            "date": "2026-11-20",
            "stage": "Matmon",
            "startTime": "20:30",
            "endTime": "21:15",
            "artistName": "Eyal Netzer & Strings",
            "aliases": [
                  "אייל נצר",
                  "Eyal Netzer"
            ],
            "format": "Matmon Space"
      },
      {
            "id": "show_4_4",
            "date": "2026-11-20",
            "stage": "Matmon",
            "startTime": "21:30",
            "endTime": "22:15",
            "artistName": "Floating Sheep",
            "aliases": [
                  "פלואוטינג שיפ",
                  "כבשים מרחפות"
            ],
            "format": "Matmon Space"
      },
      {
            "id": "show_4_5",
            "date": "2026-11-20",
            "stage": "Juanita",
            "startTime": "22:00",
            "endTime": "22:45",
            "artistName": "SHALOSH",
            "aliases": [
                  "שלוש"
            ],
            "format": "Juanita Stage"
      },
      {
            "id": "show_4_6",
            "date": "2026-11-20",
            "stage": "Kissa",
            "startTime": "22:30",
            "endTime": "23:15",
            "artistName": "Ariel Bart Trio",
            "aliases": [
                  "שלישיית אריאל ברט",
                  "אריאל ברט"
            ],
            "format": "Intimate Listening Room"
      },
      {
            "id": "show_4_7",
            "date": "2026-11-20",
            "stage": "Matmon",
            "startTime": "23:00",
            "endTime": "23:45",
            "artistName": "Sandia",
            "aliases": [
                  "סנדיה"
            ],
            "format": "Matmon Space"
      },
      {
            "id": "show_5_1",
            "date": "2026-11-21",
            "stage": "The Radical",
            "startTime": "14:00",
            "endTime": "14:30",
            "artistName": "Doors Opening & Fish Market Sessions",
            "format": "Complex Doors",
            "isGeneralEvent": true
      },
      {
            "id": "show_5_2",
            "date": "2026-11-21",
            "stage": "Grand Hall",
            "startTime": "14:30",
            "endTime": "14:55",
            "artistName": "Meitarai",
            "aliases": [
                  "מיתריי",
                  "Meitarai"
            ],
            "format": "Grand Hall"
      },
      {
            "id": "show_5_3",
            "date": "2026-11-21",
            "stage": "The Club",
            "startTime": "15:15",
            "endTime": "15:40",
            "artistName": "The Minister",
            "aliases": [
                  "דה מיניסטר",
                  "The Minister"
            ],
            "format": "Club Stage"
      },
      {
            "id": "show_5_4",
            "date": "2026-11-21",
            "stage": "Sculpture Yard",
            "startTime": "15:45",
            "endTime": "16:10",
            "artistName": "AVIRAM",
            "aliases": [
                  "אבירם"
            ],
            "format": "Outdoor Yard"
      },
      {
            "id": "show_5_5",
            "date": "2026-11-21",
            "stage": "The Club",
            "startTime": "16:30",
            "endTime": "16:55",
            "artistName": "Tamir Grinberg",
            "aliases": [
                  "תמיר גרינברג"
            ],
            "format": "Club Stage"
      },
      {
            "id": "show_5_6",
            "date": "2026-11-21",
            "stage": "Grand Hall",
            "startTime": "17:00",
            "endTime": "17:25",
            "artistName": "Maya Belsitzman & Matan Ephrat",
            "aliases": [
                  "מאיה בלזיצמן ומתן אפרת",
                  "מאיה בלזיצמן"
            ],
            "format": "Grand Hall"
      },
      {
            "id": "show_5_7",
            "date": "2026-11-21",
            "stage": "The Club",
            "startTime": "17:30",
            "endTime": "17:55",
            "artistName": "Shir Shani",
            "aliases": [
                  "שיר שני"
            ],
            "format": "Club Stage"
      },
      {
            "id": "show_5_8",
            "date": "2026-11-21",
            "stage": "Sculpture Yard",
            "startTime": "18:05",
            "endTime": "18:30",
            "artistName": "Allan Tune",
            "aliases": [
                  "אלן טיון"
            ],
            "format": "Outdoor Yard"
      },
      {
            "id": "show_5_9",
            "date": "2026-11-21",
            "stage": "Hameretz 2",
            "startTime": "20:30",
            "endTime": "21:30",
            "artistName": "Doors Opening & DJ Set",
            "format": "Hameretz 2 Club",
            "isGeneralEvent": true
      },
      {
            "id": "show_5_10",
            "date": "2026-11-21",
            "stage": "Hameretz 2",
            "startTime": "21:30",
            "endTime": "22:00",
            "artistName": "YUZ",
            "aliases": [
                  "יוז"
            ],
            "format": "Hameretz 2 Stage"
      },
      {
            "id": "show_5_11",
            "date": "2026-11-21",
            "stage": "Hameretz 2",
            "startTime": "22:15",
            "endTime": "22:45",
            "artistName": "TAPASH",
            "aliases": [
                  "טאפש"
            ],
            "format": "Hameretz 2 Stage"
      },
      {
            "id": "show_5_12",
            "date": "2026-11-21",
            "stage": "Hameretz 2",
            "startTime": "23:00",
            "endTime": "23:30",
            "artistName": "Eden Derso",
            "aliases": [
                  "עדן דרסו"
            ],
            "format": "Hameretz 2 Stage"
      },
      {
            "id": "show_5_dj_ram_malca",
            "date": "2026-11-21",
            "stage": "Hameretz 2",
            "startTime": "",
            "endTime": "",
            "artistName": "DJ Ram Malca",
            "aliases": [
                  "DJ Ram Malca",
                  "רם מלכה",
                  "Ram Malca"
            ],
            "format": "DJ Set"
      },
      {
            "id": "show_6_1",
            "date": "2026-11-22",
            "stage": "Container House",
            "startTime": "14:00",
            "endTime": "16:00",
            "artistName": "Official Delegation Networking Event",
            "format": "Beit HaMecholot, Jaffa Port",
            "isGeneralEvent": true
      },
      {
            "id": "show_6_2",
            "date": "2026-11-22",
            "stage": "Container House",
            "startTime": "14:00",
            "endTime": "18:00",
            "artistName": "Fortuna Records",
            "aliases": [
                  "פורטונה רקורדס",
                  "פורטונה"
            ],
            "format": "DJ Set & Networking"
      },
      {
            "id": "show_6_3",
            "date": "2026-11-22",
            "stage": "Container House",
            "startTime": "17:00",
            "endTime": "18:00",
            "artistName": "FeelBeat Ensemble",
            "aliases": [
                  "אנסמבל פיל ביית",
                  "אנסמבל פיל בית",
                  "פיל בית",
                  "פילבט"
            ],
            "format": "Closing Showcase Live Concert"
      }
];

    function normalizeArtistString(str) {
      if (!str) return '';
      return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[ę]/g, 'e').replace(/[ãáàâä]/g, 'a').replace(/[óòôö]/g, 'o').replace(/[øö]/g, 'o')
        .replace(/['"״׳`]/g, '')
        .replace(/[\-–—@&(),.\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const ARTIST_NAME_ALIASES_DICT = {
      'דניאל זמיר וזהר פרסקו': 'Daniel Zamir & Zohar Fresco',
      'יונתן אבישי אנסמבל': 'Yonathan Avishai Ensemble',
      'האחים קדוש': 'The Kadosh Brothers',
      'מארק אליהו': 'Mark Eliyahu',
      'קדמון': 'KADMON',
      'אמיתי אריכא ופרויקט ה-d-one': 'Amitai Aricha @ The D-ONE Project',
      'אמיתי אריכא': 'Amitai Aricha @ The D-ONE Project',
      'קרן אילן': 'Keren Ilan',
      'יעל דקלבאום': 'Yael Deckelbaum',
      'יונתן טגר': 'Yonatan Tagger',
      'יונתן תגר': 'Yonatan Tagger',
      'שלישיית אלון ניר': 'Alon Near Trio',
      'אלון ניר': 'Alon Near Trio',
      'תזמורת הגאז הישראלית': 'The Israel Jazz Orchestra',
      'הזאבות': "HAZE'EVOT",
      'הדזאבות': "HAZE'EVOT",
      'ביטפוט': 'BĘÃTFÓØT',
      'beatfoot': 'BĘÃTFÓØT',
      'שן': 'SHEN',
      'שירן ובקל': 'SHIRAN&BAKAL',
      'מאגי': 'MAGI',
      'דה פריטי פליז': 'The Pretty Please',
      'בוגי בלגן': 'Boogie Balagan',
      'פורטמן טי': 'Portman-T',
      'שי חזן': 'Shay Hazan - DAWA',
      'dawa': 'Shay Hazan - DAWA',
      'שלוש': 'SHALOSH',
      'תמר שאוקי': 'Tamar Shawki',
      'שלישיית אריאל ברט': 'Ariel Bart Trio',
      'אריאל ברט': 'Ariel Bart Trio',
      'איל נצר': 'Eyal Netzer & Strings',
      'אייל נצר': 'Eyal Netzer & Strings',
      'סנדיה': 'Sandia',
      'כבשים מרחפות': 'Floating Sheep',
      'מיתריי': 'Meitarai',
      'מאיה בלזיצמן ומתן אפרת': 'Maya Belsitzman & Matan Ephrat',
      'מאיה בלזיצמן': 'Maya Belsitzman & Matan Ephrat',
      'תמיר גרינברג': 'Tamir Grinberg',
      'שיר שני': 'Shir Shani',
      'אבירם': 'AVIRAM',
      'אלן טיון': 'Allan Tune',
      'יוז': 'YUZ',
      'טאפש': 'TAPASH',
      'אדיס קן': 'The Addis Ken Project',
      'פרויקט אדיס קן': 'The Addis Ken Project',
      'רביעיית ניגון': 'Nigun Quartet',
      'איתמר דוארי': 'Itamar Doari',
      'דסווה': 'Deswa',
      'deswa': 'Deswa',
      "ג'וזף אי שיין": 'Joseph E-Shine',
      'joseph e shine': 'Joseph E-Shine',
      'בילטיז': 'BILTEEZ\n(Ester Rada, Daniel Zamir, & Michael Meital)',
      'bilteez': 'BILTEEZ\n(Ester Rada, Daniel Zamir, & Michael Meital)',
      'עדן דרסו': 'Eden Derso',
      'eden derso': 'Eden Derso',
      'אנסמבל פיל ביית': 'FeelBeat Ensemble',
      'אנסמבל פיל בית': 'FeelBeat Ensemble',
      'פיל בית': 'FeelBeat Ensemble',
      'פילבט': 'FeelBeat Ensemble',
      'feelbeat': 'FeelBeat Ensemble',
      'feelbeat ensemble': 'FeelBeat Ensemble',
      'רם מלכה': 'DJ Ram Malca',
      'dj ram malca': 'DJ Ram Malca',
      'fortuna records': 'Fortuna Records',
      'פורטונה רקורדס': 'Fortuna Records',
      'פורטונה': 'Fortuna Records',
      'שאמן שאמן': 'Shaman Shaman Ensemble',
      'shaman shaman': 'Shaman Shaman Ensemble',
      'שיווה ביווה': 'SHIWABIWA B2B ISC',
      'shiwabiwa': 'SHIWABIWA B2B ISC',
      'דיגיי עדי ברקת': 'DJ Adi Bareket',
      'עדי ברקת': 'DJ Adi Bareket',
      'dj adi bareket': 'DJ Adi Bareket',
      'הפיראטיות': 'Las Piratas Piratas',
      'פיראטיות': 'Las Piratas Piratas',
      'אפטר בנוקטורנו הפיראטיות': 'Las Piratas Piratas',
      'אפטר בנוקטורנו': 'Las Piratas Piratas',
      'las piratas piratas': 'Las Piratas Piratas',
      'piratas': 'Las Piratas Piratas'
    };

    function findMatchedArtist(artistName, aliases) {
      if (!artistName) return null;
      const queries = [artistName, ...(aliases || [])];

      // 1. Check known alias dictionary
      for (const q of queries) {
        const normQ = normalizeArtistString(q);
        if (ARTIST_NAME_ALIASES_DICT[normQ]) {
          const targetName = normalizeArtistString(ARTIST_NAME_ALIASES_DICT[normQ]);
          if (globalArtistsData && globalArtistsData.length > 0) {
            const match = globalArtistsData.find(a => normalizeArtistString(a.name) === targetName);
            if (match) return match;
          }
        }
        for (const [key, val] of Object.entries(ARTIST_NAME_ALIASES_DICT)) {
          if (normQ.includes(key) || key.includes(normQ)) {
            const targetName = normalizeArtistString(val);
            if (globalArtistsData && globalArtistsData.length > 0) {
              const match = globalArtistsData.find(a => normalizeArtistString(a.name) === targetName);
              if (match) return match;
            }
          }
        }
      }

      // 2. Direct normalized match or substring match
      if (globalArtistsData && globalArtistsData.length > 0) {
        const cleanQueries = queries.map(q => normalizeArtistString(q));
        for (const a of globalArtistsData) {
          const normA = normalizeArtistString(a.name);
          for (const q of cleanQueries) {
            if (!q) continue;
            if (normA === q) return a;
            if (q.length >= 4 && (normA.includes(q) || q.includes(normA))) {
              return a;
            }
          }
        }
      }

      return null;
    }

    function isNamedDJ(rawName, matchedArtist) {
      if (!rawName) return false;
      const s = String(rawName).trim();
      const lower = s.toLowerCase();

      // Exclude generic placeholders or notes
      if (/^[\s?؟!\-–—.,/\\|]+$/.test(s)) return false;
      if (lower === 'dj' || lower === 'dj?' || lower === 'dj ?' || lower === "דיג'יי" || lower === "דיגיי" || lower === "דיג'ייס" || lower === "תקלוט") {
        return false;
      }
      if (s === 'נועם הלפר' || s === 'רמזי' || s === 'מור' || s === 'אליענה') {
        return false;
      }

      // 1. If matched artist has 'dj' in name (e.g. 'DJ Adi Bareket')
      if (matchedArtist && matchedArtist.name && matchedArtist.name.toLowerCase().includes('dj')) {
        return true;
      }

      // 2. If alias dictionary maps to a name with DJ (e.g. 'DJ Ram Malca')
      const norm = normalizeArtistString(s);
      if (ARTIST_NAME_ALIASES_DICT[norm] && ARTIST_NAME_ALIASES_DICT[norm].toLowerCase().includes('dj')) {
        return true;
      }
      for (const [key, val] of Object.entries(ARTIST_NAME_ALIASES_DICT)) {
        if (val.toLowerCase().includes('dj') && (norm.includes(key) || key.includes(norm))) {
          return true;
        }
      }

      // 3. If string explicitly starts with DJ / דיג'יי / דיגיי followed by a name
      const djNameMatch = s.match(/^(?:dj|דיג['׳]?[יי]?)\s+([A-Za-z\u0590-\u05FF]{2,})/i);
      if (djNameMatch) {
        const after = djNameMatch[1].trim().toLowerCase();
        if (after !== 'set' && after !== '?' && after !== 'יס' && after !== 'סט') {
          return true;
        }
      }

      return false;
    }

    function shouldKeepTimetableItem(show) {
      if (!show || !show.artistName) return false;

      const raw = String(show.artistName).trim();
      const lower = raw.toLowerCase();

      const matched = findMatchedArtist(raw, show.aliases);
      const namedDJ = isNamedDJ(raw, matched);

      // If no start time: ONLY keep if it is a specific named DJ (e.g. DJ Adi Bareket, DJ Ram Malca)
      if (!show.startTime) {
        return namedDJ;
      }

      // 1. If it matches an artist from globalArtistsData or our alias dictionary, KEEP!
      if (matched) return true;

      const normRaw = normalizeArtistString(raw);
      if (ARTIST_NAME_ALIASES_DICT[normRaw]) return true;
      for (const [key, val] of Object.entries(ARTIST_NAME_ALIASES_DICT)) {
        if (normRaw === normalizeArtistString(val) || normRaw.includes(key) || key.includes(normRaw)) {
          return true;
        }
      }

      // 2. Reject pure question marks or symbols: '?', '???', '?', etc.
      if (/^[\s?؟!\-–—.,/\\|]+$/.test(raw)) return false;

      // 3. Reject notes, random stages, afterparties, or place comments
      if (
        raw.includes('מסתובבים') ||
        raw.includes('אפטרים') ||
        raw.includes('מזקקה') ||
        raw.includes('נוקטורנו') ||
        raw.includes('Besarabia') ||
        raw.includes('פרגמון') ||
        raw.includes('ש"ח') ||
        raw.includes('כרטיס משולב') ||
        raw.includes('כניסה חופשית') ||
        raw.includes('מופע ראשון') ||
        raw.includes('כחלק מפסטיבל') ||
        raw.includes('לדחות מופע') ||
        raw === "דיג'ייס" ||
        raw === 'נועם הלפר' || raw === 'רמזי' || raw === 'מור' || raw === 'אליענה'
      ) {
        return false;
      }

      // 4. Allowed general items with valid times:
      // - Doors opening: "דלתות", "פתיחת דלתות", "Doors"
      if (raw.includes('דלתות') || lower.includes('doors')) return true;

      // - DJ set: "DJ", "DJ?", "דיג'יי", "דיגיי", "תקלוט"
      if (
        raw.includes('DJ') || lower.includes('dj') ||
        raw.includes("דיג'יי") || raw.includes('דיגיי') || raw.includes('תקלוט')
      ) {
        return true;
      }

      // - Official reception / networking events / talks:
      if (
        raw.includes('קבלת פנים') ||
        raw.includes('נטוורקינג') ||
        raw.includes('הרצאה') ||
        raw.includes('מפגש') ||
        raw.includes('מופע ראשון') ||
        raw.includes('אירוע נעילה') ||
        raw.includes('הפסקה') ||
        raw.includes('Trade Fair') ||
        lower.includes('networking') ||
        lower.includes('reception') ||
        lower.includes('closing')
      ) {
        return true;
      }

      // Everything else without an artist match is discarded
      return false;
    }

    const TIMETABLE_CACHE_KEY = 'imsf_timetable_schedule_v10';

    let FESTIVAL_SHOWS_SCHEDULE = (function() {
      try {
        const cached = localStorage.getItem(TIMETABLE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(shouldKeepTimetableItem);
          }
        }
      } catch (e) {}
      return DEFAULT_FESTIVAL_SHOWS_SCHEDULE.filter(shouldKeepTimetableItem);
    })();
    window.FESTIVAL_SHOWS_SCHEDULE = FESTIVAL_SHOWS_SCHEDULE;

    let isFetchingTimetableSchedule = false;

    function fetchDynamicTimetableSchedule(forceRefresh) {
      if (typeof google === 'undefined' || !google.script || !google.script.run) return;
      if (isFetchingTimetableSchedule) return;
      isFetchingTimetableSchedule = true;

      const shouldForce = (forceRefresh !== false); // default to true to always get freshest changes
      google.script.run
        .withSuccessHandler(function(res) {
          isFetchingTimetableSchedule = false;
          if (res && res.success && Array.isArray(res.schedule) && res.schedule.length > 0) {
            const newSchedule = res.schedule.filter(shouldKeepTimetableItem);
            const prevSerialized = JSON.stringify(FESTIVAL_SHOWS_SCHEDULE);
            const newSerialized = JSON.stringify(newSchedule);
            
            FESTIVAL_SHOWS_SCHEDULE = newSchedule;
            try {
              localStorage.setItem(TIMETABLE_CACHE_KEY, newSerialized);
            } catch (e) {}

            // Re-render only if data actually changed or if view is visible
            if (prevSerialized !== newSerialized || currentArtistsSubTab === 'timetable') {
              if (typeof renderTimetableMasterSwitcher === 'function') renderTimetableMasterSwitcher();
              if (typeof renderTimetableStageSelector === 'function') renderTimetableStageSelector();
              if (typeof renderTimetableShows === 'function') renderTimetableShows();
              if (typeof updateTimetableFavCount === 'function') updateTimetableFavCount();
            }
          }
        })
        .withFailureHandler(function(err) {
          isFetchingTimetableSchedule = false;
          console.warn('Could not load dynamic timetable schedule from Google Sheets:', err);
        })
        .getFestivalTimetableSchedule(shouldForce);
    }
    window.fetchDynamicTimetableSchedule = fetchDynamicTimetableSchedule;

    // Real-time synchronization: automatically fetch fresh timetable on boot and on tab focus
    if (typeof window !== 'undefined') {
      setTimeout(function() {
        fetchDynamicTimetableSchedule(true);
      }, 600);

      window.addEventListener('focus', function() {
        fetchDynamicTimetableSchedule(true);
      });

      // Periodic background sync every 30 seconds if user is viewing timetable
      setInterval(function() {
        if (document.visibilityState === 'visible' && (currentArtistsSubTab === 'timetable' || (document.getElementById('artists-timetable-view') && document.getElementById('artists-timetable-view').style.display !== 'none'))) {
          fetchDynamicTimetableSchedule(true);
        }
      }, 30000);
    }

    function switchArtistsSubTab(subTabName) {
      currentArtistsSubTab = subTabName;
      const dirBtn = document.getElementById('subtab-artists-directory');
      const ttBtn = document.getElementById('subtab-artists-timetable');
      const dirView = document.getElementById('artists-directory-view');
      const ttView = document.getElementById('artists-timetable-view');
      
      if (dirBtn && ttBtn && dirView && ttView) {
        if (subTabName === 'directory') {
          dirBtn.classList.add('active');
          dirBtn.setAttribute('aria-selected', 'true');
          ttBtn.classList.remove('active');
          ttBtn.setAttribute('aria-selected', 'false');
          dirView.style.display = 'block';
          ttView.style.display = 'none';
        } else {
          dirBtn.classList.remove('active');
          dirBtn.setAttribute('aria-selected', 'false');
          ttBtn.classList.add('active');
          ttBtn.setAttribute('aria-selected', 'true');
          dirView.style.display = 'none';
          ttView.style.display = 'block';
          initFestivalTimetableUI();
          fetchDynamicTimetableSchedule(true);
        }
      }
    }
    window.switchArtistsSubTab = switchArtistsSubTab;

    function initFestivalTimetableUI() {
      renderTimetableDaysNav();
      renderTimetableVenueBanner();
      renderTimetableMasterSwitcher();
      renderTimetableStageSelector();
      renderTimetableShows();
      fetchDynamicTimetableSchedule(true);
    }
    window.initFestivalTimetableUI = initFestivalTimetableUI;

    function renderTimetableDaysNav() {
      const nav = document.getElementById('timetable-days-nav');
      if (!nav) return;
      let html = '';
      FESTIVAL_TIMETABLE_DAYS.forEach(day => {
        const isActive = (day.date === currentSelectedTimetableDate);
        html += `
          <button type="button" class="timetable-day-pill ${isActive ? 'active' : ''}" onclick="selectTimetableDate('${day.date}')" title="${day.venue}">
            <span class="day-weekday">${day.dayOfWeek}</span>
            <span class="day-num">${day.dayNum}</span>
          </button>
        `;
      });
      nav.innerHTML = html;
    }

    function renderTimetableVenueBanner() {
      const banner = document.getElementById('timetable-venue-banner');
      if (!banner) return;
      const dayObj = FESTIVAL_TIMETABLE_DAYS.find(d => d.date === currentSelectedTimetableDate) || FESTIVAL_TIMETABLE_DAYS[0];
      const doorInfo = dayObj.meta ? dayObj.meta.split('|')[0].trim() : '';
      banner.innerHTML = `
        <div class="timetable-venue-strip">
          <div class="venue-strip-left">
            <span class="venue-pin">📍</span>
            <span class="venue-name">${escapeHtml(dayObj.venue)}</span>
            <span class="timetable-city-badge">${escapeHtml(dayObj.city)}</span>
          </div>
          ${doorInfo ? `<div class="venue-doors-pill">${escapeHtml(doorInfo)}</div>` : ''}
        </div>
      `;
    }

    function renderTimetableMasterSwitcher() {
      const switcher = document.getElementById('timetable-master-switcher');
      if (!switcher) return;

      const favs = getFavorites();
      const dayShows = FESTIVAL_SHOWS_SCHEDULE.filter(s => s.date === currentSelectedTimetableDate && shouldKeepTimetableItem(s));
      const dayFavCount = dayShows.filter(s => {
        const matched = findMatchedArtist(s.artistName, s.aliases);
        return matched ? !!favs[matched.id] : false;
      }).length;

      const isAll = (currentTimetableMode === 'all');
      const isSched = (currentTimetableMode === 'schedule');

      switcher.innerHTML = `
        <div class="timetable-master-tabs">
          <button type="button" 
                  class="master-tab-btn ${isAll ? 'active' : ''}" 
                  onclick="setTimetableMode('all')">
            <span class="master-tab-icon">⚡</span>
            <span class="master-tab-label">Full Timetable</span>
            <span class="master-tab-count">${dayShows.length}</span>
          </button>
          <button type="button" 
                  class="master-tab-btn master-tab-fav ${isSched ? 'active' : ''}" 
                  onclick="setTimetableMode('schedule')">
            <span class="master-tab-icon">❤️</span>
            <span class="master-tab-label">My Schedule</span>
            <span class="master-tab-count ${dayFavCount > 0 ? 'has-favs' : ''}">${dayFavCount}</span>
          </button>
        </div>
      `;
    }
    window.renderTimetableMasterSwitcher = renderTimetableMasterSwitcher;

    function setTimetableMode(mode) {
      currentTimetableMode = mode;
      renderTimetableMasterSwitcher();
      renderTimetableStageSelector();
      renderTimetableShows();
    }
    window.setTimetableMode = setTimetableMode;

    function renderTimetableStageSelector() {
      const container = document.getElementById('timetable-stage-filter-wrapper');
      if (!container) return;

      if (currentTimetableMode === 'schedule') {
        const favs = getFavorites();
        const dayShows = FESTIVAL_SHOWS_SCHEDULE.filter(s => s.date === currentSelectedTimetableDate && shouldKeepTimetableItem(s));
        const dayFavCount = dayShows.filter(s => {
          const matched = findMatchedArtist(s.artistName, s.aliases);
          return matched ? !!favs[matched.id] : false;
        }).length;

        if (dayFavCount > 0) {
          container.innerHTML = `
            <div class="timetable-schedule-subline">
              <span class="schedule-subline-dot">●</span>
              <span>Showing <strong>${dayFavCount}</strong> favorited performance${dayFavCount === 1 ? '' : 's'} on this day</span>
            </div>
          `;
          container.style.display = 'block';
        } else {
          container.innerHTML = '';
          container.style.display = 'none';
        }
        return;
      }

      // 'all' mode: Show stage dropdown with dynamically combined stages
      const dayShows = FESTIVAL_SHOWS_SCHEDULE.filter(s => s.date === currentSelectedTimetableDate && shouldKeepTimetableItem(s));
      const dayObj = FESTIVAL_TIMETABLE_DAYS.find(d => d.date === currentSelectedTimetableDate) || FESTIVAL_TIMETABLE_DAYS[0];
      const configuredStages = (dayObj.stages || []).filter(stg => stg !== 'All');
      const actualStages = [...new Set(dayShows.map(s => s.stage).filter(stg => stg && stg !== 'All'))];
      const allDayStages = [...new Set([...configuredStages, ...actualStages])];

      let optionsHtml = `<option value="All" ${(!currentSelectedStage || currentSelectedStage === 'All') ? 'selected' : ''}>All Stages (${dayShows.length} shows)</option>`;
      
      allDayStages.forEach(stg => {
        const stageCount = dayShows.filter(s => s.stage === stg).length;
        const isSelected = (currentSelectedStage === stg) ? 'selected' : '';
        optionsHtml += `<option value="${escapeHtml(stg)}" ${isSelected}>${escapeHtml(stg)} (${stageCount} shows)</option>`;
      });

      container.innerHTML = `
        <div class="timetable-stage-picker full-width">
          <div class="stage-select-box">
            <span class="stage-select-icon">📍</span>
            <select id="timetable-stage-select" class="timetable-stage-select" onchange="selectTimetableStage(this.value)">
              ${optionsHtml}
            </select>
            <span class="stage-select-arrow">▾</span>
          </div>
        </div>
      `;
      container.style.display = 'block';
    }
    window.renderTimetableStageSelector = renderTimetableStageSelector;

    function updateTimetableFavCount() {
      renderTimetableMasterSwitcher();
      renderTimetableStageSelector();
      renderTimetableShows();
    }
    window.updateTimetableFavCount = updateTimetableFavCount;

    function selectTimetableDate(dateStr) {
      currentSelectedTimetableDate = dateStr;
      currentSelectedStage = 'All';
      renderTimetableDaysNav();
      renderTimetableVenueBanner();
      renderTimetableMasterSwitcher();
      renderTimetableStageSelector();
      renderTimetableShows();
    }
    window.selectTimetableDate = selectTimetableDate;

    function selectTimetableStage(stageName) {
      currentSelectedStage = stageName;
      renderTimetableShows();
    }
    window.selectTimetableStage = selectTimetableStage;

    function jumpToTimetableShow(dateStr, showId, artistId) {
      if (artistId) {
        lastOpenedArtistId = artistId;
      } else if (currentOpenArtistId) {
        lastOpenedArtistId = currentOpenArtistId;
      }

      // 1. Visually close the artist bottom sheet WITHOUT popping history
      flushFeedbackAutoSave();
      document.getElementById('artist-sheet-overlay').classList.remove('active');
      document.getElementById('artist-bottom-sheet').classList.remove('active');
      document.body.style.overflow = '';
      currentOpenArtistId = null;
      filterArtists();

      // 2. Set new hash for timetable show to create a forward history entry AFTER #sheet
      // When the user taps Back on their phone, it will return to #sheet!
      window.location.hash = "timetable";

      // 3. Switch to Timetable subtab and select the date
      switchArtistsSubTab('timetable');
      currentTimetableMode = 'all';
      currentSelectedStage = 'All';
      selectTimetableDate(dateStr);
      
      // 4. Smooth scroll and super-bold highlight pulse
      setTimeout(() => {
        const showCard = document.getElementById(`timetable-card-${showId}`);
        if (showCard) {
          showCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showCard.classList.remove('highlight-pulse');
          void showCard.offsetWidth; // force reflow to restart animation
          showCard.classList.add('highlight-pulse');
          setTimeout(() => showCard.classList.remove('highlight-pulse'), 4000);
        }
      }, 300);
    }
    window.jumpToTimetableShow = jumpToTimetableShow;

    function getTimetableSortMinutes(timeStr) {
      if (!timeStr) return 9999;
      const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
      if (!match) return 9999;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h < 6) {
        h += 24;
      }
      return h * 60 + m;
    }
    window.getTimetableSortMinutes = getTimetableSortMinutes;

    function handleTimetableArtistSearch(val) {
      const query = (val || '').trim();
      const clearBtn = document.getElementById('clear-timetable-search-btn');
      const resultsContainer = document.getElementById('timetable-search-results');
      if (!resultsContainer) return;

      if (!query) {
        if (clearBtn) clearBtn.style.display = 'none';
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
      }

      if (clearBtn) clearBtn.style.display = 'flex';

      const normQ = normalizeArtistString(query);
      const matches = [];
      const seenShowIds = new Set();

      (FESTIVAL_SHOWS_SCHEDULE || []).forEach(show => {
        if (!shouldKeepTimetableItem(show)) return;
        if (seenShowIds.has(show.id)) return;

        const matched = findMatchedArtist(show.artistName, show.aliases);
        const normName = normalizeArtistString(show.artistName);
        const normMatched = matched ? normalizeArtistString(matched.name) : '';
        const aliasesNorm = (show.aliases || []).map(a => normalizeArtistString(a));

        const isMatch = normName.includes(normQ) ||
                        normMatched.includes(normQ) ||
                        aliasesNorm.some(a => a.includes(normQ));

        if (isMatch) {
          seenShowIds.add(show.id);
          matches.push({
            show: show,
            artist: matched
          });
        }
      });

      if (matches.length === 0) {
        resultsContainer.innerHTML = `
          <div class="timetable-search-no-results">
            No performances found for "${escapeHtml(query)}"
          </div>
        `;
        resultsContainer.style.display = 'block';
        return;
      }

      // Sort matches chronologically by date and start time
      matches.sort((a, b) => {
        if (a.show.date !== b.show.date) return a.show.date.localeCompare(b.show.date);
        return getTimetableSortMinutes(a.show.startTime) - getTimetableSortMinutes(b.show.startTime);
      });

      let resultsHtml = '';
      matches.slice(0, 8).forEach(m => {
        const s = m.show;
        const artist = m.artist;
        const displayName = artist ? artist.name : s.artistName;
        const dayObj = (typeof FESTIVAL_TIMETABLE_DAYS !== 'undefined')
          ? FESTIVAL_TIMETABLE_DAYS.find(d => d.date === s.date)
          : null;
        const dayLabel = dayObj ? `${dayObj.dayOfWeek} ${dayObj.dayNum}.11` : s.date;
        const timeLabel = s.startTime ? `${s.startTime}${s.endTime ? ' - ' + s.endTime : ''}` : 'DJ Set (Time TBA)';

        const avatarHtml = (artist && artist.image)
          ? `<img src="${artist.image}" alt="${escapeHtml(displayName)}" class="timetable-search-item-avatar" />`
          : ((s.artistName.includes('Doors') || s.artistName.includes('דלתות')) ? `<span class="timetable-search-item-fallback">🚪</span>` : `<span class="timetable-search-item-fallback">🎸</span>`);

        resultsHtml += `
          <div class="timetable-search-item" onclick="selectTimetableSearchResult('${s.date}', '${s.id}', '${artist ? artist.id : ''}')">
            ${avatarHtml}
            <div class="timetable-search-item-info">
              <div class="timetable-search-item-name">${escapeHtml(displayName)}</div>
              <div class="timetable-search-item-meta">
                <span class="timetable-search-item-time">📅 ${escapeHtml(dayLabel)} • ${escapeHtml(timeLabel)}</span>
                <span>• 📍 ${escapeHtml(s.stage)}</span>
              </div>
            </div>
            <span class="timetable-search-item-arrow" style="color: var(--accent); font-weight: bold;">→</span>
          </div>
        `;
      });

      resultsContainer.innerHTML = resultsHtml;
      resultsContainer.style.display = 'block';
    }
    window.handleTimetableArtistSearch = handleTimetableArtistSearch;

    function clearTimetableSearch() {
      const input = document.getElementById('timetable-artist-search');
      if (input) input.value = '';
      const clearBtn = document.getElementById('clear-timetable-search-btn');
      if (clearBtn) clearBtn.style.display = 'none';
      const resultsContainer = document.getElementById('timetable-search-results');
      if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
      }
    }
    window.clearTimetableSearch = clearTimetableSearch;

    function selectTimetableSearchResult(dateStr, showId, artistId) {
      clearTimetableSearch();
      jumpToTimetableShow(dateStr, showId, artistId);
    }
    window.selectTimetableSearchResult = selectTimetableSearchResult;

    function handleTimetableSearchKey(e) {
      if (e.key === 'Enter') {
        const resultsContainer = document.getElementById('timetable-search-results');
        if (resultsContainer) {
          const firstItem = resultsContainer.querySelector('.timetable-search-item');
          if (firstItem) {
            firstItem.click();
          }
        }
      } else if (e.key === 'Escape') {
        clearTimetableSearch();
      }
    }
    window.handleTimetableSearchKey = handleTimetableSearchKey;

    // Close search dropdown on click outside
    document.addEventListener('click', function(e) {
      const container = document.querySelector('.timetable-search-container');
      const resultsContainer = document.getElementById('timetable-search-results');
      if (container && resultsContainer && !container.contains(e.target)) {
        resultsContainer.style.display = 'none';
      }
    });

    function renderTimetableShows() {
      const container = document.getElementById('timetable-shows-container');
      if (!container) return;
      
      const favs = getFavorites();
      let dayShows = FESTIVAL_SHOWS_SCHEDULE.filter(s => s.date === currentSelectedTimetableDate && shouldKeepTimetableItem(s));
      
      if (currentTimetableMode === 'all' && currentSelectedStage && currentSelectedStage !== 'All') {
        dayShows = dayShows.filter(s => s.stage === currentSelectedStage);
      }
      
      // Match with globalArtistsData
      const enrichedShows = dayShows.map(show => {
        const matched = findMatchedArtist(show.artistName, show.aliases);
        const isFav = matched ? !!favs[matched.id] : false;
        return { ...show, matchedArtist: matched, isFav: isFav };
      });
      
      let finalShows = enrichedShows;
      if (currentTimetableMode === 'schedule') {
        finalShows = enrichedShows.filter(s => s.isFav);
      }

      // Sort chronologically by start time (like a real festival timetable!)
      finalShows.sort((a, b) => {
        const timeA = getTimetableSortMinutes(a.startTime);
        const timeB = getTimetableSortMinutes(b.startTime);
        if (timeA !== timeB) return timeA - timeB;
        return (a.stage || '').localeCompare(b.stage || '');
      });
      
      if (finalShows.length === 0) {
        if (currentTimetableMode === 'schedule') {
          container.innerHTML = `
            <div class="empty-category-card" style="padding: 2.5rem 1rem;">
              <svg class="empty-category-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <div class="empty-category-title">No Favorite Shows on this Day</div>
              <div class="empty-category-desc">You haven't favorited any artists performing on this date yet. Check out the full lineup or choose another day!</div>
              <button type="button" class="secondary" onclick="setTimetableMode('all')" style="margin-top: 12px; width: auto; font-size: 0.85rem;">View Full Timetable</button>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div class="empty-category-card" style="padding: 2.5rem 1rem;">
              <div class="empty-category-title">No Shows Scheduled for this Stage</div>
            </div>
          `;
        }
        return;
      }
      
      let html = '';
      finalShows.forEach(s => {
        const artist = s.matchedArtist;
        const isFav = s.isFav;
        const clickAttr = artist ? `onclick="openArtistSheet('${artist.id}')"` : '';
        const cardClass = `timetable-show-card ${isFav ? 'is-favorite' : ''}`;
        const avatarHtml = (artist && artist.image) 
          ? `<img src="${artist.image}" alt="${escapeHtml(s.artistName)}" class="timetable-artist-avatar" />`
          : ((s.artistName.includes('דלתות') || s.artistName.toLowerCase().includes('doors')) ? `<span class="timetable-avatar-fallback">🚪</span>` : (s.isGeneralEvent ? `<span class="timetable-avatar-fallback">🎧</span>` : `<span class="timetable-avatar-fallback">🎸</span>`));
        
        const genreTag = (artist && artist.genre) ? `<span class="timetable-genre-tag">${escapeHtml(artist.genre)}</span>` : '';
        const formatTag = s.format ? `<span class="timetable-format-tag">${escapeHtml(s.format)}</span>` : '';
        const favMiniBadge = isFav ? `<span class="timetable-fav-mini-badge" title="Favorited">❤️</span>` : '';
        let cleanName = s.artistName;
        if (cleanName === 'דלתות' || cleanName === 'Doors (דלתות)') {
          cleanName = 'Doors Opening';
        }
        const displayName = artist ? artist.name : cleanName;

        html += `
          <div class="${cardClass}" id="timetable-card-${s.id}" ${clickAttr} title="${artist ? 'Click to view full artist profile' : ''}">
            <div class="timetable-time-box">
              ${s.startTime ? `
                <span class="start-time">${escapeHtml(s.startTime)}</span>
                ${s.endTime ? `<span class="end-time">${escapeHtml(s.endTime)}</span>` : ''}
              ` : `
                <span class="start-time" style="font-size:0.75rem;font-weight:700;color:var(--accent);">DJ SET</span>
                <span class="end-time" style="font-size:0.68rem;opacity:0.8;">TBA</span>
              `}
            </div>
            <div class="timetable-show-body">
              <div class="timetable-artist-header">
                ${avatarHtml}
                <span class="timetable-artist-name">${escapeHtml(displayName)}</span>
                ${favMiniBadge}
              </div>
              <div class="timetable-sub-details">
                <span class="timetable-stage-badge">📍 ${escapeHtml(s.stage)}</span>
                ${formatTag}
                ${genreTag}
              </div>
            </div>
            ${artist ? `
              <div class="timetable-open-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </div>
            ` : ''}
          </div>
        `;
      });
      
      container.innerHTML = html;
    }
    window.renderTimetableShows = renderTimetableShows;

    // FULLSCREEN IMAGE VIEWER LOGIC
    function openImageViewerFromBg(event, el) {
      if (event && event.target.closest('button')) return;
      const bg = el.style.backgroundImage;
      if (!bg || bg === 'none') return;
      const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
      if (match && match[1]) {
        let url = match[1];
        // Remove thumbnail resize parameter if possible to show high res
        if (url.includes('drive.google.com/thumbnail')) {
          url = url.replace('&sz=w800', '&sz=w2000');
        }
        const viewer = document.getElementById('fullscreen-image-viewer');
        const img = document.getElementById('fullscreen-image');
        img.src = url;
        viewer.style.display = 'flex';
        setTimeout(() => viewer.classList.add('active'), 10);
        history.pushState({ imageViewer: true }, "");
      }
    }

    function closeImageViewer(fromHistory = false) {
      const viewer = document.getElementById('fullscreen-image-viewer');
      viewer.classList.remove('active');
      setTimeout(() => {
        viewer.style.display = 'none';
        document.getElementById('fullscreen-image').src = "";
      }, 300);
      
      if (!fromHistory && history.state && history.state.imageViewer) {
        history.back();
      }
    }

    window.addEventListener('popstate', (e) => {
      const viewer = document.getElementById('fullscreen-image-viewer');
      if (viewer && viewer.style.display !== 'none') {
        closeImageViewer(true);
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('sheet-artist-img').addEventListener('click', function(e) {
        openImageViewerFromBg(e, this);
      });
      document.getElementById('sheet-guest-img').addEventListener('click', function(e) {
        openImageViewerFromBg(e, this);
      });
    });


/* --- GLOBAL EXPORTS FOR INLINE HTML EVENTS --- */
window.closeWelcomeModal = closeWelcomeModal;
window.switchCategoryTab = switchCategoryTab;
window.requestOTP = requestOTP;
window.verifyOTP = verifyOTP;
window.resetLogin = resetLogin;
window.submitMissingInfo = submitMissingInfo;
window.submitBio = submitBio;
window.uploadFile = uploadFile;
window.filterDirectory = filterDirectory;
window.clearSearch = clearSearch;
window.filterArtists = filterArtists;
window.clearArtistSearch = clearArtistSearch;
window.toggleFavFilter = toggleFavFilter;
window.exportBriefcase = exportBriefcase;
window.closeArtistSheet = closeArtistSheet;
window.toggleSheetFav = toggleSheetFav;
window.toggleCardFav = toggleCardFav;
window.savePrivateNote = savePrivateNote;
window.toggleIntentTag = toggleIntentTag;
window.closeGuestSheet = closeGuestSheet;
window.toggleUpdatesPanel = toggleUpdatesPanel;
window.toggleTheme = toggleTheme;
window.openImageViewerFromBg = openImageViewerFromBg;
window.closeImageViewer = closeImageViewer;
window.openGuestSheet = openGuestSheet;
window.openArtistSheet = openArtistSheet;


let adminDataLoaded = false;
let adminData = null;

function renderAdminDashboard() {
  const container = document.getElementById("admin-dashboard-container");
  if (!adminData || !adminData.guests) return;
  
  const guests = adminData.guests;
  const headers = guests[0].map(h => String(h).trim().toLowerCase());
  
  const hHotel = headers.indexOf("התקבל טופס אירוח?");
  const hFlight = headers.indexOf("התקבל טופס טיסות?");
  const hPassport = headers.indexOf("יש תמונת דרכון?");
  let hRole = headers.indexOf("תפקיד");
  if (hRole === -1) hRole = headers.indexOf("role");
  let hEmail = headers.indexOf("מייל אורח");
  if (hEmail === -1) hEmail = headers.indexOf("email");
  let hFirstName = headers.indexOf("שם פרטי");
  if (hFirstName === -1) hFirstName = headers.indexOf("first name");
  let hLastName = headers.indexOf("שם משפחה");
  if (hLastName === -1) hLastName = headers.indexOf("last name");
  
  let totalGuests = 0;
  let missingHotel = 0;
  let missingFlight = 0;
  let missingPassport = 0;
  
  for (let i = 1; i < guests.length; i++) {
    const row = guests[i];
    const fname = hFirstName !== -1 ? String(row[hFirstName] || "").trim() : "";
    const lname = hLastName !== -1 ? String(row[hLastName] || "").trim() : "";
    const email = hEmail !== -1 ? String(row[hEmail] || "").trim() : "";
    const role = hRole !== -1 ? String(row[hRole] || "").trim() : "";

    // Skip empty names
    if (!fname && !lname) continue;
    // Skip empty or invalid emails (must contain @)
    if (!email || !email.includes("@")) continue;
    
    // Ignore admins
    const cleanRole = role.replace(/\s+/g, ' ').trim();
    if (cleanRole === "הפקה חשיפה" || cleanRole.includes("הפקה חשיפה")) continue;
    
    totalGuests++;
    
    if (hHotel !== -1 && row[hHotel] !== true && String(row[hHotel]).toLowerCase() !== 'true') missingHotel++;
    if (hFlight !== -1 && row[hFlight] !== true && String(row[hFlight]).toLowerCase() !== 'true') missingFlight++;
    if (hPassport !== -1 && row[hPassport] !== true && String(row[hPassport]).toLowerCase() !== 'true') missingPassport++;
  }
  
  // Logistics counts
  let hotelJlmCount = 0;
  let hotelTlvCount = 0;
  let flightArrivals = 0;
  
  if (adminData.hotelJlm && adminData.hotelJlm.length > 1) {
    const h = adminData.hotelJlm[0].map(x => String(x).trim().toLowerCase());
    const nightCol = h.indexOf("סה\"כ לילות");
    if (nightCol !== -1) {
      for (let i = 1; i < adminData.hotelJlm.length; i++) {
        hotelJlmCount += Number(adminData.hotelJlm[i][nightCol]) || 0;
      }
    } else {
      hotelJlmCount = adminData.hotelJlm.length - 1;
    }
  }
  
  if (adminData.hotelTlv && adminData.hotelTlv.length > 1) {
    const h = adminData.hotelTlv[0].map(x => String(x).trim().toLowerCase());
    const nightCol = h.indexOf("סה\"כ לילות");
    if (nightCol !== -1) {
      for (let i = 1; i < adminData.hotelTlv.length; i++) {
        hotelTlvCount += Number(adminData.hotelTlv[i][nightCol]) || 0;
      }
    } else {
      hotelTlvCount = adminData.hotelTlv.length - 1;
    }
  }
  
  if (adminData.flights && adminData.flights.length > 1) {
    flightArrivals = adminData.flights.length - 1;
  }
  
  let html = `
    <div class="admin-sections-wrapper">
      
      <!-- 1. PRODUCTION OVERVIEW ACCORDION -->
      <details class="admin-section-accordion" id="admin-sec-overview">
        <summary class="admin-section-summary">
          <div class="admin-section-info">
            <span class="admin-section-icon">📊</span>
            <span class="admin-section-title">Production Overview</span>
          </div>
          <div class="admin-section-meta">
            <span class="admin-section-badge">${totalGuests} Delegates</span>
            <span class="admin-section-chevron">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </summary>
        <div class="admin-section-content">
          <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 14px;">
            <button class="primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="loadAdminDashboard(true)">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px; vertical-align: text-bottom;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh Data
            </button>
          </div>
          
          <div class="admin-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px;">
            <div class="stat-card" style="background: var(--surface); padding: 14px; border-radius: 10px; text-align: center; border: 1.5px solid var(--border);">
              <h3 style="margin: 0; font-size: 26px; color: var(--accent-bright);">${totalGuests}</h3>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--foreground-muted); font-weight: 500;">Total Delegates</p>
            </div>
            <div class="stat-card" style="background: var(--surface); padding: 14px; border-radius: 10px; text-align: center; border: 1.5px solid var(--border);">
              <h3 style="margin: 0; font-size: 26px; color: #f59e0b;">${missingHotel}</h3>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--foreground-muted); font-weight: 500;">Missing Hotel Form</p>
            </div>
            <div class="stat-card" style="background: var(--surface); padding: 14px; border-radius: 10px; text-align: center; border: 1.5px solid var(--border);">
              <h3 style="margin: 0; font-size: 26px; color: #ef4444;">${missingFlight}</h3>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--foreground-muted); font-weight: 500;">Missing Flights</p>
            </div>
            <div class="stat-card" style="background: var(--surface); padding: 14px; border-radius: 10px; text-align: center; border: 1.5px solid var(--border);">
              <h3 style="margin: 0; font-size: 26px; color: #8b5cf6;">${missingPassport}</h3>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--foreground-muted); font-weight: 500;">Missing Passport</p>
            </div>
          </div>

          <!-- Alert Center (Full-Width 2-Column Responsive Card) -->
          <div style="background: var(--surface); padding: 18px; border-radius: 12px; border: 1.5px solid var(--border); margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <h4 style="margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 8px; color: var(--foreground);">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                Live Alert Center (Announcements for All Delegates)
              </h4>
            </div>
            <p style="font-size: 0.85rem; color: var(--foreground-muted); margin: 0 0 14px 0;">Post and manage announcements shown in all delegates' notification panels.</p>
            
            <div class="admin-msg-split-grid">
              <!-- Left: Compose & Send / Update -->
              <div style="display: flex; flex-direction: column;">
                <label style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: var(--foreground-muted);">
                  <span id="admin-alert-mode-label">Compose Global Announcement</span>
                </label>
                <textarea id="admin-alert-msg" placeholder="Type announcement for all delegates..." style="width: 100%; height: 90px; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--foreground); margin-bottom: 10px; resize: vertical; font-family: inherit; box-sizing: border-box;"></textarea>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button id="admin-alert-submit-btn" class="primary" style="padding: 7px 16px; font-size: 0.85rem; border-radius: 6px; width: auto;" onclick="submitAdminAlert()">
                    Send Global Alert
                  </button>
                  <button id="admin-alert-cancel-btn" class="secondary" style="padding: 7px 12px; font-size: 0.85rem; border-radius: 6px; width: auto; display: none;" onclick="cancelEditAdminAlert()">
                    Cancel
                  </button>
                  <div id="admin-alert-status" style="font-size: 0.85rem; display: none;"></div>
                </div>
              </div>

              <!-- Right: Active Announcements List -->
              <div style="display: flex; flex-direction: column; background: var(--background); border: 1px dashed var(--border); border-radius: 8px; padding: 12px; max-height: 250px; overflow-y: auto;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 0.8rem; font-weight: 600; color: var(--foreground-muted);">Active Broadcast Announcements</span>
                  <span id="admin-announcements-count" style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: var(--surface); color: var(--foreground-muted); border: 1px solid var(--border);">
                    ${(adminData && adminData.announcements && adminData.announcements.length) ? adminData.announcements.length + ' Active' : '0 Active'}
                  </span>
                </div>
                <div id="admin-announcements-list">
                  <p style="text-align: center; color: var(--foreground-muted); font-size: 0.85rem; margin: 20px 0;">Loading announcements...</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Logistics Summary -->
          <div style="background: var(--surface); padding: 16px; border-radius: 10px; border: 1.5px solid var(--border); margin-bottom: 10px;">
            <h4 style="margin: 0 0 10px 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              Logistics Summary
            </h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
                <span style="color: var(--foreground-muted); font-size: 0.9rem;">Tel Aviv Hotel</span>
                <span style="font-weight: 600; font-size: 0.9rem;">${hotelTlvCount} Nights</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
                <span style="color: var(--foreground-muted); font-size: 0.9rem;">Jerusalem Hotel</span>
                <span style="font-weight: 600; font-size: 0.9rem;">${hotelJlmCount} Nights</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
                <span style="color: var(--foreground-muted); font-size: 0.9rem;">Flights Handled</span>
                <span style="font-weight: 600; font-size: 0.9rem;">${flightArrivals} Delegates</span>
              </div>
            </div>
          </div>
        </div>
      </details>

      <!-- 2. LINEUP & NETWORKING LEADS ACCORDION -->
      <details class="admin-section-accordion" id="admin-sec-networking">
        <summary class="admin-section-summary">
          <div class="admin-section-info">
            <span class="admin-section-icon">🎸</span>
            <span class="admin-section-title">Lineup & Networking Leads</span>
          </div>
          <div class="admin-section-meta">
            <span class="admin-section-badge">Leads & Feedback</span>
            <span class="admin-section-chevron">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </summary>
        <div class="admin-section-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <p style="font-size: 0.85rem; color: var(--foreground-muted); margin: 0;">Real-time delegate interest, booking inquiries, and tour matching across artists.</p>
            <div style="display: flex; gap: 8px;">
              <button class="secondary" style="font-size: 0.8rem; padding: 4px 10px;" onclick="loadAdminNetworkingData(true)">Refresh</button>
              <button class="primary" style="font-size: 0.8rem; padding: 4px 10px;" onclick="triggerFullLeadsSync()">⚡ Run Full Sync</button>
            </div>
          </div>
          
          <!-- Slide Toggle for Artists / Guests -->
          <div class="networking-toggle-container">
            <div class="networking-slide-toggle">
              <button type="button" id="networking-toggle-artists" class="networking-toggle-btn active" onclick="switchAdminNetworkingTab('artists')">
                🎸 Artists <span id="networking-artists-count" class="networking-toggle-badge">0</span>
              </button>
              <button type="button" id="networking-toggle-guests" class="networking-toggle-btn" onclick="switchAdminNetworkingTab('guests')">
                👥 Guests <span id="networking-guests-count" class="networking-toggle-badge">0</span>
              </button>
            </div>
          </div>

          <!-- Dynamic KPI Overview Cards -->
          <div id="admin-networking-kpis" class="networking-kpis-grid"></div>

          <div style="margin-bottom: 12px; position: relative;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position: absolute; left: 12px; top: 11px; color: var(--foreground-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="admin-networking-search" placeholder="Search artists..." style="width: 100%; padding: 10px 12px 10px 38px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--foreground); box-sizing: border-box;" onkeyup="filterAdminNetworking(this.value)">
          </div>

          <div id="admin-networking-list" class="networking-cubes-grid">
            <p style="color: var(--foreground-muted); text-align: center; padding: 15px; grid-column: 1 / -1;">Loading networking insights...</p>
          </div>
        </div>
      </details>

      <!-- 3. GUEST MANAGEMENT ACCORDION -->
      <details class="admin-section-accordion" id="admin-sec-guests">
        <summary class="admin-section-summary">
          <div class="admin-section-info">
            <span class="admin-section-icon">👥</span>
            <span class="admin-section-title">Guest Management</span>
          </div>
          <div class="admin-section-meta">
            <span class="admin-section-badge">${totalGuests} Registered</span>
            <span class="admin-section-chevron">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </summary>
        <div class="admin-section-content">
          <div style="margin-bottom: 14px; position: relative;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position: absolute; left: 12px; top: 12px; color: var(--foreground-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="admin-guest-search" placeholder="Search by name, email, or company..." style="width: 100%; padding: 12px 12px 12px 40px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--foreground); font-size: 1rem; box-sizing: border-box;" onkeyup="filterAdminGuests(this.value)">
          </div>
          <div id="admin-guest-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 500px; overflow-y: auto; padding-right: 5px;"></div>
        </div>
      </details>

    </div>
  `;
  
  container.innerHTML = html;
  if (adminData && adminData.announcements && adminData.announcements.length > 0) {
    renderAdminAnnouncementsList(adminData.announcements);
  } else {
    loadAdminAnnouncements();
  }
  filterAdminGuests("");
  loadAdminNetworkingData(false);
}

function escapeHtmlAdmin(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let currentNetworkingTab = 'artists';
let networkingArtistsList = [];
let networkingGuestsList = [];
let adminNetworkingData = null;

function switchAdminNetworkingTab(tab) {
  currentNetworkingTab = tab;
  const btnArtists = document.getElementById('networking-toggle-artists');
  const btnGuests = document.getElementById('networking-toggle-guests');
  const searchInput = document.getElementById('admin-networking-search');

  if (tab === 'artists') {
    if (btnArtists) btnArtists.classList.add('active');
    if (btnGuests) btnGuests.classList.remove('active');
    if (searchInput) searchInput.placeholder = "Search artists...";
  } else {
    if (btnArtists) btnArtists.classList.remove('active');
    if (btnGuests) btnGuests.classList.add('active');
    if (searchInput) searchInput.placeholder = "Search guests...";
  }

  const query = searchInput ? searchInput.value : '';
  renderAdminNetworkingCubes(query);
}

function getResolvedGuestsNetworkingList() {
  const result = [];
  const prefMap = new Map();

  if (adminNetworkingData && adminNetworkingData.guestsPreferences) {
    adminNetworkingData.guestsPreferences.forEach(g => {
      if (g.email) prefMap.set(g.email.toLowerCase().trim(), g);
    });
  }

  // Cross-reference with adminData.guests to ensure no guest is missed
  if (adminData && adminData.guests && adminData.guests.length > 1) {
    const headers = adminData.guests[0].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf("מייל אורח");
    const fnIdx = headers.indexOf("שם פרטי");
    const lnIdx = headers.indexOf("שם משפחה");
    const roleIdx = headers.indexOf("תפקיד");
    const compIdx = headers.indexOf("שם חברה");
    const countryIdx = headers.indexOf("מדינה");

    for (let i = 1; i < adminData.guests.length; i++) {
      const row = adminData.guests[i];
      const rawRole = roleIdx !== -1 ? String(row[roleIdx] || "").trim() : "";
      const cleanRole = rawRole.replace(/\s+/g, ' ').trim();
      if (cleanRole === "הפקה חשיפה" || cleanRole.includes("הפקה חשיפה")) continue; // skip admin
      const email = emailIdx !== -1 ? String(row[emailIdx] || "").trim().toLowerCase() : "";
      const fname = fnIdx !== -1 ? String(row[fnIdx] || "").trim() : "";
      const lname = lnIdx !== -1 ? String(row[lnIdx] || "").trim() : "";
      const fullName = `${fname} ${lname}`.trim();
      if (!fullName || !email || !email.includes("@")) continue;

      if (prefMap.has(email)) {
        result.push(prefMap.get(email));
        prefMap.delete(email);
      } else {
        result.push({
          email: email,
          name: fullName || email,
          country: countryIdx !== -1 ? String(row[countryIdx] || "").trim() : "",
          company: compIdx !== -1 ? String(row[compIdx] || "").trim() : "",
          role: cleanRole,
          status: "🔴 טרם סימן אומנים",
          favs: "",
          booking: "",
          connect: "",
          press: "",
          totalLikes: 0,
          notes: ""
        });
      }
    }
  }

  // Include any remaining guests from prefMap (ensure valid email and not admin)
  prefMap.forEach(g => {
    const gRole = String(g.role || "").replace(/\s+/g, ' ').trim();
    const gEmail = String(g.email || "").trim();
    if (gEmail && gEmail.includes("@") && gRole !== "הפקה חשיפה" && !gRole.includes("הפקה חשיפה")) {
      result.push(g);
    }
  });

  return result;
}

function renderAdminNetworkingKPIs() {
  const container = document.getElementById('admin-networking-kpis');
  if (!container || !adminNetworkingData) return;

  const artists = adminNetworkingData.artistsLeads || [];
  const guests = getResolvedGuestsNetworkingList();

  if (currentNetworkingTab === 'artists') {
    // 1. Lineup Coverage
    const totalArtists = artists.length;
    const engagedArtists = artists.filter(a => 
      (a.likesCount > 0) || 
      (a.bookingLeads && a.bookingLeads.trim().length > 0) ||
      (a.notes && a.notes.trim().length > 0)
    ).length;
    const unengagedArtists = Math.max(0, totalArtists - engagedArtists);
    const coveragePercent = totalArtists > 0 ? Math.round((engagedArtists / totalArtists) * 100) : 0;

    // 2. Top 5 In-Demand Artists
    const topArtists = [...artists]
      .filter(a => (a.likesCount > 0) || (a.bookingLeads && a.bookingLeads.trim().length > 0))
      .sort((a, b) => {
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        const aHasBooking = (a.bookingLeads && a.bookingLeads.trim().length > 0) ? 1 : 0;
        const bHasBooking = (b.bookingLeads && b.bookingLeads.trim().length > 0) ? 1 : 0;
        if (bHasBooking !== aHasBooking) return bHasBooking - aHasBooking;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      })
      .slice(0, 5);

    let topArtistsHtml = '';
    if (topArtists.length === 0) {
      topArtistsHtml = '<p style="color: var(--foreground-muted); font-size: 0.85rem; margin: 14px 0; text-align: center;">No likes or leads recorded yet.</p>';
    } else {
      topArtistsHtml = '<div class="networking-top-list">';
      topArtists.forEach((a, idx) => {
        const hasBooking = a.bookingLeads && a.bookingLeads.trim().length > 0;
        const safeName = escapeHtmlAdmin(a.name);
        topArtistsHtml += `
          <div class="networking-top-item" onclick="openNetworkingDetail('artist', '${safeName.replace(/'/g, "\\'")}')" title="View ${safeName} details">
            <div class="networking-top-left">
              <span class="networking-top-rank">#${idx + 1}</span>
              <div style="overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;">
                <div class="networking-top-name">${safeName}</div>
              </div>
            </div>
            <div class="networking-top-right">
              <span class="networking-top-tag">❤️ ${a.likesCount || 0}</span>
              ${hasBooking ? `<span class="networking-top-tag" style="background: rgba(16,185,129,0.15); color: #10b981;" title="Booking inquiries">🎯</span>` : ''}
            </div>
          </div>
        `;
      });
      topArtistsHtml += '</div>';
    }

    container.innerHTML = `
      <!-- Card 1: Lineup Coverage -->
      <div class="networking-kpi-card">
        <div>
          <div class="networking-kpi-header">
            <h4 class="networking-kpi-title">
              <span>📈</span> Lineup Coverage
            </h4>
            <span class="networking-kpi-badge">${coveragePercent}% Engaged</span>
          </div>
          <div class="networking-kpi-stat-box">
            <div class="networking-kpi-stat-number">${coveragePercent}%</div>
            <div class="networking-kpi-stat-sub">${engagedArtists} of ${totalArtists} artists engaged</div>
          </div>
          <div class="networking-progress-track">
            <div class="networking-progress-fill" style="width: ${coveragePercent}%;"></div>
          </div>
        </div>
        <div class="networking-kpi-footer-pills">
          <span class="networking-pill">🎯 ${engagedArtists} Engaged</span>
          <span class="networking-pill">⚪ ${unengagedArtists} Unengaged</span>
        </div>
      </div>

      <!-- Card 2: Top 5 In-Demand Artists -->
      <div class="networking-kpi-card">
        <div>
          <div class="networking-kpi-header">
            <h4 class="networking-kpi-title">
              <span>🏆</span> Top In-Demand Artists
            </h4>
            <span class="networking-kpi-badge">Top 5</span>
          </div>
          ${topArtistsHtml}
        </div>
      </div>
    `;
  } else {
    // Guests tab
    // 1. Delegate Engagement Rate
    const totalGuests = guests.length;
    const activeGuests = guests.filter(g => {
      const isInactive = (g.status && g.status.includes('טרם סימן')) ||
                         ((!g.totalLikes || Number(g.totalLikes) === 0) &&
                          (!g.favs || !g.favs.trim()) &&
                          (!g.notes || !g.notes.trim()) &&
                          (!g.booking || !g.booking.trim()) &&
                          (!g.connect || !g.connect.trim()) &&
                          (!g.press || !g.press.trim()) &&
                          (!g.general || !g.general.trim()));
      return !isInactive;
    });
    const activeCount = activeGuests.length;
    const inactiveCount = Math.max(0, totalGuests - activeCount);
    const ratePercent = totalGuests > 0 ? Math.round((activeCount / totalGuests) * 100) : 0;

    // 2. Top 5 Most Engaged Delegates (Ensure 5 delegates are shown)
    const topGuests = [...guests]
      .map(g => {
        const likes = Number(g.totalLikes) || 0;
        const hasNotes = (g.notes && g.notes.trim().length > 0);
        const notesCount = hasNotes ? g.notes.split('\n').filter(Boolean).length : 0;
        const tagsCount = ((g.booking && g.booking.trim()) ? 1 : 0) +
                          ((g.connect && g.connect.trim()) ? 1 : 0) +
                          ((g.press && g.press.trim()) ? 1 : 0) +
                          ((g.general && g.general.trim()) ? 1 : 0);
        const score = (likes * 2) + (notesCount * 3) + tagsCount;
        return { ...g, likes, notesCount, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.likes !== a.likes) return b.likes - a.likes;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      })
      .slice(0, 5);

    let topGuestsHtml = '';
    if (topGuests.length === 0) {
      topGuestsHtml = '<p style="color: var(--foreground-muted); font-size: 0.85rem; margin: 14px 0; text-align: center;">No active delegates yet.</p>';
    } else {
      topGuestsHtml = '<div class="networking-top-list">';
      topGuests.forEach((g, idx) => {
        const safeName = escapeHtmlAdmin(g.name);
        const safeKey = escapeHtmlAdmin(g.email || g.name);
        const subInfo = escapeHtmlAdmin(g.company || g.country || '');
        topGuestsHtml += `
          <div class="networking-top-item" onclick="openNetworkingDetail('guest', '${safeKey.replace(/'/g, "\\'")}')" title="View ${safeName} activity">
            <div class="networking-top-left">
              <span class="networking-top-rank">#${idx + 1}</span>
              <div style="overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;">
                <div class="networking-top-name">${safeName}</div>
                ${subInfo ? `<div class="networking-top-meta">${subInfo}</div>` : ''}
              </div>
            </div>
            <div class="networking-top-right">
              <span class="networking-top-tag">❤️ ${g.likes}</span>
              ${g.notesCount > 0 ? `<span class="networking-top-tag" style="background: rgba(59,130,246,0.15); color: #3b82f6;" title="${g.notesCount} Notes">💬 ${g.notesCount}</span>` : ''}
            </div>
          </div>
        `;
      });
      topGuestsHtml += '</div>';
    }

    container.innerHTML = `
      <!-- Card 1: Delegate Engagement Rate -->
      <div class="networking-kpi-card">
        <div>
          <div class="networking-kpi-header">
            <h4 class="networking-kpi-title">
              <span>📊</span> Delegate Engagement
            </h4>
            <span class="networking-kpi-badge" style="background: rgba(16,185,129,0.15); color: #10b981; border-color: rgba(16,185,129,0.3);">${ratePercent}% Active</span>
          </div>
          <div class="networking-kpi-stat-box">
            <div class="networking-kpi-stat-number">${ratePercent}%</div>
            <div class="networking-kpi-stat-sub">${activeCount} of ${totalGuests} delegates active</div>
          </div>
          <div class="networking-progress-track">
            <div class="networking-progress-fill green" style="width: ${ratePercent}%;"></div>
          </div>
        </div>
        <div class="networking-kpi-footer-pills">
          <span class="networking-pill" style="border-color: rgba(16,185,129,0.4); color: #10b981;">🟢 ${activeCount} Active</span>
          <span class="networking-pill" style="border-color: rgba(239,68,68,0.4); color: #ef4444;">🔴 ${inactiveCount} Inactive</span>
        </div>
      </div>

      <!-- Card 2: Top 5 Active Delegates -->
      <div class="networking-kpi-card">
        <div>
          <div class="networking-kpi-header">
            <h4 class="networking-kpi-title">
              <span>🌟</span> Top Active Delegates
            </h4>
            <span class="networking-kpi-badge">Top 5</span>
          </div>
          ${topGuestsHtml}
        </div>
      </div>
    `;
  }
}

function renderAdminNetworkingCubes(query = "") {
  renderAdminNetworkingKPIs();
  const container = document.getElementById('admin-networking-list');
  if (!container || !adminNetworkingData) return;

  const q = query.toLowerCase().trim();

  const artists = adminNetworkingData.artistsLeads || [];
  const guests = getResolvedGuestsNetworkingList();

  const artistsCountEl = document.getElementById('networking-artists-count');
  const guestsCountEl = document.getElementById('networking-guests-count');
  if (artistsCountEl) artistsCountEl.innerText = artists.length;
  if (guestsCountEl) guestsCountEl.innerText = guests.length;

  if (currentNetworkingTab === 'artists') {
    const filteredArtists = artists.filter(a => {
      if (!q) return true;
      return a.name.toLowerCase().includes(q) ||
             (a.genre && a.genre.toLowerCase().includes(q)) ||
             (a.countries && a.countries.toLowerCase().includes(q)) ||
             (a.bookingLeads && a.bookingLeads.toLowerCase().includes(q)) ||
             (a.notes && a.notes.toLowerCase().includes(q));
    });

    if (filteredArtists.length === 0) {
      container.innerHTML = '<p style="color:var(--foreground-muted); text-align:center; padding:15px; grid-column:1 / -1;">No artists match your search.</p>';
      return;
    }

    // Sort: strictly alphabetical (A-Z)
    const sorted = [...filteredArtists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    networkingArtistsList = sorted;

    let html = '';
    sorted.forEach((a, idx) => {
      html += `
        <div class="networking-cube" onclick="openNetworkingDetail('artist', ${idx})" title="${escapeHtmlAdmin(a.name)}">
          <div class="networking-cube-name">${escapeHtmlAdmin(a.name)}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  } else {
    // Guests tab
    const filteredGuests = guests.filter(g => {
      if (!q) return true;
      return g.name.toLowerCase().includes(q) ||
             (g.email && g.email.toLowerCase().includes(q)) ||
             (g.company && g.company.toLowerCase().includes(q)) ||
             (g.country && g.country.toLowerCase().includes(q)) ||
             (g.favs && g.favs.toLowerCase().includes(q)) ||
             (g.notes && g.notes.toLowerCase().includes(q));
    });

    if (filteredGuests.length === 0) {
      container.innerHTML = '<p style="color:var(--foreground-muted); text-align:center; padding:15px; grid-column:1 / -1;">No guests match your search.</p>';
      return;
    }

    // Sort: strictly alphabetical (A-Z)
    const sorted = [...filteredGuests].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    networkingGuestsList = sorted;

    let html = '';
    sorted.forEach((g, idx) => {
      const isInactive = (g.status && g.status.includes('טרם סימן')) ||
                         ((!g.totalLikes || Number(g.totalLikes) === 0) &&
                          (!g.favs || !g.favs.trim()) &&
                          (!g.notes || !g.notes.trim()) &&
                          (!g.booking || !g.booking.trim()) &&
                          (!g.connect || !g.connect.trim()) &&
                          (!g.press || !g.press.trim()) &&
                          (!g.general || !g.general.trim()));
      const inactiveClass = isInactive ? ' inactive-guest' : '';
      html += `
        <div class="networking-cube${inactiveClass}" onclick="openNetworkingDetail('guest', ${idx})" title="${escapeHtmlAdmin(g.name)}${isInactive ? ' (Inactive)' : ''}">
          <div class="networking-cube-name">${escapeHtmlAdmin(g.name)}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  }
}

function filterAdminNetworking(query) {
  renderAdminNetworkingCubes(query);
}

function openNetworkingDetail(type, target) {
  const overlay = document.getElementById('networking-sheet-overlay');
  const sheet = document.getElementById('networking-bottom-sheet');
  const content = document.getElementById('networking-modal-content');
  if (!overlay || !sheet || !content) return;

  if (type === 'artist') {
    let artist = null;
    if (typeof target === 'number') {
      artist = networkingArtistsList[target];
    } else {
      const allArtists = (adminNetworkingData && adminNetworkingData.artistsLeads) ? adminNetworkingData.artistsLeads : networkingArtistsList;
      artist = allArtists.find(a => a.name.toLowerCase() === String(target).toLowerCase()) ||
               networkingArtistsList.find(a => a.name.toLowerCase() === String(target).toLowerCase());
    }
    if (!artist) return;

    const hasBooking = artist.bookingLeads && artist.bookingLeads.trim().length > 0;
    const hasConnect = artist.connectLeads && artist.connectLeads.trim().length > 0;
    const hasPress = artist.pressLeads && artist.pressLeads.trim().length > 0;
    const hasGeneral = artist.generalLeads && artist.generalLeads.trim().length > 0;
    const hasNotes = artist.notes && artist.notes.trim().length > 0;

    content.innerHTML = `
      <div class="networking-detail-header">
        <div>
          <h2 class="networking-detail-title">${escapeHtmlAdmin(artist.name)}</h2>
          <span style="font-size: 0.9rem; font-weight: 700; color: var(--accent-bright);">${escapeHtmlAdmin(artist.genre || 'General')}</span>
        </div>
        <button class="sheet-close-btn" style="position: static; width: 34px; height: 34px;" onclick="closeNetworkingDetailSheet()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Quick Stats Row -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        <span class="networking-stat-badge" style="background: rgba(241,169,160,0.2); color: var(--accent);">
          ❤️ ${artist.likesCount || 0} Likes
        </span>
        <span class="networking-stat-badge" style="background: var(--surface); color: var(--foreground);">
          🌍 ${escapeHtmlAdmin(artist.tourPotential || 'No leads yet')}
        </span>
      </div>

      ${artist.countries ? `
        <div class="networking-section-box">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--foreground-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Interested Countries</div>
          <div style="font-weight: 600; font-size: 0.95rem; color: var(--foreground);">${escapeHtmlAdmin(artist.countries)}</div>
        </div>
      ` : ''}

      ${hasBooking ? `
        <div class="networking-section-box" style="border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.08);">
          <div style="font-weight: 700; color: #10b981; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>🎯</span> Booking Interest
          </div>
          <div style="white-space: pre-line; color: var(--foreground); font-size: 0.9rem; line-height: 1.4;">${escapeHtmlAdmin(artist.bookingLeads)}</div>
        </div>
      ` : ''}

      ${hasConnect ? `
        <div class="networking-section-box" style="border-left: 4px solid #3b82f6; background: rgba(59, 130, 246, 0.08);">
          <div style="font-weight: 700; color: #3b82f6; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>🤝</span> Connect Requests
          </div>
          <div style="white-space: pre-line; color: var(--foreground); font-size: 0.9rem; line-height: 1.4;">${escapeHtmlAdmin(artist.connectLeads)}</div>
        </div>
      ` : ''}

      ${hasPress ? `
        <div class="networking-section-box" style="border-left: 4px solid #8b5cf6; background: rgba(139, 92, 246, 0.08);">
          <div style="font-weight: 700; color: #8b5cf6; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>📰</span> Press Coverage
          </div>
          <div style="white-space: pre-line; color: var(--foreground); font-size: 0.9rem; line-height: 1.4;">${escapeHtmlAdmin(artist.pressLeads)}</div>
        </div>
      ` : ''}

      ${hasGeneral ? `
        <div class="networking-section-box" style="border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.08);">
          <div style="font-weight: 700; color: #f59e0b; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>🔍</span> Talent Scouting & General
          </div>
          <div style="white-space: pre-line; color: var(--foreground); font-size: 0.9rem; line-height: 1.4;">${escapeHtmlAdmin(artist.generalLeads)}</div>
        </div>
      ` : ''}

      ${hasNotes ? `
        <div class="networking-section-box">
          <div style="font-weight: 700; color: var(--foreground-muted); margin-bottom: 6px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>💬</span> Delegate Notes & Feedback
          </div>
          <div style="white-space: pre-line; color: var(--foreground); font-size: 0.9rem; line-height: 1.5; background: var(--surface); padding: 10px; border-radius: 6px; border: 1px dashed var(--border);">${escapeHtmlAdmin(artist.notes)}</div>
        </div>
      ` : ''}

      ${!hasBooking && !hasConnect && !hasPress && !hasGeneral && !hasNotes && !artist.countries ? `
        <div style="text-align: center; padding: 25px; color: var(--foreground-muted); font-size: 0.9rem;">
          No leads, booking requests, or notes recorded for this artist yet.
        </div>
      ` : ''}
    `;
  } else {
    // Guest detail
    let guest = null;
    if (typeof target === 'number') {
      guest = networkingGuestsList[target];
    } else {
      const allGuests = getResolvedGuestsNetworkingList();
      guest = allGuests.find(g => 
        (g.email && g.email.toLowerCase() === String(target).toLowerCase()) ||
        (g.name && g.name.toLowerCase() === String(target).toLowerCase())
      ) || networkingGuestsList.find(g => 
        (g.email && g.email.toLowerCase() === String(target).toLowerCase()) ||
        (g.name && g.name.toLowerCase() === String(target).toLowerCase())
      );
    }
    if (!guest) return;

    const hasFavs = guest.favs && guest.favs.trim().length > 0;
    const hasBooking = guest.booking && guest.booking.trim().length > 0;
    const hasConnect = guest.connect && guest.connect.trim().length > 0;
    const hasPress = guest.press && guest.press.trim().length > 0;
    const hasGeneral = guest.general && guest.general.trim().length > 0;
    const hasNotes = guest.notes && guest.notes.trim().length > 0;
    const isActive = guest.totalLikes > 0 || hasFavs;

    content.innerHTML = `
      <div class="networking-detail-header">
        <div>
          <h2 class="networking-detail-title">${escapeHtmlAdmin(guest.name)}</h2>
          <div style="font-size: 0.88rem; color: var(--foreground-muted); margin-top: 2px;">
            ${guest.role ? escapeHtmlAdmin(guest.role) + ' • ' : ''}
            ${guest.company ? escapeHtmlAdmin(guest.company) + ' • ' : ''}
            ${escapeHtmlAdmin(guest.country || 'N/A')}
          </div>
        </div>
        <button class="sheet-close-btn" style="position: static; width: 34px; height: 34px;" onclick="closeNetworkingDetailSheet()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Quick Badges -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        <span class="networking-stat-badge" style="background: ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isActive ? '#10b981' : '#ef4444'};">
          ${isActive ? '🟢 Active' : '🔴 No Selections Yet'}
        </span>
        <span class="networking-stat-badge" style="background: rgba(241,169,160,0.2); color: var(--accent);">
          ❤️ ${guest.totalLikes || 0} Liked Artists
        </span>
        ${guest.email ? `
          <span class="networking-stat-badge" style="background: var(--surface); color: var(--foreground-muted);">
            ✉️ ${escapeHtmlAdmin(guest.email)}
          </span>
        ` : ''}
      </div>

      ${hasFavs ? `
        <div class="networking-section-box">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--accent); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;">
            <span>❤️</span> Liked Artists
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${guest.favs.split(',').map(aName => `<span style="display: inline-block; background: var(--surface); border: 1.5px solid #000; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; box-shadow: 1px 1px 0px rgba(0,0,0,1);">${escapeHtmlAdmin(aName.trim())}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${hasBooking ? `
        <div class="networking-section-box" style="border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.08);">
          <div style="font-weight: 700; color: #10b981; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>🎯</span> Booking Inquiries
          </div>
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--foreground);">${escapeHtmlAdmin(guest.booking)}</div>
        </div>
      ` : ''}

      ${hasConnect ? `
        <div class="networking-section-box" style="border-left: 4px solid #3b82f6; background: rgba(59, 130, 246, 0.08);">
          <div style="font-weight: 700; color: #3b82f6; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>🤝</span> Connect Requests
          </div>
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--foreground);">${escapeHtmlAdmin(guest.connect)}</div>
        </div>
      ` : ''}

      ${hasPress ? `
        <div class="networking-section-box" style="border-left: 4px solid #8b5cf6; background: rgba(139, 92, 246, 0.08);">
          <div style="font-weight: 700; color: #8b5cf6; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>📰</span> Press Coverage
          </div>
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--foreground);">${escapeHtmlAdmin(guest.press)}</div>
        </div>
      ` : ''}

      ${hasGeneral ? `
        <div class="networking-section-box" style="border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.08);">
          <div style="font-weight: 700; color: #f59e0b; margin-bottom: 4px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>🔍</span> Talent Scouting & General
          </div>
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--foreground);">${escapeHtmlAdmin(guest.general)}</div>
        </div>
      ` : ''}

      ${hasNotes ? `
        <div class="networking-section-box">
          <div style="font-weight: 700; color: var(--foreground-muted); margin-bottom: 6px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <span>💬</span> Notes on Artists
          </div>
          <div style="white-space: pre-line; color: var(--foreground); font-size: 0.9rem; line-height: 1.5; background: var(--surface); padding: 10px; border-radius: 6px; border: 1px dashed var(--border);">${escapeHtmlAdmin(guest.notes)}</div>
        </div>
      ` : ''}

      ${!hasFavs && !hasBooking && !hasConnect && !hasPress && !hasGeneral && !hasNotes ? `
        <div style="text-align: center; padding: 25px; color: var(--foreground-muted); font-size: 0.9rem;">
          This guest has not submitted any artist preferences or notes yet.
        </div>
      ` : ''}
    `;
  }

  if (sheet) {
    sheet.scrollTop = 0;
    if (content) content.scrollTop = 0;
  }
  overlay.classList.add('active');
  sheet.classList.add('active');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    if (sheet) {
      sheet.scrollTop = 0;
      if (content) content.scrollTop = 0;
    }
  });

  window.location.hash = "networkingsheet";
}

function closeNetworkingDetailSheet(isHashChange) {
  const overlay = document.getElementById('networking-sheet-overlay');
  const sheet = document.getElementById('networking-bottom-sheet');
  if (sheet) {
    sheet.scrollTop = 0;
    const content = document.getElementById('networking-modal-content');
    if (content) content.scrollTop = 0;
    sheet.classList.remove('active');
  }
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
  
  if (isHashChange !== true && window.location.hash === "#networkingsheet") {
    history.back();
  }
}

window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const sheet = document.getElementById('networking-bottom-sheet');
    if (sheet && sheet.classList.contains('active')) {
      closeNetworkingDetailSheet();
    }
  }
});

function loadAdminNetworkingData(forceRefresh = false) {
  const container = document.getElementById('admin-networking-list');
  if (!container) return;
  if (adminNetworkingData && !forceRefresh) {
    renderAdminNetworkingCubes();
    return;
  }
  container.innerHTML = '<p style="color:var(--foreground-muted); text-align:center; padding:15px; grid-column:1 / -1;">Loading networking insights...</p>';
  if (window.google && google.script && google.script.run) {
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.success) {
          adminNetworkingData = res;
          renderAdminNetworkingCubes();
        } else {
          container.innerHTML = '<p style="color:var(--foreground-muted); text-align:center; padding:15px; grid-column:1 / -1;">No networking data available yet.</p>';
        }
      })
      .withFailureHandler(function(err) {
        container.innerHTML = '<p style="color:var(--foreground-muted); text-align:center; padding:15px; grid-column:1 / -1;">Could not load networking data.</p>';
      })
      .getAdminArtistsNetworkingData();
  }
}

function triggerFullLeadsSync() {
  const container = document.getElementById('admin-networking-list');
  if (container) {
    container.innerHTML = '<p style="color:var(--foreground-muted); text-align:center; padding:15px; grid-column:1 / -1;">Scanning local test data and running full recalculation...</p>';
  }

  // Scan localStorage for any guest emails that have saved favorites in this browser
  const emailsToSync = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('artist_favs_')) {
        const em = k.replace('artist_favs_', '').trim();
        if (em && em.includes('@')) emailsToSync.add(em);
      }
    }
  } catch(e) {}

  const runServerSync = () => {
    if (window.google && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(function(res) {
          if (typeof showToast === 'function') {
            showToast(res.message || "Sync completed successfully!", "success");
          }
          loadAdminNetworkingData(true);
        })
        .withFailureHandler(function(err) {
          if (typeof showToast === 'function') {
            showToast("Sync failed: " + err.toString(), "error");
          }
          loadAdminNetworkingData(true);
        })
        .syncAllArtistsAndLeads();
    }
  };

  const emailList = Array.from(emailsToSync);
  if (emailList.length > 0) {
    let pending = emailList.length;
    emailList.forEach(em => {
      syncLocalGuestFeedbackToServer(em, () => {
        pending--;
        if (pending <= 0) {
          runServerSync();
        }
      });
    });
  } else {
    runServerSync();
  }
}

function loadAdminDashboard(forceRefresh = false) {
  if (adminDataLoaded && !forceRefresh) return;
  
  const container = document.getElementById("admin-dashboard-container");
  if (!container) return;

  // 1. Instant display from SWR cache if available
  const cachedAdmin = localStorage.getItem('swr_adminData');
  if (cachedAdmin && !forceRefresh && !adminDataLoaded) {
    try {
      const parsed = JSON.parse(cachedAdmin);
      if (parsed && parsed.success && parsed.guests) {
        adminData = parsed;
        adminDataLoaded = true;
        renderAdminDashboard();
      }
    } catch(e) {}
  }
  
  // 2. If no cached data displayed yet, show the polite mascot loader
  if (!adminDataLoaded) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px;">
        <div class="musical-loader-wrapper" style="display:flex; flex-direction:column; align-items:center;">
          <div class="musical-loader">
            <span class="music-note music-note-1">🎵</span>
            <img src="/polar-bear.png" alt="IMSF Mascot" class="polar-bear-loader-img">
            <span class="music-note music-note-2">🎶</span>
          </div>
          <p class="loader-text">Loading production data...</p>
        </div>
      </div>
    `;
  }
  
  const token = localStorage.getItem('guestSessionToken') || localStorage.getItem('originalAdminToken');
  if (!token) {
    if (!adminDataLoaded) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; background: var(--surface); border: 2px solid #000; border-radius: 8px; box-shadow: 3px 3px 0px rgba(0,0,0,1);">
          <p class="error-text" style="font-weight: bold; margin-bottom: 12px;">Session token not found. Please log in again.</p>
          <button class="primary" onclick="resetLogin()">Log In</button>
        </div>
      `;
    }
    return;
  }

  google.script.run
    .withSuccessHandler(function(res) {
      if (!res || !res.success) {
        const msg = (res && res.message) ? res.message : "Failed to load admin data.";
        if (!adminDataLoaded) {
          container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: var(--surface); border: 2px solid #000; border-radius: 8px; box-shadow: 3px 3px 0px rgba(0,0,0,1);">
              <p class="error-text" style="font-weight: bold; margin-bottom: 12px;">${msg}</p>
              <button class="primary" onclick="loadAdminDashboard(true)">🔄 Try Again</button>
            </div>
          `;
        }
        return;
      }
      adminData = res;
      adminDataLoaded = true;
      try {
        localStorage.setItem('swr_adminData', JSON.stringify(res));
      } catch(e) {}
      try {
        renderAdminDashboard();
      } catch(renderErr) {
        console.error("renderAdminDashboard threw error:", renderErr);
        container.innerHTML = `
          <div style="text-align: center; padding: 30px; background: var(--surface); border: 2px solid #000; border-radius: 8px;">
            <p class="error-text" style="font-weight: bold; margin-bottom: 10px;">Rendering error: ${renderErr.message}</p>
            <button class="primary" onclick="loadAdminDashboard(true)">🔄 Try Again</button>
          </div>
        `;
      }
    })
    .withFailureHandler(function(err) {
      console.error("loadAdminDashboard failed:", err);
      if (!adminDataLoaded) {
        const cleanErr = String(err && err.message ? err.message : err).replace(/^Error:\s*/i, '');
        container.innerHTML = `
          <div style="text-align: center; padding: 30px; background: var(--surface); border: 2px solid #000; border-radius: 8px; box-shadow: 3px 3px 0px rgba(0,0,0,1); max-width: 480px; margin: 20px auto;">
            <p class="error-text" style="font-weight: bold; margin-bottom: 10px; font-size: 1.05rem;">${cleanErr}</p>
            <p style="font-size: 0.85rem; color: var(--foreground-muted); margin-bottom: 16px;">We encountered a temporary connection issue fetching production data.</p>
            <button class="primary" onclick="loadAdminDashboard(true)" style="padding: 10px 20px; font-weight: bold;">🔄 Retry Connection</button>
          </div>
        `;
      }
    })
    .getAdminDashboardData(token);
}

function filterAdminGuests(query) {
  const listContainer = document.getElementById("admin-guest-list");
  if (!listContainer || !adminData || !adminData.guests) return;
  
  const q = query.toLowerCase().trim();
  const headers = adminData.guests[0].map(h => String(h).trim().toLowerCase());
  let firstNameIdx = headers.indexOf("שם פרטי");
  if (firstNameIdx === -1) firstNameIdx = headers.findIndex(h => h.includes("שם פרטי") || h.includes("first name"));
  let lastNameIdx = headers.indexOf("שם משפחה");
  if (lastNameIdx === -1) lastNameIdx = headers.findIndex(h => h.includes("שם משפחה") || h.includes("last name"));
  let emailIdx = headers.indexOf("מייל אורח");
  if (emailIdx === -1) emailIdx = headers.findIndex(h => h.includes("מייל") || h.includes("email"));
  let roleIdx = headers.indexOf("תפקיד");
  if (roleIdx === -1) roleIdx = headers.findIndex(h => h.includes("תפקיד") || h.includes("role"));
  let companyIdx = headers.indexOf("שם חברה");
  if (companyIdx === -1) companyIdx = headers.findIndex(h => h.includes("שם חברה") || h.includes("company"));
  const hHotel = headers.indexOf("התקבל טופס אירוח?");
  
  let html = "";
  let count = 0;
  
  for (let i = 1; i < adminData.guests.length; i++) {
    const row = adminData.guests[i];
    const fname = firstNameIdx !== -1 ? String(row[firstNameIdx] || "").trim() : "";
    const lname = lastNameIdx !== -1 ? String(row[lastNameIdx] || "").trim() : "";
    const email = emailIdx !== -1 ? String(row[emailIdx] || "").trim() : "";
    const rawRole = roleIdx !== -1 ? String(row[roleIdx] || "").trim() : "";
    const cleanRole = rawRole.replace(/\s+/g, ' ').trim();
    const company = companyIdx !== -1 ? String(row[companyIdx] || "").trim() : "";

    // Same filter as the Guests tab (Directory):
    // Must have a name, must have a valid email with '@', and role must not be or contain "הפקה חשיפה"
    if (!fname && !lname) continue;
    if (!email || !email.includes("@")) continue;
    if (cleanRole === "הפקה חשיפה" || cleanRole.includes("הפקה חשיפה")) continue;
    
    const fullName = (fname + " " + lname).trim();
    
    if (!q || fullName.toLowerCase().includes(q) || email.toLowerCase().includes(q) || company.toLowerCase().includes(q)) {
      
      const hasHotel = hHotel !== -1 && (row[hHotel] === true || String(row[hHotel]).toLowerCase() === 'true');
      const statusDot = hasHotel ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; margin-right:6px;" title="All Good"></span>' : '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b; margin-right:6px;" title="Missing Forms"></span>';
      
      html += `
        <div style="background: var(--surface); padding: 12px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); cursor: pointer; transition: transform 0.2s;" onclick="viewAdminGuestDetails(${i})" onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='scale(1)'">
          <div style="flex-grow: 1; overflow: hidden;">
            <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center;">${statusDot}${fullName}</div>
            <div style="font-size: 12px; color: var(--foreground-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${company ? company + ' • ' : ''}${email}</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color: var(--foreground-muted); margin-left: 10px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </div>
      `;
      count++;
    }
  }
  
  if (count === 0) {
    html = '<p style="color: var(--foreground-muted); text-align: center; padding: 20px;">No delegates match your search.</p>';
  }
  
  listContainer.innerHTML = html;
}

function closeAdminModal(isHashChange) {
  const adminSheetEl = document.getElementById('admin-bottom-sheet');
  const adminContentEl = document.getElementById('admin-modal-content');
  if (adminSheetEl) {
    adminSheetEl.scrollTop = 0;
    adminSheetEl.classList.remove('active');
  }
  if (adminContentEl) {
    adminContentEl.scrollTop = 0;
  }
  document.getElementById('admin-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  
  if (typeof cancelEditPersonalMessage === 'function') {
    cancelEditPersonalMessage();
  }

  if (isHashChange !== true && window.location.hash === "#adminsheet") {
    history.back();
  }
}

function viewAdminGuestDetails(rowIndex) {
  const row = adminData.guests[rowIndex];
  const headers = adminData.guests[0].map(h => String(h).trim().toLowerCase());
  
  const val = (colName) => {
    const idx = headers.indexOf(colName.toLowerCase());
    return idx !== -1 ? row[idx] : '';
  };
  
  const fname = val("שם פרטי");
  const lname = val("שם משפחה");
  const fullName = fname + " " + lname;
  const email = val("מייל אורח");
  const phone = val("טלפון");
  const company = val("שם חברה");
  const role = val("תפקיד");
  const country = val("מדינה");
  const personalMsg = val("הודעה אישית בפורטל");
  const parsedMsgs = parseClientPersonalMessages(personalMsg);
  const escapeEmail = String(email).replace(/'/g, "\\'");
  const prodNotes = val("הערות");
  
  const hasHotel = val("התקבל טופס אירוח?") === true || String(val("התקבל טופס אירוח?")).toLowerCase() === 'true';
  const hasFlight = val("התקבל טופס טיסות?") === true || String(val("התקבל טופס טיסות?")).toLowerCase() === 'true';
  const hasPassport = val("יש תמונת דרכון?") === true || String(val("יש תמונת דרכון?")).toLowerCase() === 'true';
  
  let tagsHtml = '';
  tagsHtml += hasHotel ? '<span class="status-tag success" style="margin-right:6px;">Hotel ✓</span>' : '<span class="status-tag danger" style="margin-right:6px;">Hotel ✗</span>';
  tagsHtml += hasFlight ? '<span class="status-tag success" style="margin-right:6px;">Flights ✓</span>' : '<span class="status-tag danger" style="margin-right:6px;">Flights ✗</span>';
  tagsHtml += hasPassport ? '<span class="status-tag success">Passport ✓</span>' : '<span class="status-tag danger">Passport ✗</span>';

  let waBtn = '';
  if (phone) {
    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('05')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }
    waBtn = `<a href="https://wa.me/${cleanPhone}" target="_blank" class="wa-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #25D366; color: white; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Message on WhatsApp
    </a>`;
  }

  const getRowByEmail = (sheetData) => {
    if (!sheetData || sheetData.length < 2) return null;
    let headerRowIdx = -1;
    let h = [];
    let eIdx = -1;
    
    // Scan first 10 rows for the header
    for (let r = 0; r < Math.min(10, sheetData.length); r++) {
      h = sheetData[r].map(x => String(x).trim().toLowerCase());
      eIdx = h.indexOf("מייל אורח");
      if (eIdx === -1) eIdx = h.findIndex(col => col.includes("מייל") || col.includes("email"));
      if (eIdx !== -1) {
        headerRowIdx = r;
        break;
      }
    }
    
    if (headerRowIdx === -1) return null;
    
    const lowerEmail = email.toLowerCase();
    for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
      if (String(sheetData[i][eIdx]).trim().toLowerCase() === lowerEmail) {
        const obj = {};
        h.forEach((key, idx) => { obj[key] = sheetData[i][idx]; });
        return obj;
      }
    }
    return null;
  };

  const fDataRaw = getRowByEmail(adminData.flights);
  const fUpRaw = getRowByEmail(adminData.flightsUpdates);
  const fData = (fDataRaw || fUpRaw) ? Object.assign({}, fUpRaw || {}) : null;
  if (fData && fDataRaw) {
    Object.keys(fDataRaw).forEach(k => {
      const val = fDataRaw[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        if (k.includes('כרטיס') || k.includes('ticket')) {
          const existingCount = (String(fData[k] || '').match(/https?:\/\/[^\s"',;<>]+/gi) || []).length;
          const newCount = (String(val).match(/https?:\/\/[^\s"',;<>]+/gi) || []).length;
          if (newCount >= existingCount) {
            fData[k] = val;
          }
        } else {
          fData[k] = val;
        }
      }
    });
  }
  const hjData = getRowByEmail(adminData.hotelJlm);
  const htData = getRowByEmail(adminData.hotelTlv);

  // Flight HTML
  let flightHtml = '<p style="color:var(--foreground-muted); font-size:0.9rem;">No flight info</p>';
  if (fData) {
    const getFlightVal = (altKeys) => {
      for (const k of altKeys) {
        const cleanK = String(k).trim().toLowerCase();
        for (const [key, val] of Object.entries(fData)) {
          if (String(key).trim().toLowerCase() === cleanK && val !== undefined && val !== '') return val;
        }
      }
      for (const k of altKeys) {
        const cleanK = String(k).trim().toLowerCase();
        for (const [key, val] of Object.entries(fData)) {
          const cleanHeader = String(key).trim().toLowerCase();
          if (cleanHeader && (cleanHeader.includes(cleanK) || cleanK.includes(cleanHeader)) && val !== undefined && val !== '') return val;
        }
      }
      return '';
    };

    let arrival = getFlightVal(["תאריך נחיתה", "תאריך הגעה", "הגעה לישראל", "תאריך חזרה"]);
    let arrivalTime = getFlightVal(["שעת נחיתה", "שעת הגעה", "שעת נחיתה משוערת", 'שעת נחיתה בנתב"ג', "שעת נחיתה בנתבג"]);
    let arrivalFlight = getFlightVal(["מספר טיסה נחיתה", "מספר טיסת נחיתה", "מספר טיסת הגעה", "מספר טיסה הגעה", "טיסת נחיתה"]);
    let arrivalAirline = getFlightVal(["חברת תעופה נחיתה", "חברת תעופה הגעה"]);
    let origin = getFlightVal(["יעד הגעה", "ארץ מוצא", "עיר מוצא", "מאיפה"]);
    
    let departure = getFlightVal(["תאריך המראה", "תאריך עזיבה", "תאריך יציאה", "חזרה מישראל"]);
    let departureTime = getFlightVal(["שעת המראה", "שעת עזיבה", "שעת יציאה", "שעת המראה משוערת", 'שעת המראה מנתב"ג']);
    let departureFlight = getFlightVal(["מספר טיסה המראה", "מספר טיסת המראה", "מספר טיסת עזיבה", "טיסת המראה"]);
    let departureAirline = getFlightVal(["חברת תעופה המראה", "חברת תעופה עזיבה"]);
    let dest = getFlightVal(["יעד חזרה", "לאיפה", "מדינת חזרה", "לאן"]);
    
    let shuttle = getFlightVal(["שיוך לשאטל", "הסעה נדרשת", "הסעה", "שאטל"]);
    let togetherWith = getFlightVal(["ביחד עם", "עם מי", "יחד עם", "נוסעים נוספים", "together with", "שותפים לשאטל", "נוסעים ביחד", "ביחד", "שותף לשאטל", "נוסע/ת עם", "נוסע עם", "נוסעים איתו", "שותפים", "נוסעים יחד", "co-passengers", "together", "passengers"]);
    let ticketLink = getFlightVal(["לינק כרטיס סופי", "לינק לכרטיס סופי", "קישור לכרטיס טיסה", "קישור לכרטיס", "כרטיס טיסה", "לינק לכרטיס", "כרטיס סופי", "final ticket link"]);
    let flightNotes = fData['הערות טיסות'] || '';

    function formatFlightDate(dStr) {
      if (!dStr) return '';
      const d = new Date(dStr);
      if (!isNaN(d.getTime()) && dStr.toString().length > 5) {
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      }
      return dStr;
    }
    
    function formatFlightTime(tStr) {
      if (!tStr) return '';
      const str = String(tStr).trim();
      if (!str || str === '-' || /^#|^=/i.test(str) || /^n\/?a$/i.test(str) || /^null$/i.test(str)) return '';
      
      const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
      if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = ampmMatch[2];
        const period = ampmMatch[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      }

      const timeMatch = str.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      if (timeMatch) {
        return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      }

      const num = Number(str);
      if (!isNaN(num) && num > 0 && num < 1) {
         const totalMinutes = Math.round(num * 24 * 60);
         const hh = Math.floor(totalMinutes / 60) % 24;
         const mm = totalMinutes % 60;
         return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }
      return str;
    }

    function formatShuttleTime(val) {
      if (val === null || val === undefined) return '';
      const str = String(val).trim();
      if (!str || str === '-' || /^#|^=/i.test(str) || /^n\/?a$/i.test(str) || /^none$/i.test(str) || /^null$/i.test(str)) {
        return '';
      }

      const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
      if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = ampmMatch[2];
        const period = ampmMatch[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      }

      const timeMatch = str.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
      if (timeMatch) {
        return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      }

      const num = Number(str);
      if (!isNaN(num) && num > 0 && num < 1) {
        const totalMinutes = Math.round(num * 24 * 60);
        const hh = Math.floor(totalMinutes / 60) % 24;
        const mm = totalMinutes % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }

      if (!isNaN(num) && num >= 0 && num < 24 && !str.includes(':')) {
        const hours = Math.floor(num);
        const minutes = Math.round((num - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      return str;
    }

    arrival = formatFlightDate(arrival) || "TBD";
    arrivalTime = formatFlightTime(arrivalTime);
    departure = formatFlightDate(departure) || "TBD";
    departureTime = formatFlightTime(departureTime);
    origin = origin || "TBD";
    dest = dest || "TBD";

    const formattedShuttle = formatShuttleTime(shuttle);
    const cleanTogetherWith = togetherWith ? String(togetherWith).trim() : '';
    const hasTogetherWith = cleanTogetherWith !== '' && 
                            !cleanTogetherWith.startsWith('#') && 
                            !cleanTogetherWith.startsWith('=') && 
                            !/^n\/?a$/i.test(cleanTogetherWith) && 
                            !/^none$/i.test(cleanTogetherWith) && 
                            !/^null$/i.test(cleanTogetherWith) && 
                            cleanTogetherWith !== '-';

    const togetherNames = hasTogetherWith
      ? cleanTogetherWith
          .split(/[,;\n+&،/]+|\s+and\s+|\s+וגם\s+/i)
          .map(n => n.trim())
          .filter(n => n && !/^n\/?a$/i.test(n) && !/^none$/i.test(n) && !/^null$/i.test(n) && n !== "-")
      : [];

    flightHtml = '';

    if (ticketLink) {
      flightHtml += renderTicketButtonsHtml(ticketLink);
    }

    flightHtml += `
      <div class="boarding-pass" style="margin-bottom: 12px;">
        <div class="bp-header">
          <span>OFFICIAL ITINERARY</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M21,16v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/></svg>
        </div>
        <div class="bp-body">
          <div class="bp-flight">
            <div class="bp-label" style="display: flex; justify-content: space-between;">
              <span>INBOUND TO ISRAEL</span>
              ${arrivalFlight ? `<span style="font-weight:bold; color:var(--accent);">${arrivalFlight}</span>` : ''}
            </div>
            <div class="bp-route">
              <span class="bp-city">${origin}</span>
              <span class="bp-arrow">→</span>
              <span class="bp-city">TLV</span>
            </div>
            <div class="bp-date" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
              <span>${arrivalAirline ? arrivalAirline + ' | ' : ''}${arrival} ${arrivalTime ? '- ' + arrivalTime : ''}</span>
            </div>
          </div>

          <div class="bp-divider"></div>
          <div class="bp-flight">
            <div class="bp-label" style="display: flex; justify-content: space-between;">
              <span>OUTBOUND FROM ISRAEL</span>
              ${departureFlight ? `<span style="font-weight:bold; color:var(--accent);">${departureFlight}</span>` : ''}
            </div>
            <div class="bp-route">
              <span class="bp-city">TLV</span>
              <span class="bp-arrow">→</span>
              <span class="bp-city">${dest}</span>
            </div>
            <div class="bp-date" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
              <span>${departureAirline ? departureAirline + ' | ' : ''}${departure} ${departureTime ? '- ' + departureTime : ''}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    if (formattedShuttle || togetherNames.length > 0) {
      const isTimeOnly = /^\d{2}:\d{2}$/.test(formattedShuttle);
      let shuttleTextHtml = '';
      if (formattedShuttle) {
        shuttleTextHtml = isTimeOnly
          ? `You are on the shuttle from Ben Gurion airport leaving at <strong>${formattedShuttle}</strong>.`
          : `You are on the shuttle from Ben Gurion airport: <strong>${formattedShuttle}</strong>.`;
      } else {
        shuttleTextHtml = `You are scheduled on a shuttle from Ben Gurion airport.`;
      }

      const passengersHtml = togetherNames.length > 0 ? `
        <div class="shuttle-passengers-wrap">
          <span style="font-size: 0.82rem; font-weight: 600; color: var(--foreground-muted); display: block; margin-bottom: 6px;">
            Together with:
          </span>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${togetherNames.map(name => `
              <button type="button" class="shuttle-passenger-badge" onclick="openPassengerProfile('${escapeHtml(name).replace(/'/g, "\\'")}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                <span>${escapeHtml(name)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : '';

      flightHtml += `
        <div class="shuttle-info-card" style="margin-top: 12px; margin-bottom: 12px;">
          <h4 style="margin: 0 0 8px 0; color: var(--accent); display: flex; align-items: center; gap: 8px; font-size: 1rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Shuttle Information
          </h4>
          <p style="margin: 0; font-size: 0.9rem;">
            ${shuttleTextHtml}
          </p>
          ${passengersHtml}
        </div>
      `;
    }
    if (flightNotes) {
      flightHtml += `<div style="margin-top:4px; font-size:0.85rem; color:var(--accent-bright);">Notes: ${flightNotes}</div>`;
    }
  }

  // Hotel HTML
  const formatHotel = (data, title) => {
    if (!data) return '';
    const checkin = formatDateOnly(data['תאריך הגעה']) || '';
    const checkout = formatDateOnly(data['תאריך יציאה']) || '';
    if (!checkin && !checkout) return '';
    
    // Find money columns
    let moneyText = '';
    Object.keys(data).forEach(k => {
      if ((k.includes('תשלום') || k.includes('אורח') || k.includes('כסף') || k.includes('חיוב')) && data[k]) {
        if (!k.includes('מייל') && !k.includes('שם') && !k.includes('תאריך')) {
          moneyText += `<div style="margin-bottom: 4px;"><b>${k}:</b> <span style="color:#ef4444; font-weight:bold;">${data[k]}</span></div>`;
        }
      }
    });

    return `
      <div style="font-size:0.9rem; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
        <strong style="color:var(--foreground); display:block; margin-bottom: 4px;">${title}</strong>
        <div style="margin-bottom: 4px;"><b>In:</b> ${checkin} | <b>Out:</b> ${checkout}</div>
        <div style="margin-bottom: 4px;"><b>Room:</b> ${data['סוג חדר'] || '?'}</div>
        ${data['צריך הזמנה לויזה?'] ? `<div style="margin-bottom: 4px;"><b>Visa Required:</b> ${data['צריך הזמנה לויזה?']}</div>` : ''}
        ${data['הערות'] ? `<div style="color:var(--accent-bright); margin-bottom: 4px;">Notes: ${data['הערות']}</div>` : ''}
        ${moneyText}
      </div>
    `;
  };

  const formattedHotels = formatHotel(hjData, 'Jerusalem Hotel') + formatHotel(htData, 'Tel Aviv Hotel');
  const hotelHtml = formattedHotels || '<p style="color:var(--foreground-muted); font-size:0.9rem;">No hotel info</p>';

  const html = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
      <div>
        <h2 style="margin: 0; font-size: 1.4rem;">${fullName}</h2>
        <div style="color: var(--accent-bright); font-weight: 500; font-size: 0.95rem;">${role ? role + ' @ ' : ''}${company}</div>
        <div style="color: var(--foreground-muted); font-size: 0.85rem; margin-top: 2px;">${country}</div>
      </div>
      <button class="sheet-close-btn" onclick="closeAdminModal()" style="background:var(--surface); border:1px solid var(--border); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:var(--foreground);">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    
    <div style="margin-bottom: 20px;">
      ${tagsHtml}
    </div>

    <!-- Personal Message (2-Column Split) -->
    <div style="background: var(--surface); padding: 14px; border-radius: 10px; border: 1.5px solid var(--border); margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: var(--foreground); letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
        Personal Portal Messages
      </h4>
      <div class="admin-msg-split-grid">
        <!-- Left: Compose & Send / Update -->
        <div style="display: flex; flex-direction: column;">
          <label id="admin-personal-msg-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: var(--foreground-muted);">Compose Personal Message</label>
          <textarea id="admin-personal-msg" rows="3" style="width:100%; border:1px solid var(--border); border-radius:6px; padding:8px; background:var(--background); color:var(--foreground); font-family:inherit; resize:vertical; margin-bottom:8px; box-sizing: border-box;" placeholder="Type personal message for guest..."></textarea>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button id="admin-save-msg-btn" class="primary" style="padding: 6px 14px; font-size: 0.85rem; border-radius: 6px; width:auto;" onclick="savePersonalMessage('${escapeEmail}')">
              Send Message
            </button>
            <button id="admin-cancel-edit-msg-btn" class="secondary" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; width:auto; display: none;" onclick="cancelEditPersonalMessage()">
              Cancel
            </button>
            <div id="admin-msg-status" style="font-size:0.8rem; display:none;"></div>
          </div>
        </div>

        <!-- Right: Active in Guest Portal -->
        <div style="display: flex; flex-direction: column; background: var(--background); border: 1px dashed var(--border); border-radius: 8px; padding: 10px; max-height: 250px; overflow-y: auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; position: sticky; top: 0; background: var(--background); z-index: 1; padding-bottom: 4px;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--foreground-muted);">Active Messages for Guest</span>
            <span id="admin-personal-status-pill" style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${parsedMsgs.length ? 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;' : 'background: var(--surface); color: var(--foreground-muted); border: 1px solid var(--border);'}">
              ${parsedMsgs.length ? parsedMsgs.length + ' Active' : 'NO MESSAGES'}
            </span>
          </div>
          <div id="admin-active-personal-preview" style="flex: 1; display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      </div>
    </div>
    
    <!-- Flights & Hotels -->
    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px;">
      <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); letter-spacing: 0.5px;">✈️ Flights</h4>
        ${flightHtml}
      </div>
      <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); letter-spacing: 0.5px;">🏨 Accommodations</h4>
        ${hotelHtml}
      </div>
    </div>

    <!-- Production Notes -->
    <div style="background: #fef9c3; color: #854d0e; padding: 12px; border-radius: 8px; border: 1px solid #fde047; margin-bottom: 15px;">
      <h4 style="margin: 0 0 5px 0; font-size: 0.9rem; letter-spacing: 0.5px;">Internal Notes</h4>
      <p style="margin:0; font-size: 0.9rem; white-space: pre-wrap; word-break: break-word;">${prodNotes || 'No internal notes.'}</p>
    </div>
    
    <!-- Contact Info -->
    <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); letter-spacing: 0.5px;">Contact Info</h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; word-break: break-all;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color: var(--accent-bright); flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <a href="mailto:${email}" style="color: var(--foreground); text-decoration: none;">${email}</a>
        </div>
        ${phone ? `
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color: var(--accent-bright); flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          <a href="tel:${phone}" style="color: var(--foreground); text-decoration: none;">${phone}</a>
        </div>
        ` : ''}
      </div>
      ${waBtn}
    </div>
    
    <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
      <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); letter-spacing: 0.5px;">Quick Actions</h4>
      <div style="display: flex; flex-direction: column; gap: 10px;">
         <button class="secondary" style="width: 100%; justify-content: center;" onclick="impersonateGuest('${email}')">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right: 8px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
           View Portal as ${fname}
         </button>
      </div>
    </div>
  `;
  
  const adminSheetEl = document.getElementById('admin-bottom-sheet');
  const adminContentEl = document.getElementById('admin-modal-content');
  if (adminContentEl) {
    adminContentEl.innerHTML = html;
    adminContentEl.scrollTop = 0;
  }
  if (adminSheetEl) {
    adminSheetEl.scrollTop = 0;
  }
  document.getElementById('admin-modal-overlay').classList.add('active');
  if (adminSheetEl) adminSheetEl.classList.add('active');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    if (adminSheetEl) adminSheetEl.scrollTop = 0;
    if (adminContentEl) adminContentEl.scrollTop = 0;
  });
  
  renderAdminGuestPersonalMessages(email, parsedMsgs);
  
  const guestToken = localStorage.getItem('guestSessionToken');
  if (guestToken) {
    google.script.run
      .withSuccessHandler(res => {
        if (res && res.success && res.messages) {
          renderAdminGuestPersonalMessages(email, res.messages);
        }
      })
      .getPersonalMessages(guestToken, email);
  }
  
  window.location.hash = "adminsheet";
}

function parseClientPersonalMessages(cellValue) {
  if (!cellValue) return [];
  const str = String(cellValue).trim();
  if (!str) return [];
  
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) {
        return arr.map((item, idx) => {
          if (typeof item === 'string') {
            return { id: 'm_' + (idx + 1), text: item, timestampStr: 'Personal Message' };
          }
          return {
            id: item.id || ('m_' + (idx + 1)),
            text: item.text || item.message || '',
            timestamp: item.timestamp || 0,
            timestampStr: item.timestampStr || 'Personal Message'
          };
        }).filter(item => item.text && item.text.trim());
      }
    } catch(e) {}
  }
  
  const lines = str.split(/\n\s*---\s*\n|\n\n+/).map(s => s.trim()).filter(Boolean);
  return lines.map((line, idx) => ({
    id: 'm_' + (idx + 1),
    text: line,
    timestamp: 0,
    timestampStr: 'Personal Message'
  }));
}

window.parseClientPersonalMessages = parseClientPersonalMessages;

window.renderAdminGuestPersonalMessages = function(guestEmail, messages) {
  const previewDiv = document.getElementById('admin-active-personal-preview');
  const pill = document.getElementById('admin-personal-status-pill');
  if (!previewDiv) return;
  
  const msgs = messages || [];
  if (pill) {
    pill.innerText = msgs.length ? `${msgs.length} Active` : 'NO MESSAGES';
    pill.style.background = msgs.length ? '#d1fae5' : 'var(--surface)';
    pill.style.color = msgs.length ? '#065f46' : 'var(--foreground-muted)';
    pill.style.border = msgs.length ? '1px solid #a7f3d0' : '1px solid var(--border)';
  }
  
  if (msgs.length === 0) {
    previewDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--foreground-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">
        No active personal messages for this guest.
      </div>
    `;
    return;
  }
  
  const escapeEmail = String(guestEmail).replace(/'/g, "\\'");
  let html = "";
  msgs.forEach(m => {
    const encoded = encodeURIComponent(m.text);
    const safeId = String(m.id).replace(/'/g, "\\'");
    html += `
      <div class="admin-personal-msg-card" id="admin-personal-card-${safeId}">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 0.72rem; color: var(--foreground-muted); font-weight: 500;">
            ${escapeHtmlAdmin(m.timestampStr || 'Personal Message')}
          </span>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="secondary" style="padding: 2px 7px; font-size: 0.75rem; border-radius: 4px; height: auto;" onclick="loadPersonalMessageItemForEdit('${escapeEmail}', '${safeId}', '${encoded}')">
              ✏️ Edit
            </button>
            <button type="button" class="secondary" style="padding: 2px 7px; font-size: 0.75rem; border-radius: 4px; height: auto; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" onclick="deletePersonalMessageItem('${escapeEmail}', '${safeId}')">
              🗑️ Delete
            </button>
          </div>
        </div>
        <div style="font-size: 0.86rem; color: var(--foreground); white-space: pre-wrap; word-break: break-word; line-height: 1.4;">${escapeHtmlAdmin(m.text)}</div>
      </div>
    `;
  });
  previewDiv.innerHTML = html;
};

window.editingPersonalMessageGuestEmail = null;
window.editingPersonalMessageId = null;

window.loadPersonalMessageItemForEdit = function(guestEmail, messageId, encodedText) {
  const text = decodeURIComponent(encodedText || '');
  const msgInput = document.getElementById('admin-personal-msg');
  const labelEl = document.getElementById('admin-personal-msg-label');
  const saveBtn = document.getElementById('admin-save-msg-btn');
  const cancelBtn = document.getElementById('admin-cancel-edit-msg-btn');
  
  window.editingPersonalMessageGuestEmail = guestEmail;
  window.editingPersonalMessageId = messageId;
  
  if (msgInput) {
    msgInput.value = text;
    msgInput.focus();
    msgInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (labelEl) labelEl.innerText = 'Edit Personal Message';
  if (saveBtn) saveBtn.innerText = 'Update Message';
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
};

window.cancelEditPersonalMessage = function() {
  window.editingPersonalMessageGuestEmail = null;
  window.editingPersonalMessageId = null;
  const msgInput = document.getElementById('admin-personal-msg');
  const labelEl = document.getElementById('admin-personal-msg-label');
  const saveBtn = document.getElementById('admin-save-msg-btn');
  const cancelBtn = document.getElementById('admin-cancel-edit-msg-btn');
  
  if (msgInput) msgInput.value = '';
  if (labelEl) labelEl.innerText = 'Compose Personal Message';
  if (saveBtn) saveBtn.innerText = 'Send Message';
  if (cancelBtn) cancelBtn.style.display = 'none';
};

window.savePersonalMessage = function(guestEmail, explicitMsg) {
  const msgInput = document.getElementById('admin-personal-msg');
  const msg = (explicitMsg !== undefined) ? explicitMsg : (msgInput ? msgInput.value.trim() : '');
  if (!msg) {
    alert('Please enter a message first.');
    return;
  }
  
  const statusDiv = document.getElementById('admin-msg-status');
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--foreground-muted)';
    statusDiv.innerText = 'Saving...';
  }
  
  const token = localStorage.getItem('guestSessionToken');
  const isEditing = window.editingPersonalMessageId !== null;
  const editId = window.editingPersonalMessageId;
  
  const onSuccess = (res) => {
    if (res && res.success) {
      if (statusDiv) {
        statusDiv.style.color = '#10b981';
        statusDiv.innerText = isEditing ? 'Message updated!' : 'Message sent!';
      }
      
      // Update local adminData cache
      if (adminData && adminData.guests && adminData.guests.length > 1) {
        const headers = adminData.guests[0].map(h => String(h).trim().toLowerCase());
        const emailIdx = headers.indexOf("מייל אורח");
        const msgIdx = headers.indexOf("הודעה אישית בפורטל");
        if (emailIdx !== -1 && msgIdx !== -1) {
          for (let i = 1; i < adminData.guests.length; i++) {
            if (String(adminData.guests[i][emailIdx]).trim().toLowerCase() === guestEmail.toLowerCase()) {
              adminData.guests[i][msgIdx] = res.rawValue !== undefined ? res.rawValue : JSON.stringify(res.messages);
              break;
            }
          }
        }
      }
      try {
        localStorage.setItem('swr_adminData', JSON.stringify(adminData));
      } catch(e) {}
      
      cancelEditPersonalMessage();
      renderAdminGuestPersonalMessages(guestEmail, res.messages || []);
    } else {
      if (statusDiv) {
        statusDiv.style.color = '#ef4444';
        statusDiv.innerText = 'Error: ' + (res ? res.message : 'Unknown error');
      }
    }
    setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
  };
  
  const onFailure = (err) => {
    if (statusDiv) {
      statusDiv.style.color = '#ef4444';
      statusDiv.innerText = 'Error: ' + err;
      setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
    }
  };
  
  if (isEditing) {
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .updatePersonalMessageItem(token, guestEmail, editId, msg);
  } else {
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .addPersonalMessage(token, guestEmail, msg);
  }
};

window.deletePersonalMessageItem = function(guestEmail, messageId) {
  if (!confirm("Are you sure you want to delete this personal message? The guest will no longer see it.")) return;
  
  const statusDiv = document.getElementById('admin-msg-status');
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--foreground-muted)';
    statusDiv.innerText = 'Deleting...';
  }
  
  const token = localStorage.getItem('guestSessionToken');
  google.script.run
    .withSuccessHandler(res => {
      if (res && res.success) {
        if (statusDiv) {
          statusDiv.style.color = '#10b981';
          statusDiv.innerText = 'Message deleted!';
        }
        
        // Update local adminData cache
        if (adminData && adminData.guests && adminData.guests.length > 1) {
          const headers = adminData.guests[0].map(h => String(h).trim().toLowerCase());
          const emailIdx = headers.indexOf("מייל אורח");
          const msgIdx = headers.indexOf("הודעה אישית בפורטל");
          if (emailIdx !== -1 && msgIdx !== -1) {
            for (let i = 1; i < adminData.guests.length; i++) {
              if (String(adminData.guests[i][emailIdx]).trim().toLowerCase() === guestEmail.toLowerCase()) {
                adminData.guests[i][msgIdx] = res.rawValue !== undefined ? res.rawValue : JSON.stringify(res.messages);
                break;
              }
            }
          }
        }
        try {
          localStorage.setItem('swr_adminData', JSON.stringify(adminData));
        } catch(e) {}
        
        if (window.editingPersonalMessageId === messageId) {
          cancelEditPersonalMessage();
        }
        renderAdminGuestPersonalMessages(guestEmail, res.messages || []);
      } else {
        if (statusDiv) {
          statusDiv.style.color = '#ef4444';
          statusDiv.innerText = 'Error: ' + (res ? res.message : 'Unknown error');
        }
      }
      setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
    })
    .withFailureHandler(err => {
      if (statusDiv) {
        statusDiv.style.color = '#ef4444';
        statusDiv.innerText = 'Error: ' + err;
        setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
      }
    })
    .deletePersonalMessageItem(token, guestEmail, messageId);
};

// Backwards compatibility aliases
window.loadPersonalMessageForEdit = window.loadPersonalMessageItemForEdit;
window.deletePersonalMessage = function(guestEmail) {
  window.deletePersonalMessageItem(guestEmail, 'm_1');
};

window.editingAdminAlertRow = null;

window.loadAdminAnnouncements = function() {
  const token = localStorage.getItem('guestSessionToken');
  google.script.run
    .withSuccessHandler(res => {
      if (res && res.success && res.announcements) {
        if (!adminData) adminData = {};
        adminData.announcements = res.announcements;
        renderAdminAnnouncementsList(res.announcements);
      }
    })
    .getAdminAnnouncements(token);
};

window.renderAdminAnnouncementsList = function(announcements) {
  const container = document.getElementById('admin-announcements-list');
  const countBadge = document.getElementById('admin-announcements-count');
  if (!container) return;
  
  if (!announcements && (!adminData || !adminData.announcements)) {
    loadAdminAnnouncements();
    return;
  }
  
  const list = announcements || (adminData && adminData.announcements) || [];
  if (countBadge) {
    countBadge.innerText = `${list.length} Active`;
    countBadge.style.background = list.length ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)';
    countBadge.style.color = list.length ? '#ef4444' : 'var(--foreground-muted)';
  }
  
  if (list.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--foreground-muted); font-size: 0.85rem; margin: 20px 0;">No active broadcast announcements.</p>`;
    return;
  }
  
  let html = "";
  list.forEach(a => {
    const encoded = encodeURIComponent(a.message);
    html += `
      <div class="admin-announcement-card" id="announcement-card-${a.row}">
        <div class="admin-announcement-header">
          <span>📢 Alert (Row ${a.row})</span>
          <div class="admin-announcement-actions">
            <button class="secondary" style="padding: 3px 8px; font-size: 0.75rem; border-radius: 4px; height: auto;" onclick="editAdminAlert(${a.row}, '${encoded}')">
              ✏️ Edit
            </button>
            <button class="secondary" style="padding: 3px 8px; font-size: 0.75rem; border-radius: 4px; height: auto; color: #ef4444; border-color: rgba(239,68,68,0.4);" onclick="deleteAdminAlert(${a.row})">
              🗑️ Delete
            </button>
          </div>
        </div>
        <div class="admin-announcement-body">${escapeHtmlAdmin(a.message)}</div>
      </div>
    `;
  });
  container.innerHTML = html;
};

window.editAdminAlert = function(row, encodedMsg) {
  const msg = decodeURIComponent(encodedMsg);
  const msgInput = document.getElementById('admin-alert-msg');
  const labelEl = document.getElementById('admin-alert-mode-label');
  const submitBtn = document.getElementById('admin-alert-submit-btn');
  const cancelBtn = document.getElementById('admin-alert-cancel-btn');
  
  window.editingAdminAlertRow = row;
  if (msgInput) {
    msgInput.value = msg;
    msgInput.focus();
    msgInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (labelEl) labelEl.innerText = `Edit Announcement (Row ${row})`;
  if (submitBtn) submitBtn.innerText = 'Update Announcement';
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
};

window.cancelEditAdminAlert = function() {
  const msgInput = document.getElementById('admin-alert-msg');
  const labelEl = document.getElementById('admin-alert-mode-label');
  const submitBtn = document.getElementById('admin-alert-submit-btn');
  const cancelBtn = document.getElementById('admin-alert-cancel-btn');
  
  window.editingAdminAlertRow = null;
  if (msgInput) msgInput.value = '';
  if (labelEl) labelEl.innerText = 'Compose Global Announcement';
  if (submitBtn) submitBtn.innerText = 'Send Global Alert';
  if (cancelBtn) cancelBtn.style.display = 'none';
};

window.submitAdminAlert = function() {
  const msgInput = document.getElementById('admin-alert-msg');
  const statusDiv = document.getElementById('admin-alert-status');
  const msg = msgInput ? msgInput.value.trim() : '';
  if (!msg) {
    alert('Please type an announcement first.');
    return;
  }
  
  const token = localStorage.getItem('guestSessionToken');
  const isEditing = window.editingAdminAlertRow !== null;
  
  const confirmText = isEditing 
    ? 'Are you sure you want to update this announcement for ALL delegates?' 
    : 'Are you sure you want to broadcast this alert to ALL delegates?';
    
  if (!confirm(confirmText)) return;
  
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--foreground-muted)';
    statusDiv.innerText = 'Sending...';
  }
  
  const onSuccess = (res) => {
    if (res.success) {
      if (statusDiv) {
        statusDiv.style.color = '#10b981';
        statusDiv.innerText = isEditing ? 'Announcement updated!' : 'Announcement sent!';
      }
      if (res.announcements) {
        adminData.announcements = res.announcements;
        renderAdminAnnouncementsList(res.announcements);
      }
      cancelEditAdminAlert();
    } else {
      if (statusDiv) {
        statusDiv.style.color = '#ef4444';
        statusDiv.innerText = 'Error: ' + res.message;
      }
    }
    setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
  };
  
  const onFailure = (err) => {
    if (statusDiv) {
      statusDiv.style.color = '#ef4444';
      statusDiv.innerText = 'Error: ' + err;
      setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    }
  };
  
  if (isEditing) {
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .updateAdminAlert(token, window.editingAdminAlertRow, msg);
  } else {
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .sendAdminAlert(token, msg);
  }
};

window.sendAdminAlert = window.submitAdminAlert;

window.deleteAdminAlert = function(row) {
  if (!confirm('Are you sure you want to delete this broadcast announcement? It will be removed for all delegates.')) return;
  const statusDiv = document.getElementById('admin-alert-status');
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--foreground-muted)';
    statusDiv.innerText = 'Deleting...';
  }
  
  const token = localStorage.getItem('guestSessionToken');
  google.script.run
    .withSuccessHandler(res => {
      if (res.success) {
        if (statusDiv) {
          statusDiv.style.color = '#10b981';
          statusDiv.innerText = 'Announcement deleted!';
        }
        if (res.announcements) {
          adminData.announcements = res.announcements;
          renderAdminAnnouncementsList(res.announcements);
        }
        if (window.editingAdminAlertRow === row) {
          cancelEditAdminAlert();
        }
      } else {
        if (statusDiv) {
          statusDiv.style.color = '#ef4444';
          statusDiv.innerText = 'Error: ' + res.message;
        }
      }
      setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
    })
    .withFailureHandler(err => {
      if (statusDiv) {
        statusDiv.style.color = '#ef4444';
        statusDiv.innerText = 'Error: ' + err;
        setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
      }
    })
    .deleteAdminAlert(token, row);
};

window.loadAdminDashboard = loadAdminDashboard;
window.filterAdminGuests = filterAdminGuests;
window.viewAdminGuestDetails = viewAdminGuestDetails;
window.closeAdminModal = closeAdminModal;
window.switchAdminNetworkingTab = switchAdminNetworkingTab;
window.renderAdminNetworkingCubes = renderAdminNetworkingCubes;
window.openNetworkingDetail = openNetworkingDetail;
window.closeNetworkingDetailSheet = closeNetworkingDetailSheet;
window.filterAdminNetworking = filterAdminNetworking;
window.loadAdminNetworkingData = loadAdminNetworkingData;
window.triggerFullLeadsSync = triggerFullLeadsSync;


window.impersonateGuest = function(targetEmail) {
  if (!confirm('Are you sure you want to view the portal as ' + targetEmail + '?')) return;
  const adminToken = localStorage.getItem('guestSessionToken');
  google.script.run
    .withSuccessHandler(res => {
      if (!res.success) { alert('Error: ' + res.message); return; }
      localStorage.setItem('originalAdminToken', adminToken);
      localStorage.setItem('guestSessionToken', res.token);
      window.location.reload();
    })
    .withFailureHandler(err => alert('Error: ' + err))
    .impersonateGuest(adminToken, targetEmail);
};

window.returnToAdmin = function() {
  const adminToken = localStorage.getItem('originalAdminToken');
  if (adminToken) {
    localStorage.setItem('guestSessionToken', adminToken);
    localStorage.removeItem('originalAdminToken');
    window.location.reload();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('originalAdminToken')) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #dc2626; color: white; text-align: center; padding: 12px; z-index: 99999; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.2);';
    banner.innerHTML = '🕵️‍♂️ VIEWING PORTAL AS GUEST &nbsp;&bull;&nbsp; <u style="margin-left: 10px;">Return to Admin</u>';
    banner.onclick = window.returnToAdmin;
    document.body.appendChild(banner);
  }
});

let lastRefreshTime = 0;
function triggerBackgroundRefresh() {
  const token = localStorage.getItem('guestSessionToken');
  if (!token) return;
  
  const now = Date.now();
  // Throttle to at most once per minute
  if (now - lastRefreshTime < 60000) return;
  lastRefreshTime = now;
  
  google.script.run
    .withSuccessHandler(function(res) {
       if (res && res.success) {
         localStorage.setItem('swr_portalData_' + token, JSON.stringify(res));
         
         // To avoid overwriting bio input while typing
         const bioInput = document.getElementById("guest-bio-input");
         const isBioFocused = (document.activeElement === bioInput);
         const currentBioValue = bioInput ? bioInput.value : "";
         
         onLoginSuccess(res, false, true);
         
         if (isBioFocused && bioInput) {
            bioInput.value = currentBioValue;
            bioInput.focus();
         }
       }
    })
    .getGuestPortalData(token);
    
  // Refresh artists if we already have artists tab available
  if (document.getElementById("artists-container") && document.getElementById("artists-container").style.display === "block") {
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.success && res.artists) {
            localStorage.setItem('swr_artistsData_v4', JSON.stringify(res.artists));
            globalArtistsData = res.artists.sort((a, b) => a.name.localeCompare(b.name));
            initArtistsUI();
          }
        })
        .getArtistsData();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
     triggerBackgroundRefresh();
  }
});

/* ================= CACHE MANAGEMENT (ADMIN) ================= */
function showToast(message, duration = 3500) {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "toast-notification";
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add("show");
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function handleAdminResetCache() {
  const btn = document.getElementById("admin-reset-cache-btn");
  const panelBtn = document.getElementById("admin-panel-reset-cache-btn");
  
  if (btn) {
    btn.disabled = true;
    const icon = btn.querySelector('.cache-btn-icon');
    if (icon) icon.classList.add('spin-icon');
    const textSpan = document.getElementById('admin-reset-cache-text');
    if (textSpan) textSpan.innerText = "Clearing...";
  }
  if (panelBtn) {
    panelBtn.disabled = true;
    const pIcon = panelBtn.querySelector('.cache-btn-icon');
    if (pIcon) pIcon.classList.add('spin-icon');
    const pSpan = panelBtn.querySelector('span');
    if (pSpan) pSpan.innerText = "Clearing...";
  }

  // 1. Remember current active tab
  const activeTabBtn = document.querySelector('#category-nav-wrapper button.active');
  if (activeTabBtn && activeTabBtn.id) {
    const tabName = activeTabBtn.id.replace('tab-', '');
    try { sessionStorage.setItem('imsf_restore_tab', tabName); } catch (e) {}
  }
  try { sessionStorage.setItem('imsf_cache_reset_toast', 'true'); } catch (e) {}

  // 2. Clear client-side cache immediately
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('swr_') || key.startsWith('lastSeenUpdatesHash_') || key.startsWith('imsf_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'clearCache' });
    }
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
  } catch(e) {
    console.error("Error clearing localStorage:", e);
  }

  // Clear in-memory state
  adminData = null;
  adminDataLoaded = false;
  scheduleDataCache = null;
  guideDataCache = null;
  globalArtistsData = [];
  globalDirectoryData = [];

  const token = localStorage.getItem('guestSessionToken') || localStorage.getItem('originalAdminToken');

  const performReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('nocache', Date.now());
    window.location.href = url.toString();
  };

  // 3. Clear server-side cache and reload
  if (window.google && google.script && google.script.run && token) {
    google.script.run
      .withSuccessHandler(function(res) {
        console.log("Server cache purged:", res);
        performReload();
      })
      .withFailureHandler(function(err) {
        console.warn("Server cache purge error, reloading anyway:", err);
        performReload();
      })
      .clearAppCache(token);
  } else {
    performReload();
  }
}

/* ================= OFFLINE STATUS CONTROLLER ================= */
let offlinePillTimeout = null;

function updateOnlineOfflineStatus(isOnline, isInitial) {
  const pill = document.getElementById('offline-status-pill');
  const textElem = document.getElementById('offline-status-text');
  if (!pill || !textElem) return;

  if (offlinePillTimeout) {
    clearTimeout(offlinePillTimeout);
    offlinePillTimeout = null;
  }

  if (!isOnline) {
    pill.classList.remove('online-restored');
    textElem.innerText = 'Offline Mode • Notes & Timetable Ready';
    pill.style.display = 'inline-flex';
  } else {
    if (!isInitial) {
      pill.classList.add('online-restored');
      textElem.innerText = '✓ Back Online • Synchronizing...';
      pill.style.display = 'inline-flex';
      
      // Flush pending offline changes
      flushPendingArtistFeedback();

      offlinePillTimeout = setTimeout(() => {
        pill.style.display = 'none';
        pill.classList.remove('online-restored');
      }, 3500);
    } else {
      pill.style.display = 'none';
    }
  }
}

window.addEventListener('online', () => updateOnlineOfflineStatus(true, false));
window.addEventListener('offline', () => updateOnlineOfflineStatus(false, false));

// Initial check on page load
if (typeof navigator !== 'undefined' && navigator.onLine === false) {
  updateOnlineOfflineStatus(false, true);
}

/* ================= PWA INSTALLATION HELPER ================= */
let deferredInstallPrompt = null;

function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isNarrowTouch = window.matchMedia && window.matchMedia('(max-width: 900px) and (pointer: coarse)').matches;
  return isMobileUA || isIpadOS || isNarrowTouch;
}

function isPwaStandaloneMode() {
  return (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
         (typeof navigator !== 'undefined' && navigator.standalone === true);
}

function hideAllPwaButtons() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
  const actionBtn = document.getElementById('pwa-action-install-btn');
  if (actionBtn) actionBtn.style.display = 'none';
  const promptModal = document.getElementById('pwa-prompt-modal-overlay');
  if (promptModal) promptModal.style.display = 'none';
}

function initPwaInstallUX() {
  // Only display on mobile phones/tablets
  if (!isMobileDevice() || isPwaStandaloneMode()) {
    console.log('[PWA] Desktop or standalone mode detected - hiding PWA prompts');
    hideAllPwaButtons();
    return;
  }

  const isInstalled = localStorage.getItem('imsf_pwa_installed') === 'true';
  if (isInstalled) {
    hideAllPwaButtons();
    return;
  }

  // Always show permanent action button on mobile if not in standalone and not installed
  const actionBtn = document.getElementById('pwa-action-install-btn');
  if (actionBtn) actionBtn.style.display = 'inline-flex';

  // Android / Chrome / Edge PWA install event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Application installed on device');
    localStorage.setItem('imsf_pwa_installed', 'true');
    hideAllPwaButtons();
  });
}

function checkAndPromptPwaInstall() {
  // Mobile only check
  if (!isMobileDevice()) return;
  if (isPwaStandaloneMode()) return;
  if (localStorage.getItem('imsf_pwa_installed') === 'true') return;
  if (sessionStorage.getItem('imsf_pwa_prompt_postponed') === 'true') return;

  const welcomeModal = document.getElementById("welcome-modal-overlay");
  if (welcomeModal && welcomeModal.style.display !== "none") return;

  const pwaPromptModal = document.getElementById("pwa-prompt-modal-overlay");
  if (pwaPromptModal) {
    pwaPromptModal.style.display = "flex";
  }
}

function handlePwaModalInstall() {
  const pwaPromptModal = document.getElementById("pwa-prompt-modal-overlay");
  if (pwaPromptModal) pwaPromptModal.style.display = "none";
  openPwaInstallFlow();
}

function handlePwaModalLater() {
  const pwaPromptModal = document.getElementById("pwa-prompt-modal-overlay");
  if (pwaPromptModal) pwaPromptModal.style.display = "none";
  // Postpone for this session only; will prompt again on next visit / full reload
  sessionStorage.setItem('imsf_pwa_prompt_postponed', 'true');
}

function openPwaInstallFlow() {
  const isIos = (typeof navigator !== 'undefined') && (/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  if (isIos) {
    const iosModal = document.getElementById('pwa-ios-modal-overlay');
    if (iosModal) iosModal.style.display = 'flex';
  } else if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult && choiceResult.outcome === 'accepted') {
        localStorage.setItem('imsf_pwa_installed', 'true');
        hideAllPwaButtons();
      }
      deferredInstallPrompt = null;
    });
  } else {
    // Other browser / desktop fallback
    alert('To add the Portal to your home screen, tap your browser menu (⋮ or Share) and select "Add to Home screen" or "Install App".');
    localStorage.setItem('imsf_pwa_installed', 'true');
    hideAllPwaButtons();
  }
}

function closePwaIosModal() {
  const iosModal = document.getElementById('pwa-ios-modal-overlay');
  if (iosModal) iosModal.style.display = 'none';
  localStorage.setItem('imsf_pwa_installed', 'true');
  hideAllPwaButtons();
}

function dismissPwaBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
  sessionStorage.setItem('imsf_pwa_prompt_postponed', 'true');
}

// Initialize PWA installation UX on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPwaInstallUX);
} else {
  initPwaInstallUX();
}

window.showToast = showToast;
window.handleAdminResetCache = handleAdminResetCache;
window.selectGuideCity = selectGuideCity;
window.fetchGuideData = fetchGuideData;
window.loadAdminNetworkingData = loadAdminNetworkingData;
window.filterAdminNetworking = filterAdminNetworking;
window.triggerFullLeadsSync = triggerFullLeadsSync;
window.switchAdminNetworkingTab = switchAdminNetworkingTab;
window.openNetworkingDetail = openNetworkingDetail;
window.closeNetworkingDetailSheet = closeNetworkingDetailSheet;
window.renderAdminNetworkingKPIs = renderAdminNetworkingKPIs;
window.selectScheduleDate = selectScheduleDate;
window.renderScheduleTabs = renderScheduleTabs;
window.renderScheduleForDate = renderScheduleForDate;
window.triggerPwaInstall = openPwaInstallFlow;
window.openPwaInstallFlow = openPwaInstallFlow;
window.handlePwaModalInstall = handlePwaModalInstall;
window.handlePwaModalLater = handlePwaModalLater;
window.checkAndPromptPwaInstall = checkAndPromptPwaInstall;
window.dismissPwaBanner = dismissPwaBanner;
window.closePwaIosModal = closePwaIosModal;


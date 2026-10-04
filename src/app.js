let currentGuestEmail = "";
    let globalDirectoryData = [];

    function closeWelcomeModal() {
      document.getElementById("welcome-modal-overlay").style.display = "none";
      localStorage.setItem('welcomeModalSeen_' + currentGuestEmail, 'true');
    }

    function checkSessionOnLoad() {
      const token = localStorage.getItem('guestSessionToken');
      if (token) {
        document.getElementById("email-step").style.display = "none";
        
        const cached = localStorage.getItem('swr_portalData_' + token);
        if (cached) {
          try {
            onLoginSuccess(JSON.parse(cached), true);
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
      const tabs = ['admin', 'schedule', 'flights', 'hotels', 'directory', 'artists'];
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
        if (t === 'admin' && tabName === 'admin') {
          loadAdminDashboard();
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
      
      if (response.guestInfo.isAdmin) {
        document.getElementById("tab-admin").style.display = "block";
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
        
        let hasActiveTab = document.querySelector('#category-nav-wrapper button.active');
        if (!isBackgroundUpdate || !hasActiveTab) {
          switchCategoryTab('schedule');
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
        document.getElementById("schedule-card").style.display = "none";
        document.getElementById("flights-card").style.display = "none";
        document.getElementById("hotels-card").style.display = "none";
        document.getElementById("directory-card").style.display = "none";
        document.getElementById("artists-card").style.display = "none";
        
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
        renderHotelData(response.hotelJerusalemData, response.hotelTelAvivData);
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

    function renderBoardingPassData(containerId, dataArray, emptyText) {
      const container = document.getElementById(containerId);
      if (!dataArray || dataArray.length === 0) {
        container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
        return;
      }
      
      let arrival = "TBD", arrivalTime = "", arrivalFlight = "", arrivalAirline = "", origin = "TBD";
      let departure = "TBD", departureTime = "", departureFlight = "", departureAirline = "", dest = "TBD";
      let ticketLink = null, shuttle = null;
      
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
        const d = new Date(tStr);
        if (!isNaN(d.getTime()) && tStr.toString().length > 5) {
          const hh = d.getHours().toString().padStart(2, '0');
          const mm = d.getMinutes().toString().padStart(2, '0');
          return `${hh}:${mm}`;
        }
        return tStr;
      }

      dataArray.forEach(item => {
        if (!item.value) return;
        if (item.label === "Arrival Date") arrival = formatFlightDate(item.value);
        if (item.label === "Arrival Time") arrivalTime = formatFlightTime(item.value);
        if (item.label === "Arrival Flight") arrivalFlight = item.value;
        if (item.label === "Arrival Airline") arrivalAirline = item.value;
        if (item.label === "Origin / From") origin = item.value;
        
        if (item.label === "Departure Date") departure = formatFlightDate(item.value);
        if (item.label === "Departure Time") departureTime = formatFlightTime(item.value);
        if (item.label === "Departure Flight") departureFlight = item.value;
        if (item.label === "Departure Airline") departureAirline = item.value;
        if (item.label === "Destination / To") dest = item.value;
        
        if (item.label === "Shuttle") shuttle = item.value;
        if (item.label === "Final Ticket Link") ticketLink = item.value;
      });

      let html = '';

      if (ticketLink) {
        html += `
          <div style="display: flex; justify-content: center; margin-bottom: 15px;">
            <a href="${ticketLink}" target="_blank" class="primary" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; font-size: 1.05rem; border-radius: 8px; background: var(--accent); color: #000; font-weight: bold;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              View E-Ticket (PDF)
            </a>
          </div>
        `;
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
            
            ${shuttle ? `
            <div style="background: rgba(30, 215, 96, 0.1); border-left: 3px solid var(--accent); padding: 8px 12px; margin-top: 12px; border-radius: 4px; font-size: 0.9rem;">
              <strong>🚐 Shuttle:</strong> ${shuttle}
            </div>` : ''}

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

      // Shuttle Information Rubric Placeholder
      html += `
        <div style="background: rgba(30, 215, 96, 0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--accent); margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0; color: var(--accent); display: flex; align-items: center; gap: 8px; font-size: 1.05rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Shuttle Information
          </h4>
          <p style="margin: 0 0 8px 0; font-size: 0.95rem;">
            You are on the shuttle from Ben Gurion airport leaving at <strong>[Time]</strong>.
          </p>
          <p style="margin: 0; font-size: 0.9rem; color: var(--foreground-muted);">
            <strong>Together with:</strong> [Name 1], [Name 2], [Name 3]
          </p>
        </div>
      `;

      container.innerHTML = html;
    }

    function renderHotelData(jerusalemData, telAvivData) {
      const jlmContainer = document.getElementById("hotel-jerusalem-content");
      const tlvContainer = document.getElementById("hotel-telaviv-content");
      
      const hasJlm = jerusalemData && jerusalemData.some(i => i.value && i.value.trim() !== "");
      const hasTlv = telAvivData && telAvivData.some(i => i.value && i.value.trim() !== "");

      if (hasJlm) {
        let html = `<div class="info-list">`;
        jerusalemData.forEach(item => {
          if (item.value && item.value.trim() !== "") {
            html += `
              <div class="info-row">
                <span class="info-label">${item.label}</span>
                <span class="info-value">${item.value}</span>
              </div>
            `;
          }
        });
        html += `</div>`;
        jlmContainer.innerHTML = html;
      } else {
        jlmContainer.innerHTML = `<p class="empty-state">No Jerusalem accommodation details confirmed yet.</p>`;
      }

      if (hasTlv) {
        let html = `<div class="info-list">`;
        telAvivData.forEach(item => {
          if (item.value && item.value.trim() !== "") {
            html += `
              <div class="info-row">
                <span class="info-label">${item.label}</span>
                <span class="info-value">${item.value}</span>
              </div>
            `;
          }
        });
        html += `</div>`;
        tlvContainer.innerHTML = html;
      } else {
        tlvContainer.innerHTML = `<p class="empty-state">No Tel Aviv accommodation details confirmed yet.</p>`;
      }
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
      globalDirectoryData = directoryArray || [];
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

    function openGuestSheet(index) {
      const guest = globalDirectoryData[index];
      if (!guest) return;
      
      const photoUrl = guest["Photo"] ? getThumbnailUrl(guest["Photo"]) : '';
      const fullName = `${guest["First Name"] || ""} ${guest["Last Name"] || ""}`.trim();
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

      document.getElementById('guest-sheet-overlay').classList.add('active');
      document.getElementById('guest-bottom-sheet').classList.add('active');
      document.body.style.overflow = 'hidden';
      
      window.location.hash = "guestsheet";
    }

    function closeGuestSheet(isHashChange) {
      document.getElementById('guest-sheet-overlay').classList.remove('active');
      document.getElementById('guest-bottom-sheet').classList.remove('active');
      document.body.style.overflow = '';
      
      if (isHashChange !== true && window.location.hash === "#guestsheet") {
        history.back();
      }
    }

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

    function toggleUpdatesPanel(isHashChange) {
      const panel = document.getElementById("updates-panel");
      const overlay = document.getElementById("updates-overlay");
      const isOpening = panel.style.left !== "0px";
      
      if (isOpening) {
        panel.style.left = "0px";
        overlay.style.display = "block";
        setTimeout(() => overlay.style.opacity = "1", 10);
        document.getElementById("notification-badge").style.display = "none";
        document.getElementById("notification-bell-container").classList.remove("has-new");
        
        // Mark as read
        if (window.currentUpdatesHash) {
          localStorage.setItem('lastSeenUpdatesHash_' + currentGuestEmail, window.currentUpdatesHash);
        }
        
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

    function renderUpdates(updates) {
      document.getElementById("notification-bell-container").style.display = "flex";
      const body = document.getElementById("updates-body");
      
      const currentHash = JSON.stringify(updates);
      window.currentUpdatesHash = currentHash;
      const storedHash = localStorage.getItem('lastSeenUpdatesHash_' + currentGuestEmail);
      
      if (updates.length > 0 && currentHash !== storedHash) {
        document.getElementById("notification-badge").style.display = "inline-block";
        document.getElementById("notification-bell-container").classList.add("has-new");
      }
      
      if (updates.length === 0) {
        body.innerHTML = `<p class="empty-state" style="text-align: center; margin-top: 40px;">No new updates at this time.</p>`;
        return;
      }
      
      let html = "";
      updates.forEach(u => {
        const isPersonal = u.type === 'personal';
        html += `
          <div class="update-msg ${isPersonal ? 'personal' : ''}">
            <div class="update-msg-header">
              ${isPersonal 
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> Private Message' 
                : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg> Announcement'}
              <span class="update-msg-time">${u.timestampStr}</span>
            </div>
            <div class="update-msg-text">${u.message}</div>
          </div>
        `;
      });
      body.innerHTML = html;
    }

    /* ================= SCHEDULE ================= */
    let scheduleDataCache = null;

    

    

    function renderScheduleTabs() {
      const dates = Object.keys(scheduleDataCache).sort();
      const nav = document.getElementById("schedule-days-nav");
      const container = document.getElementById("schedule-container");
      
      if (dates.length === 0) {
        nav.style.display = "none";
        container.innerHTML = `<p class="empty-state">Itinerary will be published here.</p>`;
        return;
      }
      
      nav.style.display = "flex";
      let html = "";
      
      const todayStr = new Date().toISOString().split('T')[0];
      let activeDate = dates.includes(todayStr) ? todayStr : dates[0];
      
      dates.forEach(d => {
        const dateObj = new Date(d);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const isActive = d === activeDate;
        html += `<button class="schedule-pill ${isActive ? 'active' : ''}" onclick="selectScheduleDate('${d}')">${dayName}, ${monthDay}</button>`;
      });
      nav.innerHTML = html;
      
      renderScheduleForDate(activeDate);
    }
    
    function selectScheduleDate(dateStr) {
      const pills = document.querySelectorAll('.schedule-pill');
      const dates = Object.keys(scheduleDataCache).sort();
      const index = dates.indexOf(dateStr);
      
      pills.forEach((p, i) => {
        if (i === index) {
          p.classList.add('active');
          p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
          p.classList.remove('active');
        }
      });
      
      renderScheduleForDate(dateStr);
    }
    
    function renderScheduleForDate(dateStr) {
      const events = scheduleDataCache[dateStr] || [];
      const container = document.getElementById("schedule-container");
      
      if (events.length === 0) {
        container.innerHTML = `<p class="empty-state">No events scheduled for this day.</p>`;
        return;
      }
      
      let html = '<div style="margin-top: 10px; display: flex; flex-direction: column; gap: 16px;">';
      events.forEach(e => {
        const timeText = e.endTime ? `${e.startTime}-${e.endTime}` : e.startTime;
        
        let titleHtml = e.title;
        if (e.location && e.location.trim() !== "") {
          let href = e.location.trim();
          if (!href.startsWith('http')) {
             href = 'https://' + href;
          }
          titleHtml = `<a href="${href}" target="_blank" class="event-title">${e.title}</a>`;
        } else {
          titleHtml = `<span class="event-title">${e.title}</span>`;
        }
        
        html += `
          <div class="schedule-event-inline fade-up">
            <span class="event-time">${timeText}</span>
            ${titleHtml}
            ${e.description ? `<span class="event-desc">${e.description}</span>` : ''}
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }
    /* ========================================================= */
    /* ARTISTS UI LOGIC                                          */
    /* ========================================================= */
    let globalArtistsData = [];
    let showFavsOnly = false;
    let currentOpenArtistId = null;

    // Load favorites from local storage for now
    function getFavorites() {
      try {
        const stored = localStorage.getItem('artist_favs_' + currentGuestEmail);
        return stored ? JSON.parse(stored) : {};
      } catch(e) { return {}; }
    }
    function saveFavorites(favs) {
      localStorage.setItem('artist_favs_' + currentGuestEmail, JSON.stringify(favs));
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

    function fetchArtistsData() {
      const grid = document.getElementById('artists-grid');
      
      const cached = localStorage.getItem('swr_artistsData');
      if (cached) {
        try {
          globalArtistsData = JSON.parse(cached).sort((a, b) => a.name.localeCompare(b.name));
          initArtistsUI();
        } catch(e) {}
      } else {
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
          if (res.success && res.artists) {
            localStorage.setItem('swr_artistsData', JSON.stringify(res.artists));
            globalArtistsData = res.artists.sort((a, b) => a.name.localeCompare(b.name));
            initArtistsUI();
          } else {
            if (!cached) grid.innerHTML = `<p class="empty-state">The artists lineup is currently being updated. Please check back shortly.</p>`;
          }
        })
        .withFailureHandler(function(err) {
          if (!cached) grid.innerHTML = `<p class="empty-state">The artists lineup is currently being updated. Please check back shortly.</p>`;
        })
        .getArtistsData();
    }

    // Initialize Artists UI
    function initArtistsUI() {
      // Setup Genre Filter
      const genreSelect = document.getElementById('artist-genre-filter');
      const genres = new Set(globalArtistsData.map(a => a.genre).filter(g => g));
      let genreHtml = '<option value="All">All Genres</option>';
      genres.forEach(g => { genreHtml += `<option value="${g}">${g}</option>`; });
      genreSelect.innerHTML = genreHtml;

      // Setup Live Banner
      const liveBanner = document.getElementById('artists-live-banner');
      liveBanner.style.display = 'none';

      renderArtistsGrid(globalArtistsData);
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
        html += `
          <div class="artist-card" style="background-image: url('${artist.image}')" onclick="openArtistSheet('${artist.id}')">
            <div class="artist-card-overlay">
              <div style="display: flex; align-items: center; justify-content: flex-start; gap: 6px; margin-bottom: 2px;">
                <div class="artist-card-name" style="margin-bottom: 0;">${artist.name}</div>
                <button class="fav-btn-inline ${isFav ? 'active' : ''}" onclick="toggleCardFav(event, '${artist.id}')" aria-label="Toggle favorite">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                </button>
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
      event.stopPropagation(); // prevent opening sheet
      const favs = getFavorites();
      if (favs[artistId]) {
        delete favs[artistId];
      } else {
        favs[artistId] = true;
      }
      saveFavorites(favs);
      filterArtists(); // Re-render grid
    }

    function filterArtists() {
      const searchTxt = document.getElementById('artist-search').value.toLowerCase().trim();
      const genreVal = document.getElementById('artist-genre-filter').value;
      const clearBtn = document.getElementById('clear-artist-search-btn');
      const favs = getFavorites();

      clearBtn.style.display = searchTxt ? 'flex' : 'none';

      const filtered = globalArtistsData.filter(a => {
        const matchesSearch = !searchTxt || a.name.toLowerCase().includes(searchTxt) || a.genre.toLowerCase().includes(searchTxt);
        const matchesGenre = genreVal === 'All' || a.genre === genreVal;
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
      if (showFavsOnly) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      filterArtists();
    }

    // Bottom Sheet
    function openArtistSheet(artistId) {
      currentOpenArtistId = artistId;
      const artist = globalArtistsData.find(a => a.id === artistId);
      if (!artist) return;

      const favs = getFavorites();
      const isFav = !!favs[artistId];

      document.getElementById('sheet-artist-img').style.backgroundImage = `url('${artist.image}')`;
      document.getElementById('sheet-artist-name').innerText = artist.name;
      document.getElementById('sheet-artist-genre').innerText = artist.genre;
      document.getElementById('sheet-artist-bio').innerText = artist.bio;
      document.getElementById('sheet-artist-members').innerText = artist.members;
      
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

      // Media Embed - Removed Spotify Embed
      const mediaContainer = document.getElementById('sheet-media-container');
      const embedWrapper = document.getElementById('sheet-embed-wrapper');
      embedWrapper.innerHTML = '';
      mediaContainer.style.display = 'none';

      // Links
      const linksContainer = document.getElementById('sheet-artist-links');
      if (artist.socialLinks && artist.socialLinks.length > 0) {
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

      // Show
      document.getElementById('artist-sheet-overlay').classList.add('active');
      document.getElementById('artist-bottom-sheet').classList.add('active');
      document.body.style.overflow = 'hidden'; // prevent bg scrolling
      
      // Setting hash creates a reliable history entry on all mobile browsers
      window.location.hash = "sheet";
    }

    function closeArtistSheet(isHashChange) {
      document.getElementById('artist-sheet-overlay').classList.remove('active');
      document.getElementById('artist-bottom-sheet').classList.remove('active');
      document.body.style.overflow = '';
      currentOpenArtistId = null;
      // Re-render grid to reflect any favorite changes from sheet
      filterArtists();
      
      // If we closed it manually via the X or overlay, we must clean up the hash
      if (isHashChange !== true && window.location.hash === "#sheet") {
        history.back();
      }
    }

    window.addEventListener('hashchange', function() {
      // If the hash is no longer #sheet, but the artist sheet is open, close it.
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
    }

    function savePrivateNote() {
      if (!currentOpenArtistId) return;
      const note = document.getElementById('sheet-private-note').value;
      savePrivateNoteLocally(currentOpenArtistId, note);
    }

    function exportBriefcase() {
      alert("This will generate and download a PDF summarizing your liked artists and private notes!");
    }

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
window.savePrivateNote = savePrivateNote;
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
  const hRole = headers.indexOf("תפקיד");
  
  let totalGuests = 0;
  let missingHotel = 0;
  let missingFlight = 0;
  let missingPassport = 0;
  
  for (let i = 1; i < guests.length; i++) {
    const row = guests[i];
    if (!row[headers.indexOf("שם פרטי")] && !row[headers.indexOf("שם משפחה")]) continue; // Skip empty
    
    // Ignore admins
    if (hRole !== -1 && String(row[hRole]).trim() === "הפקה חשיפה") continue;
    
    totalGuests++;
    
    if (hHotel !== -1 && row[hHotel] !== true && String(row[hHotel]).toLowerCase() !== 'true') missingHotel++;
    if (hFlight !== -1 && row[hFlight] !== true && String(row[hFlight]).toLowerCase() !== 'true') missingFlight++;
    if (hPassport !== -1 && row[hPassport] !== true && String(row[hPassport]).toLowerCase() !== 'true') missingPassport++;
  }
  
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
      <h3 style="margin:0; font-size: 1.5rem;">Production Overview</h3>
      <button class="primary" style="padding: 6px 12px; font-size: 0.9rem;" onclick="loadAdminDashboard(true)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px; vertical-align: text-bottom;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        Refresh Data
      </button>
    </div>
    
    <div class="admin-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; margin-bottom: 30px;">
      <div class="stat-card" style="background: var(--surface); padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid var(--border);">
        <h3 style="margin: 0; font-size: 28px; color: var(--accent-bright);">${totalGuests}</h3>
        <p style="margin: 5px 0 0; font-size: 13px; color: var(--foreground-muted); font-weight: 500;">Total Delegates</p>
      </div>
      <div class="stat-card" style="background: var(--surface); padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid var(--border);">
        <h3 style="margin: 0; font-size: 28px; color: #f59e0b;">${missingHotel}</h3>
        <p style="margin: 5px 0 0; font-size: 13px; color: var(--foreground-muted); font-weight: 500;">Missing Hotel Form</p>
      </div>
      <div class="stat-card" style="background: var(--surface); padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid var(--border);">
        <h3 style="margin: 0; font-size: 28px; color: #ef4444;">${missingFlight}</h3>
        <p style="margin: 5px 0 0; font-size: 13px; color: var(--foreground-muted); font-weight: 500;">Missing Flights</p>
      </div>
      <div class="stat-card" style="background: var(--surface); padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid var(--border);">
        <h3 style="margin: 0; font-size: 28px; color: #8b5cf6;">${missingPassport}</h3>
        <p style="margin: 5px 0 0; font-size: 13px; color: var(--foreground-muted); font-weight: 500;">Missing Passport</p>
      </div>
    </div>
  `;
  
  // -- ALERT CENTER & LOGISTICS --
  let hotelJlmCount = 0;
  let hotelTlvCount = 0;
  let flightArrivals = 0;
  
  if (adminData.hotelJlm) {
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
  
  if (adminData.hotelTlv) {
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
  
  if (adminData.flights) {
    flightArrivals = adminData.flights.length > 1 ? adminData.flights.length - 1 : 0;
  }

  html += `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 30px;">
      
      <!-- Alert Center -->
      <div style="background: var(--surface); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
        <h3 style="margin: 0 0 15px 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          Live Alert Center
        </h3>
        <p style="font-size: 0.9rem; color: var(--foreground-muted); margin-bottom: 15px;">Send a push notification to all delegates. (Will appear in their updates bell).</p>
        <textarea id="admin-alert-msg" placeholder="Type your announcement here..." style="width: 100%; height: 80px; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--foreground); margin-bottom: 10px; resize: none; font-family: inherit;"></textarea>
        <button class="primary" style="width: 100%; justify-content: center;" onclick="sendAdminAlert()">Send Global Alert</button>
      </div>
      
      <!-- Logistics -->
      <div style="background: var(--surface); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
        <h3 style="margin: 0 0 15px 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          Logistics Summary
        </h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
            <span style="color: var(--foreground-muted);">Tel Aviv Hotel</span>
            <span style="font-weight: 600;">\${hotelTlvCount} Nights</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
            <span style="color: var(--foreground-muted);">Jerusalem Hotel</span>
            <span style="font-weight: 600;">\${hotelJlmCount} Nights</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
            <span style="color: var(--foreground-muted);">Flights Handled</span>
            <span style="font-weight: 600;">\${flightArrivals} Delegates</span>
          </div>
        </div>
      </div>
      
    </div>
  `;

  // Search Bar & Guest List
  html += `
    <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.2rem;">Guest Management</h3>
    <div style="margin-bottom: 15px; position: relative;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position: absolute; left: 12px; top: 12px; color: var(--foreground-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="admin-guest-search" placeholder="Search by name, email, or company..." style="width: 100%; padding: 12px 12px 12px 40px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--foreground); font-size: 1rem;" onkeyup="filterAdminGuests(this.value)">
    </div>
    <div id="admin-guest-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 500px; overflow-y: auto; padding-right: 5px;"></div>
  `;
  
  container.innerHTML = html;
  filterAdminGuests("");
}

function loadAdminDashboard(forceRefresh = false) {
  if (adminDataLoaded && !forceRefresh) return;
  
  const container = document.getElementById("admin-dashboard-container");
  container.innerHTML = '<div style="text-align:center; padding: 40px;"><div class="musical-loader-wrapper" style="display:block;"><div class="musical-loader"><span class="music-note music-note-1">dYZ</span><span class="drummer-emoji">dY?</span><span class="music-note music-note-2">dYZ </span></div><p class="loader-text">Loading production data...</p></div></div>';
  
  const token = localStorage.getItem('guestSessionToken');
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.success) {
        container.innerHTML = '<p class="error-text">Failed to load admin data: ' + res.message + '</p>';
        return;
      }
      adminData = res;
      adminDataLoaded = true;
      renderAdminDashboard();
    })
    .withFailureHandler(function(err) {
      container.innerHTML = '<p class="error-text">Error: ' + err.toString() + '</p>';
    })
    .getAdminDashboardData(token);
}

function filterAdminGuests(query) {
  const listContainer = document.getElementById("admin-guest-list");
  if (!listContainer || !adminData || !adminData.guests) return;
  
  const q = query.toLowerCase().trim();
  const headers = adminData.guests[0].map(h => String(h).trim().toLowerCase());
  const firstNameIdx = headers.indexOf("שם פרטי");
  const lastNameIdx = headers.indexOf("שם משפחה");
  const emailIdx = headers.indexOf("מייל אורח");
  const companyIdx = headers.indexOf("שם חברה");
  const hHotel = headers.indexOf("התקבל טופס אירוח?");
  
  let html = "";
  let count = 0;
  
  for (let i = 1; i < adminData.guests.length; i++) {
    const row = adminData.guests[i];
    const fname = String(row[firstNameIdx] || "");
    const lname = String(row[lastNameIdx] || "");
    const email = String(row[emailIdx] || "");
    const company = String(row[companyIdx] || "");
    if (!fname && !lname) continue;
    
    const fullName = fname + " " + lname;
    
    if (fullName.toLowerCase().includes(q) || email.toLowerCase().includes(q) || company.toLowerCase().includes(q)) {
      
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
  document.getElementById('admin-bottom-sheet').classList.remove('active');
  document.getElementById('admin-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  
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

  const fData = getRowByEmail(adminData.flights);
  const hjData = getRowByEmail(adminData.hotelJlm);
  const htData = getRowByEmail(adminData.hotelTlv);

  // Flight HTML
  let flightHtml = '<p style="color:var(--foreground-muted); font-size:0.9rem;">No flight info</p>';
  if (fData) {
    const inboundOrigin = fData['מאיפה יוצא?'] || fData['יעד הגעה'] || '?';
    const inboundDate = formatDateOnly(fData['הגעה לישראל']) || '?';
    const outboundDest = fData['יעד חזרה'] || '?';
    const outboundDate = formatDateOnly(fData['חזרה מישראל']) || '?';
    
    flightHtml = `
      ${fData['לינק כרטיס סופי'] ? `
        <div style="display: flex; justify-content: flex-start; margin-bottom: 12px;">
          <a href="${fData['לינק כרטיס סופי']}" target="_blank" class="primary button-download-small" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            View E-Ticket
          </a>
        </div>
      ` : ''}
      <div class="boarding-pass" style="margin-bottom: 8px;">
        <div class="bp-header">
          <span>FLIGHT ITINERARY</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M21,16v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/></svg>
        </div>
        <div class="bp-body">
          <div class="bp-flight">
            <div class="bp-label">INBOUND</div>
            <div class="bp-route">
              <span class="bp-city">${inboundOrigin}</span>
              <span class="bp-arrow">→</span>
              <span class="bp-city">TLV</span>
            </div>
            <div class="bp-date">Arrival: ${inboundDate}</div>
          </div>
          <div class="bp-divider"></div>
          <div class="bp-flight">
            <div class="bp-label">OUTBOUND</div>
            <div class="bp-route">
              <span class="bp-city">TLV</span>
              <span class="bp-arrow">→</span>
              <span class="bp-city">${outboundDest}</span>
            </div>
            <div class="bp-date">Departure: ${outboundDate}</div>
          </div>
        </div>
      </div>
      ${fData['הערות טיסות'] ? `<div style="margin-top:4px; font-size:0.85rem; color:var(--accent-bright);">Notes: ${fData['הערות טיסות']}</div>` : ''}
    `;
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

    <!-- Personal Message -->
    <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); text-transform: uppercase; letter-spacing: 0.5px;">Personal Portal Message</h4>
      <textarea id="admin-personal-msg" rows="2" style="width:100%; border:1px solid var(--border); border-radius:6px; padding:8px; background:var(--background); color:var(--foreground); font-family:inherit; resize:vertical; margin-bottom:8px;" placeholder="Message shown to guest...">${personalMsg}</textarea>
      <button class="primary" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; width:auto;" onclick="savePersonalMessage('${email}')">Save Message</button>
      <div id="admin-msg-status" style="font-size:0.8rem; margin-top:4px; display:none;"></div>
    </div>
    
    <!-- Flights & Hotels -->
    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px;">
      <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); text-transform: uppercase; letter-spacing: 0.5px;">✈️ Flights</h4>
        ${flightHtml}
      </div>
      <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); text-transform: uppercase; letter-spacing: 0.5px;">🏨 Accommodations</h4>
        ${hotelHtml}
      </div>
    </div>

    <!-- Production Notes -->
    <div style="background: #fef9c3; color: #854d0e; padding: 12px; border-radius: 8px; border: 1px solid #fde047; margin-bottom: 15px;">
      <h4 style="margin: 0 0 5px 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Internal Notes</h4>
      <p style="margin:0; font-size: 0.9rem; white-space: pre-wrap; word-break: break-word;">${prodNotes || 'No internal notes.'}</p>
    </div>
    
    <!-- Contact Info -->
    <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); text-transform: uppercase; letter-spacing: 0.5px;">Contact Info</h4>
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
      <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: var(--foreground-muted); text-transform: uppercase; letter-spacing: 0.5px;">Quick Actions</h4>
      <div style="display: flex; flex-direction: column; gap: 10px;">
         <button class="secondary" style="width: 100%; justify-content: center;" onclick="impersonateGuest('${email}')">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right: 8px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
           View Portal as ${fname}
         </button>
      </div>
    </div>
  `;
  
  document.getElementById('admin-modal-content').innerHTML = html;
  document.getElementById('admin-modal-overlay').classList.add('active');
  document.getElementById('admin-bottom-sheet').classList.add('active');
  document.body.style.overflow = 'hidden';
  
  window.location.hash = "adminsheet";
}

window.savePersonalMessage = function(guestEmail) {
  const msg = document.getElementById('admin-personal-msg').value;
  const statusDiv = document.getElementById('admin-msg-status');
  statusDiv.style.display = 'block';
  statusDiv.style.color = 'var(--foreground-muted)';
  statusDiv.innerText = 'Saving...';
  
  google.script.run
    .withSuccessHandler(res => {
      if (res.success) {
        statusDiv.style.color = '#10b981';
        statusDiv.innerText = 'Message saved!';
        
        // Update local adminData cache
        const headers = adminData.guests[0].map(h => String(h).trim().toLowerCase());
        const emailIdx = headers.indexOf("מייל אורח");
        const msgIdx = headers.indexOf("הודעה אישית בפורטל");
        if (emailIdx !== -1 && msgIdx !== -1) {
          for (let i = 1; i < adminData.guests.length; i++) {
            if (String(adminData.guests[i][emailIdx]).trim().toLowerCase() === guestEmail.toLowerCase()) {
              adminData.guests[i][msgIdx] = msg;
              break;
            }
          }
        }
      } else {
        statusDiv.style.color = '#ef4444';
        statusDiv.innerText = 'Error: ' + res.message;
      }
      setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    })
    .withFailureHandler(err => {
      statusDiv.style.color = '#ef4444';
      statusDiv.innerText = 'Error: ' + err;
      setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    })
    .updatePersonalMessage(localStorage.getItem('guestSessionToken'), guestEmail, msg);
}

window.loadAdminDashboard = loadAdminDashboard;
window.filterAdminGuests = filterAdminGuests;
window.viewAdminGuestDetails = viewAdminGuestDetails;
window.closeAdminModal = closeAdminModal;


window.sendAdminAlert = function() {
  const msg = document.getElementById('admin-alert-msg').value.trim();
  if (!msg) { alert('Please type a message first.'); return; }
  
  if (confirm('Are you sure you want to send this alert to ALL delegates?')) {
    alert('Backend endpoint for sending global alerts will be connected soon!\n\nMessage: ' + msg);
    document.getElementById('admin-alert-msg').value = '';
  }
};


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
          if (res.success && res.artists) {
            localStorage.setItem('swr_artistsData', JSON.stringify(res.artists));
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

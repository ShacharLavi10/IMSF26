const PROD_GAS_URL = "https://script.google.com/macros/s/AKfycbyGjswDALICsGxU5wXzeeTLV8NfIA71-K1Z1tCUmS94IbTPqxjos5BACqcB3ezVw1fg5A/exec";
const SANDBOX_GAS_URL = "https://script.google.com/macros/s/AKfycbzK3tyvdqCU1UDLvYqC-6IvH2zFoLsOvEGGwXslGQQK0f7cuYgCb0U4MbISSuldV3RM/exec";

function resolveGasApiUrl() {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const host = window.location.hostname.toLowerCase();
    // Production domains: imsf26portal.vercel.app or production deployments
    if (host === "imsf26portal.vercel.app" || host.includes("imsf26portal-git-main") || host.startsWith("imsf26portal-")) {
      return PROD_GAS_URL;
    }
    // Sandbox domains: imsf26sandbox.vercel.app or branch preview deployments
    if (host.includes("sandbox") || host.includes("localhost") || host === "127.0.0.1") {
      return import.meta.env.VITE_APPS_SCRIPT_URL || SANDBOX_GAS_URL;
    }
  }
  return import.meta.env.VITE_APPS_SCRIPT_URL || SANDBOX_GAS_URL;
}

const GAS_API_URL = resolveGasApiUrl();

window.google = {
  script: {
    get run() {
      const state = { successHandler: null, failureHandler: null };
      
      const makeRunner = () => {
        return new Proxy({}, {
          get(target, prop) {
            if (prop === 'withSuccessHandler') {
              return (fn) => { state.successHandler = fn; return makeRunner(); };
            }
            if (prop === 'withFailureHandler') {
              return (fn) => { state.failureHandler = fn; return makeRunner(); };
            }
            
            return async (...args) => {
              if (!GAS_API_URL) {
                console.error("VITE_GAS_API_URL is not defined in .env");
                if (state.failureHandler) state.failureHandler(new Error("API URL not configured"));
                return;
              }

              let attempt = 0;
              const maxRetries = 3;
              let success = false;
              
              while (attempt < maxRetries && !success) {
                attempt++;
                try {
                  const processedArgs = await Promise.all(args.map(async arg => {
                    if (arg instanceof File || arg instanceof Blob) {
                      return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({ __isFile: true, name: arg.name, type: arg.type, data: reader.result });
                        reader.readAsDataURL(arg);
                      });
                    }
                    return arg;
                  }));

                  const response = await fetch(GAS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ method: prop, args: processedArgs }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                  });
                  
                  const responseText = await response.text();
                  let result;
                  try {
                    result = JSON.parse(responseText);
                  } catch (parseError) {
                    console.error(`[GAS Run Proxy] Non-JSON HTML response for method '${prop}':`, responseText.slice(0, 300));
                    throw new Error("HTML_ERROR");
                  }

                  if (result.error) {
                    if (result.error === "Internal Server Error") {
                      throw new Error("INTERNAL_ERROR");
                    }
                    if (state.failureHandler) state.failureHandler(new Error(result.error));
                    success = true;
                  } else {
                    if (result.data === undefined) {
                      throw new Error("Backend returned JSON without 'data': " + JSON.stringify(result));
                    }
                    if (state.successHandler) state.successHandler(result.data);
                    success = true;
                  }
                } catch (e) {
                  console.warn(`[GAS Run Proxy] Attempt ${attempt}/${maxRetries} failed for method '${prop}':`, e.message || e);
                  if (attempt >= maxRetries) {
                    const genericError = new Error("Oops, there's a connection error. Please try refreshing the page.");
                    if (state.failureHandler) state.failureHandler(genericError);
                  } else {
                    await new Promise(r => setTimeout(r, 1000 * attempt)); // Backoff
                  }
                }
              }
            };
          }
        });
      };
      
      return makeRunner();
    }
  }
};

// Register Service Worker for PWA & Offline Support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[SW] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] Service Worker registration failed:', err);
      });
  });
}

// Request persistent storage so browser never silently purges offline notes
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((isPersisted) => {
    if (isPersisted) {
      console.log('[Storage] Persistent storage granted');
    }
  }).catch(() => {});
}


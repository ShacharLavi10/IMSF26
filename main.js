const GAS_API_URL = "https://script.google.com/macros/s/AKfycby1dsqYxPUX21OOFtrE0Q2ggJGdcquwwna4_0f3SOtpj800wRgdn_18BApye05Ohmu3/exec";

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

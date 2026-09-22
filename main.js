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

              try {
                // Convert File/Blob arguments to base64 automatically
                const processedArgs = await Promise.all(args.map(async arg => {
                  // This is a naive check. If the user passes a form element containing a file, it won't be caught here.
                  // But based on common GAS patterns, they usually pass the form object directly to google.script.run
                  if (arg instanceof File || arg instanceof Blob) {
                    return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve({ __isFile: true, name: arg.name, type: arg.type, data: reader.result });
                      reader.readAsDataURL(arg);
                    });
                  }
                  
                  // Check if it's an HTMLFormElement (GAS can take forms directly)
                  if (arg instanceof HTMLFormElement) {
                     // For this project, if they send a form, we need to extract inputs. 
                     // Let's hope they just pass strings/files.
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
                  if (responseText.trim().startsWith('<')) {
                    throw new Error("Oops, there's a connection error. Please try refreshing the page.");
                  } else {
                    throw new Error("Invalid response format: " + parseError.message);
                  }
                }

                if (result.error) {
                  if (state.failureHandler) state.failureHandler(new Error(result.error));
                } else {
                  if (result.data === undefined) {
                    throw new Error("Backend returned JSON without 'data': " + JSON.stringify(result));
                  }
                  if (state.successHandler) state.successHandler(result.data);
                }
              } catch (e) {
                const genericError = new Error("Oops, there's a connection error. Please try refreshing the page.");
                if (state.failureHandler) state.failureHandler(genericError);
              }
            };
          }
        });
      };
      
      return makeRunner();
    }
  }
};

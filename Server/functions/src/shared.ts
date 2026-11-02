import { setGlobalOptions } from "firebase-functions/v2";

// Global options for all v2 callables. cors:true reflects the request origin
// (v2 callables have no built-in CORS, unlike v1), and maxInstances caps the
// scale-out blast radius.
setGlobalOptions({
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    cpu: 1,
    maxInstances: 10
});

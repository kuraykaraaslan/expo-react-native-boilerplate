// Runs before each test file's modules load (jest `setupFiles`): libs/env
// validates these at import time.
process.env.EXPO_PUBLIC_API_URL = "http://api.test";
process.env.EXPO_PUBLIC_DEFAULT_TENANT_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000f0";

// Runs before each test file's modules load (jest `setupFiles`): libs/env
// validates these at import time.
process.env.EXPO_PUBLIC_API_URL = "http://api.test";
process.env.EXPO_PUBLIC_DEFAULT_TENANT_ID = "tenant-default";

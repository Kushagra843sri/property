// Deterministic env for tests; never touches a real database or provider.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/property_test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret-0123';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret-01';
process.env.LOG_LEVEL = 'silent';
process.env.DEALER_NOTIFY_EMAIL = 'dealer@example.com';

function readConfig(env = process.env) {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'FIREBASE_PROJECT_ID'];
  const missing = required.filter((key) => !env[key] || /^(replace-me|demo-)/.test(env[key]));
  if (missing.length) throw new Error(`Configure local environment variables: ${missing.join(', ')}`);
  return {
    host: env.HOST || '127.0.0.1',
    port: Number(env.PORT || 3000),
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    firebaseProjectId: env.FIREBASE_PROJECT_ID,
    database: {
      host: env.DB_HOST, port: Number(env.DB_PORT || 3306),
      user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
    },
  };
}
module.exports = { readConfig };

import { validateEnvironment, env } from './src/config/env.js';
import { app } from './src/app.js';
import { pool } from './src/config/db.js';
validateEnvironment();
const server = app.listen(env.port, () =>
  console.log(
    `Dream's Library API http://localhost:${env.port}${env.demo ? ' (read-only demo catalog)' : ''}`,
  ),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );

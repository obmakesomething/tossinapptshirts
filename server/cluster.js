const cluster = require('cluster');
const os = require('os');

const WORKER_COUNT = Number(process.env.WEB_CONCURRENCY) || Math.max(2, os.cpus().length);

if (cluster.isMaster || cluster.isPrimary) {
  console.log(`[Cluster] Master process ${process.pid} starting`);
  console.log(`[Cluster] Spawning ${WORKER_COUNT} workers`);

  // Fork workers
  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  // Handle worker lifecycle
  cluster.on('online', (worker) => {
    console.log(`[Cluster] Worker ${worker.process.pid} is online`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Cluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);

    // Respawn dead workers
    if (!worker.exitedAfterDisconnect) {
      console.log('[Cluster] Spawning replacement worker');
      cluster.fork();
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Cluster] Master received SIGTERM, shutting down gracefully');

    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }

    setTimeout(() => {
      console.log('[Cluster] Forcing shutdown');
      process.exit(0);
    }, 30000); // 30 second timeout
  });

  process.on('SIGINT', () => {
    console.log('[Cluster] Master received SIGINT, shutting down gracefully');

    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGINT');
    }

    setTimeout(() => {
      console.log('[Cluster] Forcing shutdown');
      process.exit(0);
    }, 30000);
  });
} else {
  // Worker process - start the actual server
  require('./index.js');
}

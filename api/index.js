/**
 * Vercel Function entrypoint.
 *
 * server/index.js exports the Express app and only binds a port when run
 * directly, so it can be handed to Vercel as-is.
 */
module.exports = require('../server/index.js');

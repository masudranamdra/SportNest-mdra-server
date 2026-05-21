const app = require('./app');
const { port, isProduction } = require('./config/env');

const server = app.listen(port, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
});

process.on('unhandledRejection', (error) => {
  console.error(`Unhandled rejection: ${error.message}`);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  if (!isProduction) console.log('SIGTERM received. Closing HTTP server.');
  server.close(() => process.exit(0));
});

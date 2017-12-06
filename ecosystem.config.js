/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * PM2 application configuration
 * http://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {

   apps: [

      // Test-Runner REST-API
      {
         name: 'backend',
         interpreter: 'node',
         interpreter_args: '--harmony_object_rest_spread --trace-warnings',
         script: 'index.js',
         watch: true,
         ignore_watch: [ './node_modules', './frontend' ],
         max_restarts: 1,
         min_uptime: 10 * 1000,
         log_date_format: 'YYYY-MM-DD HH:mm Z',
         env: {
            DEBUG: 'arestocats*'
         }
      },

      // Frontend (webpack development server)
      {
         name: 'frontend',
         cwd: './frontend',
         interpreter: 'node',
         watch: false,
         script: './frontend/node_modules/webpack-dev-server/bin/webpack-dev-server.js',
         args: '--inline --hot'
      }

   ]
};

/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const oauth2 = require( 'simple-oauth2' );
const { propText } = require( '../util/item-helpers' );
const { URL } = require( 'url' );

/**
 * @typedef {OAuth2Result}
 * @property {String} access_token
 *    the opaque access token issued by the Authorization server
 * @property {Number} expires_in
 *    token lifetime in seconds
 * @property {String} token_type
 *    type of the access token (e.g. "Bearer")
 */

/**
 * Plugin that accesses an OAuth2 Authorization Server to obain an Access token, and then uses that
 * token to make a request to a resource server.
 *
 * Currently, only the client_credentials flow (form-based or header-based option) is supported.
 */
module.exports = {

   pre( context, item ) {
      return Promise.resolve({
         description: `OAuth2 login at ${propText(item, 'authTokenHost')}/${propText(item, 'authTokenPath')}`,
         context,
         ...item
      });
   },

   runProps: () => ({
      flowType: undefined,
      clientId: undefined,
      clientSecret: undefined,
      authorizationTokenUrl: undefined,
      useBodyAuth: true,
      useBasicAuth: false
   }),

   /**
    * @param {Object} item
    *    test configuration
    * @param {String} [item.flowType="clientCredentials"]
    *    OAuth2 flow to use. Currently, only the "clientCredentials" flow is supported.
    * @param {String} item.clientId
    *    used as the client_id when submitting OAuth2 Client credentials
    * @param {String} item.clientSecret
    *    used as the client_secret when submitting OAuth2 Client credentials
    * @param {String} item.authorizationTokenUrl
    *    hostname of the OAuth2 Authorization Server
    * @param {String} [item.useBodyAuth=true]
    *    if `true` submit credentials in the Request body
    * @param {String} [item.useBasicAuth=true]
    *    if `true` submit credentials as a Request header (`Authorization: Basic ...`)
    * @param {String} [item.bodyFormat="form"]
    *    submit credentials using "form" or "json"
    *
    * @return {Promise.<OAuth2Result>}
    *    a result containing the obtained access token
    */
   run( item ) {
      const { flowType = 'clientCredentials' } = item;

      const authTokenUrl = new URL( item.authorizationTokenUrl );
      const client = oauth2.create( {
         client: {
            id: item.clientId,
            secret: item.clientSecret
         },
         auth: {
            tokenHost: authTokenUrl.origin,
            tokenPath: authTokenUrl.pathname
         },
         options: {
            useBodyAuth: item.useBodyAuth,
            useBasicAuthorizationHeader: item.useBasicAuth,
            bodyFormat: item.bodyFormat
         }
      } );

      // no additional credentials needed for "client credentials" flow:
      const tokenConfig = {};
      return client[ flowType ]
         .getToken( tokenConfig )
         .then( result => ({
            outcome: 'SUCCESS',
            ...result
         }) )
         .catch( error => {
            const failures = [ `Access Token error (${error.message})` ];
            return { outcome: 'FAILURE', failures };
         } );
   }
};

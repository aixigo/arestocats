/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const hal = require( 'hal-http-client' );


const { expect, propText } = require( '../util/item-helpers' );
const { composeRequestCookies, composeRequestHeaders, statusMatches } = require( '../util/http-helpers' );
const { zip } = require( '../util/general-helpers' );

/**
 * @typedef {HalResult}
 * @property {Object} response
 *    interesting parts of the HTTP response
 * @property {Number} response.representation
 *    the JSON resource representation
 * @property {String} response.status
 *    the HTTP status code
 */

module.exports = {

   pre( context, item ) {
      return Promise.resolve({
         description: `${propText(item, 'method', 'GET')} ${propText(item, 'url')}`,
         context,
         ...item
      });
   },

   runProps: () => ({
      base: null,
      cookies: null,
      context: {},
      expectedStatus: '2xx,3xx',
      follow: null,
      followAll: null,
      headers: {},
      jsonBody: null,
      method: 'GET',
      redirect: 'follow',
      url: null
   }),

   /**
    * @param {Object} item
    *    test configuration
    * @param {String} [item.base]
    *    a resource to start following relations from. If set, `follow` or `followAll` must be set as well
    * @param {String} [item.cookies={}]
    *    named cookies to send to the server using an additional header
    * @param {String} [item.expectedStatus='2xx']
    *    status code pattern to expect (use 'xxx' to ignore)
    * @param {String} [item.follow]
    *    follow this unary relation from the `base` resource. If set, `base` must be set as well, and
    *    `followAll` must not be set
    * @param {String} [item.followAll]
    *    follow this n-ary relation from the `base` resource. If set, `base` must be set as well, and
    *    `follow` must not be set
    * @param {Object} [item.headers={}]
    *    additional request headers to send. If no `Accept` header is given, it is automatically set to
    *   'application/hal+json'
    * @param {Object} [item.jsonBody=undefined]
    *    an object to be converted to a JSON request entity, usually as part of POST or PUT requests.
    *    If traversing a chain of relations, the body is only used for the *last* request
    * @param {String} [item.method='GET']
    *    the HTTP verb to use.
    *    If traversing a chain of relations, the method is only used for the *last* request (GET all others)
    * @param {String} [item.redirect='follow']
    *    determines whether to follow redirects automatically ('follow') or manually ('manual'), or whether
    *    to forbid redirects altogether ('error')
    * @param {String} [item.url]
    *    a URL to make a request to. Either the `url` or the `base` resource must be set
    *
    * @param {Object} runner
    *    a test runner instance, used to lookup shared cookies
    *
    * @return {Promise.<RequestResult>}
    *    a test result with response information
    */
   run( item, runner ) {
      const {
         base,
         context,
         follow,
         followAll,
         method,
         redirect,
         url
      } = item;

      const contentType = item.jsonBody != null ? 'application/json' : null;
      const cookiesList =
         composeRequestCookies( url, item.cookies || runner.interpret( context, context.cookiesRef ) || {} );
      const headers = composeRequestHeaders( item.headers, 'application/hal+json', contentType, cookiesList );
      const body = item.jsonBody;

      const client = hal.create( { headers, fetchInit: { headers, credentials: 'include' } } );
      const options = { method, redirect, headers, ...( body ? { body } : {} ) };

      return navigate()
         .then( ([ data, response ]) => processResult( item, data, response, options ) );

      function navigate() {
         if( url ) {
            return client[ method ]( url );
         }

         const relationsList = follow || followAll;
         if( !base || !relationsList ) {
            throw new Error( 'hal plugin: Either `url` or `base` plus `follow`/`followAll` must be set' );
         }
         if( follow && followAll ) {
            throw new Error( 'hal plugin: Cannot use both `follow` and `followAll`' );
         }
         const relations = Array.isArray( relationsList ) ? relationsList : [ relationsList ];
         if( relations.some( rel => rel == null ) ) {
            throw new Error( `hal: relation is null. Full sequence: ${relations.join( ' -> ' )}` );
         }

         const lastRelation = relations.pop();
         const traversalPromise = relations.reduce( follower(), Promise.resolve( [ base ] ) );
         const fetchResult = follower( followAll ? 'followAll' : 'follow', { method, body } );
         return fetchResult( traversalPromise, lastRelation );

         function follower( followType = 'follow', fetchOptions = {} ) {
            return ( promise, rel ) =>
               promise.then( ([ representation ]) =>
                  new Promise( ( resolve, reject ) => {
                     client[ followType ]( representation, rel, fetchOptions )
                        .on( { 'xxx': ( ...args ) => resolve( [ ...args ] ) } )
                        .catch( err => reject( new Error( err.status === 'norel' ?
                           `hal: Could not find relation ${rel} at ${JSON.stringify(representation)}` :
                           `hal: Error following relation ${rel}, details: ${err}`
                        ) ) );
                  } )
               );
         }
      }
   }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processResult( item, data, responseValue, requestOptions ) {
   const { method, url } = item;

   const response = Array.isArray( responseValue ) ? responseValue[ 0 ] : responseValue;
   const { status, statusText } = response;

   const headersByName = headersLists( response.headers );
   const headers = headersMap( headersByName );
   const type = parseResponseType( headers );
   const expectedLength = headers[ 'content-length' ];

   const failures = validateResponse( item, expectedLength, { status, type } )
      .map( f => `${f} (${method} ${url})` );

   const responseDetails = {
      headers,
      status,
      statusText,
      json: data
   };

   return {
      outcome: failures.length ? 'FAILURE' : 'SUCCESS',
      failures,
      message: `${status}`,
      [ Array.isArray( data ) ? 'representations' : 'representation' ]: data,
      details: {
         requestBody: requestOptions.jsonBody,
         requestHeaders: requestOptions.headers,
         ...responseDetails
      }
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function validateResponse( item, expectedLength, { status, type } ) {
   const statusResult = expect( 'status', status ).toSatisfy( statusMatches, item.expectedStatus );
   const typeResult = item.expectedType ?
      expect( 'content-type', type ).toEqual( item.expectedType ) : [];
   return [ ...statusResult, ...typeResult ];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function parseResponseType( headers ) {
   const responseTypeHeaders = headers[ 'content-type' ];
   return responseTypeHeaders ?
      responseTypeHeaders.split( ';' )[ 0 ] :
      null;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generate a map of value-lists from a list of name/value-pairs.
 * Header names are normalized to all-lowercase and used to group values.
 *
 * @param {Array<String[]>} isomorphicFetchHeaders
 *    a list of (header name, header value) pairs
 *
 * @return {Object<String, String[]>}
 *    the resulting unordered, grouped headers
 */
function headersLists( isomorphicFetchHeaders ) {
   const result = {};
   isomorphicFetchHeaders.forEach( ( v, k ) => {
      const key = k.toLowerCase();
      result[ key ] = key in result ? [ ...result[ key ], v ] : [ v ];
   } );
   return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * An easy-to-use headers-representation which disregards order, normalizes header names to all-lowercase and
 * concatenates multiple values for the same header name (using `, `). This representation format is used by
 * the `response.headers` field of the request result.
 *
 * @param {Object<String, String[]>} headers
 *     a normalized "multimap" structure as generated by the `headersLists` function
 *
 * @return {Object<String, String>}
 *     a simplified representation with values joined using `, `
 */
function headersMap( headers ) {
   return Object.keys( headers )
      .map( k => [ k, headers[ k ].join( ', ' ) ] )
      .reduce( zip, {} );
}

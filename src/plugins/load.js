/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const loadtest = require( 'loadtest' );

const { SUCCESS, FAILURE } = require( '../outcomes' );
const { CANCEL } = require( '../notification-types' );
const { expect, propText } = require( '../util/item-helpers' );
const { progressTimer } = require( '../util/progress-helpers' );
const { getIgnoreCase, hasIgnoreCase, statusMatches } = require( '../util/http-helpers' );
const { randomBytes } = require( 'crypto' );

/**
 * @typedef {LoadResult}
 * @property {Object} details
 *    loadtest summary
 * @property {Number} details.errorCodes
 *    for each encountered error codes, the number of responses (if any)
 * @property {Number} details.maxLatencyMs
 *    slowest response time
 * @property {Number} details.minLatencyMs
 *    fastest response time
 * @property {Object} details.percentiles
 *    a upper latency bounds for the fastest X (X="50"/"90"/"95"/"99") percent of requests
 * @property {Number} details.rps
 *    average requests per second during the run
 * @property {Number} details.totalRequests
 *    number of requests completed
 * @property {Number} details.totalTimeSeconds
 *    duration of the load test in seconds
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
      url: undefined,
      agentKeepAlive: true,
      body: null,
      cookies: {},
      concurrency: 10,
      maxRequests: 1000,
      maxSeconds: 10,
      maxErrorPortion: 0,
      expectedRps: null,
      expectedType: null,
      expectedStatus: 'xxx',
      jsonBody: null,
      headers: {},
      method: 'GET',
      randomBody: null
   }),

   /**
    * @param {Object} item
    *    test configuration
    * @param {String} item.url
    *    the URL to make the request to
    * @param {String} [item.agentKeepAlive=true]
    *    determines if the loadtest-library uses persistent HTTP connections. Set to `false` to close the
    *    connection after each Request
    * @param {String} [item.body=null]
    *    a request entity to be sent to the server, usually as part of POST or PUT requests. Only one of
    *    body/jsonBody/randomBody should be specified
    * @param {String} [item.cookies={}]
    *    named cookies to send to the server using an additional header. Note that a name/value object is
    *    expected just like for the `request` item, and not a list of key/value-pairs as used internally with
    *    the `loadtest` library
    * @param {Number} [item.concurrency=10]
    *    target number of concurrently open requests
    * @param {String} [item.expectedStatus='xxx']
    *    status code pattern to expect (use 'xxx' to ignore)
    * @param {String} [item.expectedType=null]
    *    expected content type. If set, it is used for the Accept-header and to check the responses
    * @param {Number} [item.expectedRps=null]
    *    the average number of requests per seconds that must at least be processed. Measurement starts
    *    at first request and ends when `maxRequests` responses have been received, or `maxSeconds` has
    *    elapsed
    * @param {Object} [item.headers={}]
    *    named request headers to send, use `;` to specify multi-valued headers
    * @param {String} [item.jsonBody=null]
    *    an object to be converted to a JSON request entity, usually as part of POST or PUT requests.
    *    If `null`, no entity is sent. Automatically causes a JSON content type if used. Only one of
    *    body/jsonBody/randomBody should be specified
    * @param {Number} [item.maxRequests=10000]
    *    the target number of requests that must be completed for the test to *SUCCEED*
    * @param {Number} [item.maxErrorPortion=0]
    *    allows to set a tolerance for errors
    * @param {Number} [item.maxSeconds=10]
    *    the test will always be canceled after this period, and will *FAIL* if fewer than `maxRequests` have
    *    been completed
    * @param {String} [item.method='GET']
    *    the HTTP verb to use
    * @param {String} [item.randomBody=null]
    *    a number of random bytes to generate as a request payload. Content-Type will be set to
    *    "application/octet-stream". Only one of body/jsonBody/randomBody should be specified
    *
    * @param {Object} runner
    *    the test runner, to report progress
    *
    * @return {Promise.<LoadResult>}
    *    a test result with response information
    */
   run( item, runner ) {
      const {
         url,
         agentKeepAlive,
         concurrency,
         expectedType,
         maxRequests,
         maxSeconds,
         method
      } = item;

      const { contentType, body } = createPayload( item );
      const headers = composeRequestHeaders( item.headers, expectedType, contentType );
      const cookies = composeCookies( item.cookies );

      const jobState = runner.jobState();
      const tracker = createTracker( item );
      const progressReporter = progressTimer( jobState, item, {
         durationMs: maxSeconds * 1000,
         probe: () => tracker.count() / maxRequests
      } );

      const options = {
         url,
         agentKeepAlive,
         body,
         cookies,
         concurrency: Math.min(
            parseInt( maxRequests, 10 ),
            parseInt( concurrency, 10 )
         ),
         method,
         maxRequests: parseInt( maxRequests, 10 ),
         maxSeconds: parseFloat( maxSeconds ),
         headers,
         statusCallback: tracker.track
      };

      return new Promise( ( resolve, reject ) => {
         const testHandle = loadtest.loadTest( options, ( error, result ) => {
            progressReporter.stop();
            if( error ) {
               reject( error );
               return;
            }
            // defer one tick to ensure that the last statusCallback has been made
            process.nextTick( () => {
               const { doneCount } = tracker.results();
               const failures = tracker.validate( result );
               const outcome = failures.length ? FAILURE : SUCCESS;
               const details = { ...result, ...tracker };
               const message = `Completed ${doneCount}/${maxRequests}`;
               // don't bother users with internals
               delete details.instanceIndex;
               resolve( { outcome, details, failures, message } );
            } );
         } );
         jobState.subscribe( CANCEL, () => {
            testHandle.stop();
         } );
      } );
   }

};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createPayload( { body, jsonBody, randomBody } ) {
   if( jsonBody ) {
      return {
         contentType: 'application/json',
         body: JSON.stringify( jsonBody )
      };
   }
   if( randomBody ) {
      return {
         contentType: 'text/plain',
         body: randomBytes( randomBody ).toString('base64')
      };
   }
   return {
      contentType: null,
      body
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createTracker( item ) {
   const { expectedStatus, expectedType, expectedRps, maxErrorPortion } = item;
   const statusMatcher = statusMatches( expectedStatus || 'xxx' );

   let doneCount = 0;
   const statusViolations = {};
   const typeViolations = {};

   return {
      track( error, result ) {
         ++doneCount;
         if( !result ) { return; }
         if( expectedType ) {
            const responseType = getIgnoreCase( result.headers, 'content-type' );
            if( responseType !== expectedType ) {
               typeViolations[ responseType ] = typeViolations[ responseType ] || 0;
               ++typeViolations[ responseType ];
            }
         }
         if( expectedStatus ) {
            const responseStatus = result.statusCode;
            if( !statusMatcher( responseStatus ) ) {
               statusViolations[ responseStatus ] = statusViolations[ responseStatus ] || 0;
               ++statusViolations[ responseStatus ];
            }
         }
      },
      count: () => doneCount,
      validate( result ) {
         const { errorCodes, rps } = result;
         const numResult = expect( 'number of requests', doneCount ).toEqual( item.maxRequests );
         const rpsResult = expectedRps ?
            expect( 'requests per second (rps)', rps ).toBeAtLeast( expectedRps ) :
            [];
         const statusResult = expect( 'status violations', statusViolations ).toDeepEqual( {} );
         const typeResult = expect( 'content-type violations', typeViolations ).toDeepEqual( {} );

         const numErrors = Object.keys( errorCodes )
            .map( k => errorCodes[ k ] )
            .reduce( (a, b) => a + b, 0 );
         const errorPortion = numErrors / doneCount;
         const errorPortionResult = maxErrorPortion > 0 ?
            expect( 'errors portion', errorPortion ).toBeAtMost( maxErrorPortion ) :
            [];
         const errorResult = errorPortion >= maxErrorPortion ?
            expect( 'errors', errorCodes ).toDeepEqual( {} ) :
            [];

         return [
            ...errorPortionResult, ...errorResult, ...numResult, ...rpsResult, ...statusResult, ...typeResult
         ];
      },
      results() {
         return { doneCount, statusViolations, typeViolations };
      }
   };

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function composeCookies( cookiesMap ) {
   const cookiesList = Object.keys( cookiesMap )
      .map( k => `${k}=${cookiesMap[ k ]}` );
   return cookiesList.length ? cookiesList : null;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function composeRequestHeaders( headers, expectedType, contentType ) {
   const headersObject = {
      ...headers,
      ...( expectedType && !hasIgnoreCase( headers, 'accept' ) ? { Accept: expectedType } : {} ),
      ...( contentType && !hasIgnoreCase( headers, 'content-type' ) ? { 'Content-Type': contentType } : {} )
   };
   return headersObject;
}

/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * Manages the state of all test jobs and of their items.
 *
 * @module state
 */

const clone = require( 'clone' );
const debug = require( 'debug' )( 'arestocats:state' );

const { isEmpty } = require( '../util/general-helpers' );
const { RESULT, PROGRESS, META, CANCEL } = require( '../notification-types' );

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A test item after preprocessing
 *
 * @typedef {Item}
 *
 * @property {String} type
 *    the type determines by what plugin an item uses
 * @property {String} name
 *    a user-defined or auto-generated item name. Should be unique among siblings
 * @property {String} $id
 *    a generated ID. Unique within a job
 * @property {Array<Item>} [items]
 *    optional list of children, for item types such as `suite` or `include`
 *
 * ...TODO... fix remaining properties
 */

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * An item job result
 *
 * @typedef {Result}
 *
 * @property {String} $id
 * @property {outcomes:Outcome} outcome
 * @property {Number} durationMs
 * @property {Array<String>} failures
 * @property {Array<String|Exception>} errors
 * @property {Array<Result>} [nested]
 *    optional list of nested result. Omitted from live result notifications but added for reporting
 *
 * ...TODO... fix remaining properties
 */

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Item progress snapshot
 *
 * @typedef {Progress}
 *
 * @property {String} $id
 * @property {String} started
 * @property {Number} progress
 * @property {outcomes:Outcome} outcomeForecast
 */

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Test job meta data
 *
 * @typedef {Meta}
 *
 * @property {String} id
 *    a job identifier
 * @property {outcomes:Outcome} outcome
 *    the overall outcome of the job
 * @property {String} created
 *    creation time as an ISO-8601 date time
 * @property {String} started
 *    start time as an ISO-8601 date time. Same as created until queing is implemented
 * @property {String} finished
 *    end time as an ISO-8601 date time
 *
 * ...TODO... fix remaining properties
 */

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @interface State
 *
 * State of all available test jobs, including the currently ongoing.
 */

/**
 * Provide the available notification types.
 *
 * @function
 * @name notificationTypes
 * @return {Object<NotificationType, String>}
 *    all test item notification types
 */

/**
 * Access all currently ongoing test jobs.
 * For non-concurrent setups, this will return an array with zero items, or with exactly one item.
 *
 * @function
 * @name currentJobs
 * @return {Array<Job>}
 *    the started, but not finished jobs
 */

/**
 * Access the most recent test jobs, including currently ongoing jobs.
 *
 * @function
 * @name mostRecentJobs
 * @param {number} [limit=1]
 *    maximum number of jobs to return
 * @return {Array<Job>}
 *    any matching jobs, from most-recently started to least-recently started
 */

/**
 * Access a job by its ID
 *
 * @function
 * @name jobById
 * @return {Job}
 *    matching job, or `null` if no such job exists
 */

/**
 * Create a new job (if possible)
 *
 * @function
 * @name createJob
 * @return {Job}
 *    the new job, or `null` if concurrency is `false` and there already is an ongoing job
 */

/**
 * Access the job meta (outcome, started, finished)
 *
 * @function
 * @name meta
 * @return {Meta}
 */

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @interface Job
 *
 * Observable state of a single test job, as accessed through the job state manager.
 */

/**
 * Notify the job about changes.
 * The changes will be applied to the internal state, and be forwarded to matching subscribers.
 *
 * @function
 * @name notify
 * @param {NotificationType}
 *    what the notification is about
 * @param {Object}
 *    the payload to forward to subscribers
 */

/**
 * Retrieve the preprocessed test items that were submitted for this job.
 *
 * @function
 * @name items
 * @return {Array<Item>}
 *    the top-level items of the job
 */

/**
 * Retrieve the preprocessed test items that were submitted for this job.
 *
 * @function
 * @name results
 * @return {Array<Result>}
 *    the results in the order they were generated
 */

/**
 * Retrieve meta-information on the job
 *
 * @function
 * @name meta
 * @return {Meta}
 *    id, outcome, created time, started time, finished time
 */

/**
 * Subscribe a callback to job changes.
 * Callbacks will automatically be unsubscribed after the end of the job, but can unsubscribe manually using
 * the returned callback.
 *
 * @function
 * @name subscribe
 * @param {NotificationType} type
 *    what notifications to receive
 * @param {Job~subscriber} subscriber
 *    the callback to be notified
 * @return {Function}
 *    a function that can be called to disconnect the subscriber
 */

/**
 * A notification subscriber
 *
 * @callback Job~subscriber
 * @param {NotificationType} [type]
 *    what the notification is about
 * @param {Object}
 *    the payload
 * @param {Job}
 *    the sender job
 */

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Create a state capsule for current and previous test jobs.
 *
 * @param {Object} [options]
 *    configuration for job state handling
 * @param {Boolean} [options.concurrent=false]
 *    wether to support multiple jobs at the same time
 *
 * @return {State}
 *    a fresh test runner state
 */
function createState( options = {} ) {
   const { concurrent = false } = options;

   const jobSeq = createSequence();
   const byId = {};
   const currentSet = {};

   return {
      currentJobs,
      mostRecentJobs,
      matchingJobs,
      jobById,
      createJob
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createJob( items ) {
      if( !concurrent && !isEmpty( currentSet ) ) {
         const ongoing = currentJobs().pop().meta();
         throw new Error(
            `Concurrency off: cannot start job until job ${ongoing.id} (started ${ongoing.started}) is done`
         );
      }

      const id = jobSeq();
      byId[ id ] = createJobData( items, id, new Date().toISOString() );
      currentSet[ id ] = true;

      const api = provideJobApi( byId[ id ] );
      api.subscribe( META, ({ finished }) => {
         if( finished ) { delete currentSet[ id ]; }
      } );
      return api;
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function matchingJobs( { created, id } ) {
      if( id && !( id in byId ) ) {
         return [];
      }
      const jobs = ( id ? [ id ] : Object.keys( byId ) )
         .filter( created ? _ => byId[ _ ].meta.created === created : () => true )
         .map( _ => byId[ _ ] );
      jobs.sort( byCreatedDesc );
      return jobs.map( provideJobApi );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function jobById( id ) {
      return byId[ id ] && provideJobApi( byId[ id ] );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function currentJobs() {
      return Object.keys( currentSet )
         .map( _ => byId[ _ ] )
         .map( provideJobApi );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function mostRecentJobs( limit ) {
      const jobs = Object.keys( byId ).map( _ => byId[ _ ] );
      jobs.sort( byCreatedDesc );
      return jobs.slice( 0, limit ).map( provideJobApi );
   }

   function byCreatedDesc( a, b ) {
      return a.meta.created > b.meta.created ? -1 : 1;
   }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createJobData( items, id, created ) {
   return {
      items,
      meta: { id, created, started: created, finished: null, outcome: null },
      progress: {},
      results: [],
      subscribers: [],
      subscriberSequence: createSequence()
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function provideJobApi( jobData ) {
   const { subscribers, items, results, progress, meta, subscriberSequence } = jobData;
   const api = {
      subscribe,
      notify,
      cancel,
      meta: () => clone( meta ),
      items: () => clone( items ),
      results: () => clone( results ),
      progress: () => clone( progress )
   };
   return api;

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function subscribe( type, f ) {
      const id = subscriberSequence();
      const item = { f, type, id };
      subscribers.push( item );
      return () => {
         const index = subscribers.indexOf( item );
         subscribers.splice( index, 1 );
      };
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function notify( type, payload ) {
      if( meta.finished ) {
         debug( `UNEXPECTED: finished job ${meta.id} received ${type} notification: ${payload}` );
         return;
      }
      const handlers = {
         [ CANCEL ]: () => {},
         [ META ]: handleMeta,
         [ RESULT ]: handleResult,
         [ PROGRESS ]: handleProgress
      };
      if( !( type in handlers ) ) {
         debug( `UNEXPECTED: unknown notification type ${type}` );
         return;
      }
      broadcast(
         type,
         handlers[ type ]( payload ) || payload
      );

      if( meta.finished ) {
         debug( `RUN finished: ${meta.id}, outcome: ${meta.outcome}` );
         clearSubscribers();
      }
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function handleMeta( payload ) {
      const { outcome, finished } = payload;
      meta.outcome = outcome;
      meta.finished = finished;
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function handleProgress( update ) {
      const { $id } = update;
      if( !( $id in progress ) ) {
         progress[ $id ] = { started: new Date().toISOString(), progress: 0 };
      }
      progress[ $id ] = { ...progress[ $id ], ...update };
      return progress[ $id ];
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function handleResult( result ) {
      delete progress[ result.$id ];
      results.push( result );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function broadcast( type, payload ) {
      subscribers
         .filter( _ => _.type === type )
         .forEach( ({ f }) => { f( payload ); } );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function clearSubscribers() {
      subscribers.splice( 0, subscribers.length );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function cancel() {
      return new Promise( resolve => {
         subscribe( META, ({ finished }) => {
            if( finished ) { resolve(); }
         } );
         notify( CANCEL );
      } );
   }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createSequence() {
   let i = 0;
   return () => { return `${++i}`; };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = createState;

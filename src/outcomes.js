/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * @module outcomes
 */

const { tabulate } = require( './util/general-helpers' );

/**
 * List of possible outcomes types for runs of individual items or complete tests.
 *
 * @enum Outcome
 */
const outcomes = {
   /** run was finished successfully */
   SUCCESS: 'SUCCESS',

   /** the run (of this item) was skipped, usually due to an ERROR of a preceeding item */
   SKIPPED: 'SKIPPED',

   /** an expectation was not met */
   FAILURE: 'FAILURE',

   /** the run could not be finished */
   ERROR: 'ERROR'
};

const bySeverity = [ outcomes.SUCCESS, outcomes.SKIPPED, outcomes.FAILURE, outcomes.ERROR ];

module.exports = {
   outcomes: bySeverity,
   worstOf,
   ...outcomes
};

/**
 * Identify the "worst" outcome (by severity) from a list of outcomes.
 *
 * @param {Array<Outcome>} list
 *    a list of outcomes to find the worst among
 * @return {Outcome}
 *    the worst
 */
function worstOf( list ) {
   const severityByOutcome = tabulate( _ => bySeverity.indexOf( _ ), bySeverity );
   const max = (a, b) => a > b ? a : b;
   const maxIndex = list.map( _ => severityByOutcome[ _ ] ).reduce( max, 0 );
   return bySeverity[ maxIndex ];
}

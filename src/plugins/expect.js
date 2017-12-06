/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { expect, propText } = require( '../util/item-helpers' );

module.exports = {

   pre( context, item ) {
      const description = `${propText( item, 'value' )} to be ${propText( item, 'expected', 'truthy' )}`;
      return Promise.resolve({
         description,
         context,
         ...item
      });
   },

   runProps: () => ({
      expected: expect.TRUTHY,
      matches: '',
      value: null,
      strict: false
   }),

   /**
    * @param {Object} item
    *    test configuration
    * @param {*} item.value
    *    value to compare against the expected value, usually used in expression form (`:value`),
    * @param {*} [item.expected]
    *    the expected value. If omitted, the given value is checked for truthiness
    * @param {String|RegExp} [item.matches]
    *    a regular expression whose value should match the actual value. If given, `expected` is ignored
    * @param {Boolean} [item.strict=false]
    *    `true` if strict comparison (===) is to be used, `false` for regular comparison (==)

    * @return {Promise<Object>}
    *    a test result with these extra properties:
    *    - `actual` (*) - the actual result of the evaluated value
    */
   run( item ) {
      const { expected, value, strict, matches } = item;
      const label = `\`${propText( item, 'value' )}\``;
      const failures = matches ?
         checkMatch() :
         expect( label, value )[ strict ? 'toBe' : 'toDeepEqual' ]( expected );

      return Promise.resolve( {
         outcome: failures.length ? 'FAILURE' : 'SUCCESS',
         actual: value,
         failures
      } );

      function checkMatch() {
         const pattern = typeof matches === 'string' ? new RegExp( matches ) : matches;
         return pattern.test( value ) ? [] : [ `expected ${label} (${value}) to match pattern ${pattern}` ];
      }
   }

};

/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { propText } = require( '../util/item-helpers' );

module.exports = {

   pre( context, item ) {
      const valueText = propText( item, 'value', null );
      const description = valueText ?
         `assign ${valueText} to $result.value` :
         `copy ${propText( item, 'properties', '{}' )} to $result`;
      return Promise.resolve({
         description,
         context,
         ...item
      });
   },

   runProps: () => ({ value: '', properties: {} }),

   /**
    * Assign an expression value to the item result value, or to copy properties to the result.
    *
    * @param {Object} item
    *    test configuration
    * @param {*} [item.value]
    *    the $result.value of this item will be set to this value, if defined.
    *    Usually, this should be preferred over using `properties`
    * @param {Object} [item.properties]
    *    each of the properties will be set on the $result of this item.
    *    Avoid builtin properties (starting with $) as well as:
    *    `outcome`, `durationMs`, `failures`, `messages`
    *    preferably by using an appropriate prefix
    *
    * @return {Promise<Object>}
    *    a test result with these extra properties:
    *    - `value` - the (evaluated) `item.value`
    *    - each of the (evaluated) named `item.properties`
    */
   run: ( { value, properties } ) => Promise.resolve( {
      outcome: 'SUCCESS',
      value,
      ...properties
   } )

};

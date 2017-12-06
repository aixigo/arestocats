/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = createMockRunner;

const { SUCCESS, SKIPPED } = require( '../../../src/outcomes' );
const { extractProps } = require( '../../../src/util/item-helpers' );

function createMockRunner( plugin, type = 'testPlugin' ) {

   const mock = {
      run( item ) {
         return Promise.resolve( { outcome: SUCCESS, ...item.$mockResult } );
      },
      skip() {
         return Promise.resolve( { outcome: SKIPPED } );
      },
      prop: () => null,
      interpret: () => null,
      jobState: () => ({
         subscribe: () => {},
         notify: () => {},
         items: () => [],
         progress: () => ({})
      })
   };

   return {
      run: item => {
         const { context = {} } = item;
         const completeItem = { $id: 1, name: 'testItem', type, context, ...item };
         const { runProps = () => ({ ...completeItem }) } = plugin;
         const props = extractProps( completeItem, runProps(), context );
         return plugin.run( props, mock );
      },
      mock
   };
}

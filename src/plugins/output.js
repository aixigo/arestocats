/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {

   pre( context, item ) {
      return Promise.resolve({
         description: `output ${item.label || item.name}`,
         context,
         ...item
      });
   },

   runProps: () => ({
      label: 'output',
      value: ''
   }),

   run( { value, label } ) {
      const formatter = v => JSON.stringify( v, null, 3 );
      return Promise.resolve({ message: `${label}: ${formatter(value)}` });
   }

};

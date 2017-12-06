/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {

   pre: ( context, item ) => Promise.resolve({
      description: `[SKIP] ${item.description || ''}`,
      context,
      ...item
   }),

   run: () => Promise.resolve({})

};

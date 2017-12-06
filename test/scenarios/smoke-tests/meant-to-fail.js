/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {
   type: 'suite',
   description: 'suite with two failing items',
   items: [
      {
         type: 'expect',
         description: 'meant to fail',
         value: 0
      },
      {
         type: 'expect',
         description: 'this one is OK',
         strict: true,
         value: 1,
         expected: 1
      },
      {
         type: 'delay',
         milliseconds: 500
      },
      {
         type: 'expect',
         description: 'meant to fail, too',
         value: 0,
         expected: 1
      },
      {
         type: 'delay',
         milliseconds: 500
      },
      {
         type: 'expect',
         description: 'another good one',
         strict: false,
         value: '1',
         expected: 1
      }
   ]
};

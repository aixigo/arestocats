/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {
   type: 'suite',
   items: [
      {
         type: 'request',
         name: 'getUser',
         ':url': '`${baseUrl}/posts/1`'
      },
      {
         type: 'delay',
         milliseconds: 500
      },
      {
         type: 'expect',
         ':value': '$results.getUser.response.status',
         expected: '200'
      },
      {
         type: 'delay',
         milliseconds: 500
      },
      {
         type: 'expect',
         ':value': '$results.getUser.response.json.userId',
         expected: '1'
      },
      {
         type: 'delay',
         milliseconds: 500
      },
      {
         type: 'output',
         label: 'number of properties',
         ':value': 'Object.keys( $results.getUser.response.json ).length'
      }
   ]
};

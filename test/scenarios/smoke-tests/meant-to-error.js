/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {
   type: 'output',
   name: 'printNullPointer',
   description: 'meant to error',
   ':value': '$results.nonExistent.xyz'
};

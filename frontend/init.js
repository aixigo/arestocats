/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { create } from 'laxar';
import artifacts from 'laxar-loader/artifacts?flow=main&theme=cube';
import debugInfo from 'laxar-loader/debug-info?flow=main&theme=cube';
import * as vueAdapter from 'laxar-vue-adapter';

const config = {
   name: 'test-runner',
   router: { navigo: { useHash: true, hash: '#!' }, query: { enabled: true } },
   theme: 'cube',
   widgets: {
      'entry-activity': { href: '/api' }
   }
};

create( [ vueAdapter ], artifacts, config )
   .tooling( debugInfo )
   .flow( 'main', document.querySelector( '[data-ax-page]' ) )
   .bootstrap();


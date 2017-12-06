/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * This entry is used for interactive HTML reporting.
 */

import { create } from 'laxar';
import artifacts from 'laxar-loader/artifacts?flow=static&theme=cube';
import debugInfo from 'laxar-loader/debug-info?flow=static&theme=cube';
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
   .flow( 'static', document.querySelector( '[data-ax-page]' ) )
   .bootstrap();


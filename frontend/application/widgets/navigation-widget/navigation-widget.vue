<template>
   <nav>
      <a v-for="link in links"
         :key="link.target"
         :class="{ active: activePlace === link.target }"
         :href="link.href"
         :title="link.title"
         @click.prevent="forceReload( link.href )">
         <i v-if="link.isLatest"
            class="fa"
            :class="latestClasses"></i>
         <i v-else-if="link.isLatest && resources.job.started" class="fa fa-spinner"></i>
         {{ link.label }}
      </a>

   </nav>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { resources } from 'laxar-patterns';
import { injections } from 'laxar-vue-adapter';

const links = [
   { target: 'runner', label: 'Runner', title: 'customize and run tests' },
   { target: 'viewer', label: 'Latest', title: 'view latest run', isLatest: true }
];

export default {
   mixins: [ injections( 'axFlowService' ) ],
   data: () => ({
      resources: {
         job: { started: null, finished: null }
      },
      activePlace: null,
      links: []
   }),
   computed: {
      latestClasses() {
         const { finished, started, outcome = 'unavailable' } = this.resources.job;
         if( started && !finished ) {
            return { 'fa-spinner': true };
         }
         return {
            [ `navigation-outcome-${outcome.toLowerCase()}` ]: true
         };
      }
   },
   created() {
      const [ axFlowService ] = this.$injections;
      this.links = links.map( link => {
         const href = axFlowService
            .constructAbsoluteUrl( link.target )
            .replace( /[?][^?*]$/, '' );
         return { href, ...link };
      } );
      this.eventBus.subscribe( 'didNavigate', ({ place }) => {
         this.activePlace = place;
      } );

      resources.handlerFor( this ).registerResourceFromFeature( 'job' );
   },
   methods: {
      // right now, we cannot cancel long running requests (e.g. for job progress and results) from JS:
      // https://github.com/whatwg/fetch/issues/447
      // to always have requests at our disposal, refresh when we change the page:
      forceReload( href ) {
         window.location = href;
         window.location.reload();
      }
   }
};
</script>

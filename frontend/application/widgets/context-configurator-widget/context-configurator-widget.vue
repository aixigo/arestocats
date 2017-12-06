<template>
<div>
   <h2 role="button"
      tabindex="0"
      @keypress.space.prevent="toggleShowContext"
      @click.stop="toggleShowContext">
      <i class="fa ii-context-toggle"
         :class="{ 'fa-plus-square': !showContext, 'fa-minus-square': showContext }"></i>
      Context
   </h2>
   <properties-editor-control
      v-if="showContext"
      :defaults="defaults"
      :overrides="parameters.context"
      :id="id"
      @modified="propagate.context" />
</div>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { injections } from 'laxar-vue-adapter';
import { resources } from 'laxar-patterns';
import { navigation } from 'lib/util';
import { create as createHal } from 'hal-http-client';

export default {
   data: () => ( {
      showContext: false,
      defaults: {},
      parameters: {
         context: {}
      }
   } ),
   mixins: [ injections( 'axStorage' ) ],
   created() {
      [ this.storage ] = this.$injections;
      this.showContext = this.storage.local.getItem( 'showContext' );

      const hal = createHal();
      resources.handlerFor( this ).registerResourceFromFeature( 'entry', {
         onUpdateReplace: () => {
            hal.follow( this.resources.entry, 'context' )
               .on( { '200': context => { this.defaults = context; } } );
         }
      } );

      this.propagate = {
         context: navigation.publisherForFeature( this, 'context', { converter: 'jsonMap', managed: true } )
      };
   },
   methods: {
      toggleShowContext() {
         this.showContext = !this.showContext;
         this.storage.local.setItem( 'context', this.showContext );
      }
   }
};
</script>

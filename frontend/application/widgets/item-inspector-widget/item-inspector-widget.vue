<template>
   <div v-if="resources.item">

      <!-- Title and Description -->
      <h2>
         <i class="fa fa-info-circle"></i>
         {{ resources.item.name }}
         <small>
            id={{ resources.item.$id }}
            <a v-if="resources.item.detailsHref"
               :href="resources.item.detailsHref"
               :title="`details on item ${resources.item.$id}`">
               (<i class="fa fa-external-link"></i> more)
            </a>
         </small>
      </h2>
      <p v-if="resources.item.description"
         class="ii-description">
         <em>"{{ resources.item.description }}"</em>
      </p>


      <!-- Context -->
      <collapse-icon-control
         @toggle="toggleShow( 'context' )"
         :is-expanded="show.context">Context</collapse-icon-control>
      <item-inspector-table
         v-if="show.context"
         :value="resources.item.context" />
      <div v-if="show.context && resources.item.defaults">
         <h4>Context Defaults</h4>
         <item-inspector-table :value="resources.item.defaults" />
      </div>
      <div v-if="show.context && resources.item.overrides">
         <h4>Context Overrides</h4>
         <item-inspector-table :value="resources.item.overrides" />
      </div>


      <!-- Configuration / User Overrides -->
      <collapse-icon-control
         @toggle="toggleShow( 'config' )"
         :is-expanded="show.config">Config</collapse-icon-control>
      <properties-editor-control
         v-if="show.config"
         :id="id"
         :editable="features.overrides.enabled"
         :defaults="config"
         :overrides="configOverrides"
         :useTypes="true"
         @modified="overrideConfig" />


      <!-- Results of most recent run -->
      <collapse-icon-control
         v-if="features.activation.enabled || resources.result"
         @toggle="toggleShow( 'run' )"
         :is-expanded="show.run">
         Run
      </collapse-icon-control>
      <item-status-control
         v-if="show.run && ( features.activation.enabled || resources.result )"
         class="pull-right"
         fallback-label="Run"
         :activation-enabled="features.activation.enabled"
         :item="resources.item"
         :is-busy="isBusy"
         :is-highlighted="false"
         :is-stale="false"
         :outcome="outcome"
         :result="resources.result"
         @activate="requestActivation" />
      <div v-if="show.run && resources.result">
         <p v-if="resources.result.message" class="ii-description">
            <em>{{ resources.result.message }}</em>
         </p>
         <h4 v-if="outcome === 'ERROR'">Errors</h4>
         <item-inspector-error-details
            v-for="error in resources.result.errors || []"
            :key="error.message || error"
            :error="error" />
         <h4 v-if="outcome === 'FAILURE'">Failures</h4>
         <item-inspector-error-details
            v-for="failure in resources.result.failures || []"
            :key="failure.message || failure"
            :error="failure" />
         <item-inspector-table v-if="resources.result" :value="details" />
      </div>

   </div>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { injections } from 'laxar-vue-adapter';
import { actions, resources } from 'laxar-patterns';
import { navigation } from 'lib/util';
import tableComponent from './item-inspector-table';
import * as errorDetailsComponent from './item-inspector-error-details';

const knownResultKeys = [
   'outcome', 'subject', 'message', 'errors', 'failures'
];
const knownItemKeys = [
   '_links', 'context', '$id', 'name', 'overrides', 'defaults', 'items', 'description'
];

export default {
   components: {
      'item-inspector-table': tableComponent,
      'item-inspector-error-details': errorDetailsComponent
   },
   data: () => ({
      show: {
         context: false,
         config: true,
         run: true
      },
      resources: {
         item: null,
         result: null
      },
      parameters: {
         overrides: {}
      },
      isBusy: false,
      config: {},
      configOverrides: {},
      result: { item: null, outcome: null }
   }),
   mixins: [ injections( 'axStorage' ) ],
   created() {
      [ this.storage ] = this.$injections;
      this.initalizeShow();

      resources.handlerFor( this )
         .registerResourceFromFeature( 'item', { onUpdateReplace: ({ data }) => {
            this.isBusy = false;
            this.configOverrides = this.parameters.overrides[ data.$id ] || {};
            this.recompute();
         } } )
         .registerResourceFromFeature( 'result', { onUpdateReplace: () => {
            this.isBusy = false;
            this.recompute();
         } } );
      actions.handlerFor( this )
         .registerActionsFromFeature( 'run', ({ items }) => this.handleRun( items ) );

      this.request = {};
      this.request.run = actions.publisherForFeature( this, 'run' );
      if( this.features.activation.enabled ) {
         this.request.activate = actions.publisherForFeature( this, 'activation' );
      }

      this.propagate = {};
      if( this.features.overrides.enabled ) {
         const parameterOptions = { converter: 'jsonMap', managed: true };
         this.propagate.overrides = navigation.publisherForFeature( this, 'overrides', parameterOptions );
      }
   },
   computed: {
      outcome() {
         return this.resources.result ?
            this.resources.result.outcome :
            'UNKNOWN';
      },
      details() {
         const { result } = this;
         if( result.details ) {
            const { startTime, durationMs, details } = result;
            return { startTime, durationMs, ...details };
         }
         return result;
      }
   },
   methods: {
      requestActivation() {
         this.isBusy = true;
         this.resources.result = null;
         return this.request.activate( { item: this.resources.item } );
      },
      initalizeShow() {
         Object.keys( this.show ).forEach( section => {
            const isExpanded = this.storage.local.getItem( `show.${section}` );
            this.show[ section ] = !!isExpanded;
         } );
      },
      toggleShow( section ) {
         this.show[ section ] = !this.show[ section ];
         this.storage.local.setItem( `show.${section}`, this.show[ section ] );
      },
      recompute() {
         this.result = { ...this.resources.result };
         knownResultKeys.forEach( k => { delete this.result[ k ]; } );
         this.config = { ...this.resources.item };
         knownItemKeys.forEach( k => { delete this.config[ k ]; } );
      },
      handleRun( items ) {
         items.forEach( item => {
            forEachTree( item, it => {
               applyOverrides( it, this.parameters.overrides );
            } );
         } );
         return this.request.run( { items } );
      },
      overrideConfig( itemOverrides ) {
         this.parameters.overrides[ this.resources.item.$id ] = itemOverrides;
         if( !itemOverrides || !Object.keys( itemOverrides ).length ) {
            delete this.parameters.overrides[ this.resources.item.$id ];
         }
         this.propagate.overrides();
      }
   }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function forEachTree( item, f ) {
   f( item );
   ( item.items || [] ).forEach( it => { forEachTree( it, f ); } );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function applyOverrides( item, overridesById ) {
   const none = {};
   const overrides = overridesById[ item.$id ] || none;
   Object.keys( overrides )
      .forEach( k => {
         const normalized = k.replace( /^[:]/, '' );
         const keyToRemove = normalized === k ? `:${normalized}` : normalized;
         delete item[ keyToRemove ];
         item[ k ] = overrides[ k ];
      } );
}
</script>

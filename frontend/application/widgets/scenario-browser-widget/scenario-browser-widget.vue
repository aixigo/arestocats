<template>
<div :class="{ 'sb-running': running }">

   <ul class="nav nav-tabs" role="tablist">
      <li role="presentation"
         v-for="tab in tabs.list"
         :key="tab"
         :class="{ active: tab === currentTab }">
         <a href="#TODO" role="tab" @click.prevent="currentTab = tab">{{ tab }}</a>
      </li>
   </ul>

   <div class="tab-content">
      <div role="tabpanel"
         class="tab-pane"
         :class="{ active: currentTab === tabs.scenarios }">
         <scenario-browser-item-control
            v-for="scenario in resources.scenarios"
            :key="scenario.name"
            :item="scenario"
            :view="view"
            :settings="settings"
            @modify-expanded="modifyExpanded( $event, scenario )"
            @activate="activate( $event, scenario )"
            @highlight="highlight( $event, scenario )"
            @select="select( $event, scenario )"
         />
         <div>
            <br>
            <button v-if="running"
               type="button"
               @click="cancel"
               class="btn btn-info btn-small sb-cancel">
               <i class="fa" :class="{ 'fa-times-circle': !cancelling, 'fa-spinner': cancelling }"></i>
               Cancel</button>
            <button v-else-if="settings.activationEnabled"
               type="button"
               @click="activateAll"
               class="btn btn-primary btn-small"><i class="fa fa-forward"></i> Run all</button>
         </div>
      </div>
      <div role="tabpanel"
         class="tab-pane row"
         no-v-if="currentTab === tabs.filters"
         :class="{ active: currentTab === tabs.filters }">
         <div class="col col-lg-6">
            <h4>Filter by Item Role</h4>
            <button
               class="btn btn-link sb-item-filter"
               type="button"
               v-for="role in availableRoles"
               @click="toggleItemFilter( 'hiddenRoleSet', role )"
               :key="role">
               <i :class="`fa fa-toggle-${role in parameters.hiddenRoleSet ? 'off' : 'on'} pull-left`"></i>
               {{ role }}
            </button>
         </div>
         <div class="col col-lg-6">
            <h4>Filter by Item Type</h4>
            <button
               class="btn btn-link sb-item-filter"
               type="button"
               v-for="itemType in availableTypes"
               @click="toggleItemFilter( 'hiddenTypeSet', itemType )"
               :key="itemType">
               <i :class="`fa fa-toggle-${itemType in parameters.hiddenTypeSet ? 'off' : 'on'} pull-left`"></i>
               {{ itemType }}
            </button>
         </div>
      </div>
   </div>

</div>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { resources, actions } from 'laxar-patterns';
import { navigation } from 'lib/util';
import { isEmpty } from 'lib/util/functional';
import { assert } from 'laxar';

const tabs = {
   scenarios: 'Scenarios',
   filters: 'Filters'
};

export default {
   data() {
      return {
         running: false,
         cancelling: false,
         currentTab: tabs.scenarios,
         view: {
            progress: {},
            highlightSet: {},
            busySet: {},
            staleSet: {},
            results: {}
         },
         parameters: {
            selectedItemId: {},
            hiddenTypeSet: {},
            hiddenRoleSet: {},
            expandedSet: {}
         },
         resources: {
            scenarios: [],
            latestResults: []
         }
      };
   },
   computed: {
      settings() {
         return {
            ...this.parameters,
            activationEnabled: !this.running && this.features.activation.enabled
         };
      },
      tabs: () => ({
         ...tabs,
         list: Object.keys( tabs ).map( k => tabs[ k ] )
      }),
      availableTypes() {
         const availableTypes = {};
         this.resources.scenarios.forEach( rootItem => {
            forEachTree( rootItem, it => {
               availableTypes[ it.type ] = false;
            } );
         } );
         return Object.keys( availableTypes ).filter( _ => _ !== 'suite' );
      },
      availableRoles() {
         return [ 'prepare', 'test', 'cleanup' ];
      }
   },
   created() {
      this.request = {};
      if( this.features.activation.enabled ) {
         this.request.activation = actions.publisherForFeature( this, 'activation' );
      }
      if( this.features.cancel.action ) {
         this.request.cancel = actions.publisherForFeature( this, 'cancel' );
      }

      this.publish = {
         selection: resources.replacePublisherForFeature( this, 'selection' ),
         selectionResult: resources.replacePublisherForFeature( this, 'selectionResult' )
      };
      this.propagate = {
         selectedItemId: navigation
            .publisherForFeature( this, 'selectedItemId', {
               converter: 'number',
               managed: true,
               onChange: () => { this.refreshSelection(); }
            } ),
         expandedSet: navigation
            .publisherForFeature( this, 'expandedSet', { converter: 'bitSet', managed: true } ),
         hiddenTypeSet: navigation
            .publisherForFeature( this, 'hiddenTypeSet', { converter: 'stringSet', managed: true } ),
         hiddenRoleSet: navigation
            .publisherForFeature( this, 'hiddenRoleSet', { converter: 'stringSet', managed: true } )
      };

      resources.handlerFor( this )
         .registerResourceFromFeature( 'scenarios', {
            onUpdateReplace: () => {
               if( !this.features.activation.enabled ) {
                  // this is a viewer: mark everything without a result as in-progress:
                  this.resources.scenarios.forEach( item => {
                     forEachTree( item, it => {
                        if( it.$id in this.view.results ) { return; }
                        this.toggleMembership( this.view.busySet, it.$id, true );
                     } );
                  } );
                  this.running = !isEmpty( this.view.busySet );
               }
               this.refreshSelection();
            }
         } )
         .registerResourceFromFeature( 'job', {
            onUpdateReplace: () => { this.applyJobState(); }
         } )
         .registerResourceFromFeature( 'latestProgress', {
            onUpdateReplace: () => { this.applyLatestProgress(); }
         } )
         .registerResourceFromFeature( 'latestResults', {
            onUpdateReplace: () => { this.applyLatestResults(); }
         } );

      actions.handlerFor( this )
         .registerActionsFromFeature( 'activation', ({ item }) => {
            this.activate( item );
         } );
   },
   methods: {
      applyJobState() {
         const { job } = this.resources;
         this.running = job && !job.finished;
      },
      applyLatestResults() {
         const { results, busySet, staleSet } = this.view;
         this.resources.latestResults.forEach( result => {
            const { $id } = result.subject;
            this.toggleMembership( busySet, $id, false );
            this.toggleMembership( staleSet, $id, false );
            this.$set( results, $id, result );
            if( this.parameters.selectedItemId === $id ) {
               this.publish.selectionResult( result );
            }
         } );

         this.running = !isEmpty( busySet );
         this.cancelling = this.running && this.cancelling;
      },
      applyLatestProgress() {
         this.resources.latestProgress.forEach( ({ $id, progress }) => {
            this.$set( this.view.progress, $id, progress );
         } );
      },
      refreshSelection() {
         const { selectedItemId } = this.parameters;
         if( !selectedItemId ) {
            this.publish.selection( null );
            return;
         }
         let selection = null;
         this.resources.scenarios.forEach( rootItem => {
            forEachTree( rootItem, it => {
               if( it.$id === selectedItemId ) { selection = it; }
            } );
         } );
         if( !selection ) {
            this.propagate.selectedItemId( null );
         }
         this.publish.selection( selection );
         this.publish.selectionResult( this.view.results[ selectedItemId ] || null );
      },
      toggleItemFilter( parameter, filterValue ) {
         this.toggleMembership( this.parameters[ parameter ], filterValue );
         this.propagate[ parameter ]();
      },
      highlight( item, contextScenario = null ) {
         const scenario = contextScenario || scenarioOf( item, this.resources.scenarios );
         this.view.highlightSet = item ?
            predecessorSet( scenario, item ) :
            {};
      },
      select( item ) {
         if( item.$id !== this.parameters.selectedItemId ) {
            this.propagate.selectedItemId( item.$id );
         }
      },
      prepareActivation( item, scenario ) {
         this.running = true;
         this.highlight( item, scenario );
         const { staleSet, results, progress } = this.view;

         const runTree = filterTree( scenario, it => this.view.highlightSet[ it.$id ] );
         assert( runTree ).isNotNull();
         forEachTree( runTree, it => {
            this.$set( progress, it.$id, 0 );
            this.$set( results, it.$id, null );
            this.toggleMembership( staleSet, it.$id, false );
         } );
         Object.keys( results ).forEach( $id => {
            this.toggleMembership( staleSet, $id, true );
         } );
         return runTree;
      },
      activate( item, contextScenario = null ) {
         if( this.running ) { return; }
         const scenario = contextScenario || scenarioOf( item, this.resources.scenarios );
         const runTree = this.prepareActivation( item, scenario );
         this.view.busySet = treeKeys( runTree );
         this.view.highlightSet = {};
         this.request.activation( { items: [ runTree ] } );
      },
      activateAll() {
         if( this.running ) { return; }
         const runTrees = this.resources.scenarios.map( item => this.prepareActivation( item, item ) );
         this.view.busySet = treeKeys( ...runTrees );
         this.view.highlightSet = {};
         this.request.activation( { items: runTrees } );
      },
      cancel() {
         this.cancelling = true;
         this.request.cancel();
      },
      modifyExpanded( { item, newExpanded, recursive }, scenario ) {
         this.toggleMembership( this.parameters.expandedSet, item.$id, newExpanded );
         if( recursive ) {
            forEachTree( item, it => {
               const { role = 'test' } = it.context;
               const { outcome } = this.view.results[ it.$id ] || {};
               if( !newExpanded || role === 'test' || outcome === 'FAILURE' || outcome === 'ERROR' ) {
                  this.modifyExpanded( { item: it, newExpanded } );
               }
            } );
         }
         if( scenario ) {
            this.propagate.expandedSet();
         }
      },
      toggleMembership( set, key, beMember ) {
         const keep = typeof beMember === 'undefined' ? !set[ key ] : !!beMember;
         if( keep ) {
            this.$set( set, key, true );
         }
         else {
            this.$delete( set, key, true );
         }
      }
   }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Do an in-order-traverse on an item-tree and return a set (as an object with boolean values) of item keys
 * that come before a given item. By default, the descendants of the given item are returned as well, to fit
 * the scenario "run everything up to and including this test item" which by definition includes the item's
 * descendants.
 *
 * @param {Object} root
 *    an item representing the tree scenario (root of the item tree)
 * @param {Object} item
 *    the context item to collect predecessors for
 * @param {Boolean} [includeDescendants=true]
 *    determines if the context item's descendants are included
 *
 * @return {Object}
 *    an object with a key for each matched ID
 *
 * @private
 */
function predecessorSet( root, item, includeDescendants = true ) {
   let found = false;
   const result = {};
   forEachTree( root, ({ $id }) => {
      if( found ) { return; }
      result[ $id ] = true;
      if( $id === item.$id ) { found = true; }
   } );
   if( includeDescendants ) {
      forEachTree( item, ({ $id }) => { result[ $id ] = true; } );
   }
   return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function filterTree( item, f ) {
   const { items = [] } = item;
   return f( item ) ? {
      ...item,
      items: items.filter( f ).map( it => filterTree( it, f ) )
   } : null;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function forEachTree( item, f ) {
   f( item );
   ( item.items || [] ).forEach( it => { forEachTree( it, f ); } );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function treeKeys( ...items ) {
   const keys = {};
   items.forEach( item => {
      forEachTree( item, it => { keys[ it.$id ] = true; } );
   } );
   return keys;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function scenarioOf( { $id }, scenarios ) {
   let match = null;
   scenarios.forEach( s => {
      forEachTree( s, it => {
         if( it.$id === $id ) {
            match = s;
         }
      } );
   } );
   return match;
}

</script>

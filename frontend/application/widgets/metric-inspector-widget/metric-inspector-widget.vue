/**
* Copyright 2017 aixigo AG
*/
<template>
   <div>
      <h3 v-if="metrics.length">
         <i class="fa fa-thermometer-three-quarters" aria-hidden="true"></i>
         Metrics
      </h3>
      <table class="table table-striped">
         <thead class v-if="metrics.length > 0">
            <tr>
               <th><h3 class="fa ii-context-toggle">Name</h3></th>
               <th><h3 class="fa ii-context-toggle">Label</h3></th>
               <th><h3 class="fa ii-context-toggle">Type</h3></th>
               <th><h3 class="fa ii-context-toggle">Value</h3></th>
            </tr>
         </thead>
         <tbody>
            <template v-for="categories in metrics">
               <tr :key="`category-${categories.category}`">
                  <td colspan="4">
                     <h5 role="button"
                         tabindex="0"
                         @keypress.space.prevent="toggleActiveCategory( categories.category )"
                         @click.stop="toggleActiveCategory(categories.category)">
                        <i class="fa ii-context-toggle"
                           :class="{ 'fa fa-plus-square': !categoryVisible( categories.category ), 'fa-minus-square': categoryVisible( categories.category ) }"></i>
                     {{ categories.category }}
                     </h5>
                  </td>
               </tr>
               <tr v-for="metric in ( categoryVisible( categories.category ) ? categories.metrics : [] )"
                  :key="`metric-${metric.name}`">
                  <td>{{ metric.name }}</td>
                  <td>{{ metric.label }}</td>
                  <td>{{ metric.metricType }}</td>
                  <td>{{ parseFloat( metric.value ).toFixed( 2 ) }}</td>
               </tr>
            </template>
         </tbody>
      </table>
   </div>
</template>

<script>

import { resources  } from 'laxar-patterns';
import { navigation } from 'lib/util';

export default {
   data: () => ( {
      running: false,
      cancelling: false,
      metrics: [],
      activeCategories: [],
      resources: {
         metrics: {},
         job: {}
      }
   } ),
   created() {
      resources.handlerFor( this ).registerResourceFromFeature( 'metrics', { onReplace: () => {
         this.resources.metrics.forEach( m => {
            if( this.metrics.length && this.metrics[this.metrics.length - 1][ 'category' ]  == m[ 'category' ] ){
               this.metrics.pop();
            }
            this.metrics.push( m );
         } );
      } } );
      resources.handlerFor( this ).registerResourceFromFeature( 'job', { onReplace: () => {
         this.applyJobState();
      } } );
   },
   methods: {
      toggleActiveCategory( category ) {
         if( this.categoryVisible( category ) ) {
            this.activeCategories.splice( this.activeCategories.indexOf( category ), 1 );
         }
         else {
            this.activeCategories.push( category );
         }
      },
      categoryVisible( category ) {
         return this.activeCategories.indexOf( category ) > -1;
      },
      applyJobState() {
         const { job } = this.resources;
         this.metrics = [];
         this.activeCategories = [];
         this.running = job && !job.finished;
      }
   }
};
</script>

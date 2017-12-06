<template>
<form @submit.stop.prevent="apply()"
   class="properties-editor-control">
   <table>
      <colgroup>
         <col class="pec-name" />
         <col class="pec-value" />
         <col class="pec-type" v-if="useTypes" />
         <col class="pec-action" />
      </colgroup>
      <tbody>
         <tr v-for="key in propertyList"
            :key="key">
            <th>
               <label
                  :for="id( key )">{{ key }}
                  <em v-if="ownOverrides.problems[ key ]"
                     class="ax-error"
                     :title="ownOverrides.problems[ key ][ 0 ]">{{ ownOverrides.problems[ key ][ 0 ] }}</em>
               </label>
            </th>
            <td><input
               :readonly="!editable"
               v-model="ownOverrides.values[ key ]"
               ref="input"
               @keyup="isDirty = true"
               @keydown="isDirty = true"
               :class="{ 'ax-error': ownOverrides.problems[ key ] }"
               :id="id( key )"
               :placeholder="ownDefaults.values[ key ]" /></td>
            <td v-if="useTypes"
               class="btn-group pec-type"
               role="group">
               <button type="button"
                  v-for="propType in TYPE"
                  :key="propType.key"
                  :title="propType.title"
                  :disabled="!editable || !ownOverrides.values[ key ]"
                  class="btn btn-xs btn-default pec-type"
                  :class="{ active: propType === ( ownOverrides.types[ key ] || ownDefaults.types[ key ] ) }"
                  @click="editable && setType( key, propType )">{{ propType.iconLabel }}</button>
            </td>
            <td>
               <i v-if="editable && ownOverrides.values[ key ]"
                  class="fa fa-times"
                  role="button"
                  @click="remove( key )"
                  title="reset" ></i>
               <i v-if="editable && !ownOverrides.values[ key ]"
                  class="fa fa-edit"
                  role="button"
                  @click="init( key )"
                  title="override"></i>
            </td>
         </tr>
         <tr v-if="editable">
            <th><input placeholder="new key" v-model="toAdd.key" /></th>
            <td><input placeholder="new value" v-model="toAdd.value" /></th>
            <td :colspan="useTypes ? 2 : 1">
               <i v-if="toAdd.key"
                  class="fa fa-plus"
                  role="button"
                  title="add context override"
                  type="button"
                  @click="add( toAdd.key, toAdd.value )"></i>
            </td>
         </tr>
      </tbody>
      <tfoot v-if="editable">
         <td></td>
         <td :colspan="useTypes ? 3 : 2">
            <button
               :disabled="!isDirty"
               type="submit"
               class="btn btn-link pec-apply">
               apply <i class="fa fa-send"></i>
            </button>
         </td>
      </tfoot>
   </table>
</form>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const TYPE = {
   EXPRESSION: {
      key: 'EXPRESSION',
      title: 'expression',
      iconLabel: ':',
      validate( str ) {
         try {
            // eslint-disable-next-line no-new-func
            new Function( `return ${str};` );
         }
         catch( e ) { return [ e.message || e ]; }
         return [];
      },
      format( v ) {
         return v;
      },
      parse( normK, strV ) {
         return [ `:${normK}`, strV ];
      }
   },
   JSON: {
      key: 'JSON',
      title: 'JSON constant',
      iconLabel: '{}',
      validate( str ) {
         try { JSON.parse( str ); }
         catch( e ) { return [ e.message || e ]; }
         return [];
      },
      format( v ) {
         return JSON.stringify( v );
      },
      parse( normK, strV ) {
         return [ normK, JSON.parse( strV ) ];
      }
   },
   STRING: {
      key: 'STRING',
      title: 'string constant',
      iconLabel: '""',
      parse( normK, strV ) {
         return [ normK, strV ];
      },
      format( v ) {
         return v;
      },
      validate() {
         return [];
      }
   }
};

export default {
   props: {
      defaults: {
         type: Object,
         required: true
      },
      overrides: {
         type: Object,
         required: true
      },
      useTypes: {
         type: Boolean,
         default: false
      },
      id: {
         type: Function,
         required: true
      },
      editable: {
         type: Boolean,
         default: true
      }
   },
   data: () => ( {
      toAdd: { key: '', value: '' },
      isDirty: false,
      ownDefaults: {
         types: {},
         values: {}
      },
      ownOverrides: {
         types: {},
         values: {},
         problems: {}
      }
   } ),
   watch: {
      defaults: {
         immediate: true,
         handler( newDefaults, prevDefaults ) {
            if( newDefaults === prevDefaults ) { return; }
            this.ownDefaults = fromProperties( newDefaults );
         }
      },
      overrides: {
         immediate: true,
         handler( newOverrides, prevOverrides ) {
            if( newOverrides === prevOverrides ) { return; }
            this.ownOverrides = { ...fromProperties( newOverrides ), problems: [] };
         }
      }
   },
   computed: {
      TYPE: () => TYPE,
      propertyList() {
         const all = { ...this.ownDefaults.values, ...this.ownOverrides.values };
         const list = Object.keys( all ).filter( key => key !== '_links' );
         list.sort();
         return list;
      }
   },
   methods: {
      add( key, value ) {
         if( !key ) { return; }
         this.$set( this.ownOverrides.values, key, value );
         this.$set( this.ownOverrides.types, key, TYPE.STRING );
         this.toAdd = { key: '', value: '' };
         this.isDirty = true;
      },
      setType( key, type ) {
         this.$set( this.ownOverrides.types, key, type );
         this.$delete( this.ownOverrides.problems, key );
         this.isDirty = true;
      },
      init( key ) {
         this.$set( this.ownOverrides.values, key, this.ownDefaults.values[ key ] );
         this.$set( this.ownOverrides.types, key, this.ownDefaults.types[ key ] );
         this.isDirty = true;
         setTimeout( () => {
            const id = this.id( key );
            this.$refs.input.filter( _ => _.id === id )[ 0 ].select();
         } );
      },
      remove( key ) {
         this.$delete( this.ownOverrides.values, key );
         this.$delete( this.ownOverrides.types, key );
         this.$delete( this.ownOverrides.problems, key );
         this.isDirty = true;
      },
      apply() {
         if( this.toAdd.key ) {
            this.add( this.toAdd.key, this.toAdd.value );
         }
         const [ results, problems ] = asProperties( {
            values: this.ownOverrides.values,
            types: { ...this.ownDefaults.types, ...this.ownOverrides.types }
         } );
         this.$set( this.ownOverrides, 'problems', problems.reduce( zip, {} ) );
         if( !problems.length ) {
            this.$emit( 'modified', results.reduce( zip, {} ) );
         }
         this.isDirty = false;
      }
   }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function fromProperties( properties ) {
   const keys = Object.keys( properties );

   const types = keys
      .map( k => {
         const normKey = k.charAt( 0 ) === ':' ? k.slice( 1 ) : k;
         if( normKey !== k ) { return [ normKey, TYPE.EXPRESSION ]; }
         const isJson = typeof properties[ k ] !== 'string';
         return [ normKey, isJson ? TYPE.JSON : TYPE.STRING ];
      } )
      .reduce( zip, {} );

   const values = keys
      .map( k => [ k, k.charAt( 0 ) === ':' ? k.slice( 1 ) : k ] )
      .map( ([ k, normKey ]) => [
         normKey,
         types[ normKey ].format( properties[ k ] )
      ] )
      .reduce( zip, {} );

   return { values, types };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function asProperties( { values, types } ) {
   const results = Object.keys( values )
      .map( key => {
         const type = types[ key ] || TYPE.STRING;
         const strVal = values[ key ];
         const problems = type.validate( strVal );
         return problems.length === 0 ?
            type.parse( key, strVal ) :
            [ key, null, problems ];
      } );

   const okResults = results
      .filter( _ => _.length === 2 );

   const problemResults = results
      .filter( _ => _.length > 2 )
      .map( ([ key, , problems ]) => [ key, problems ] );

   return [ okResults, problemResults ];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function zip( acc, [ k, v ] ) {
   const res = acc;
   res[ k ] = v;
   return res;
}

</script>

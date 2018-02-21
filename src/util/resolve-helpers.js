
module.exports = { requireResolveAsPromise };

function requireResolveAsPromise( request ) {
   return new Promise( (resolve, reject) => {
      try {
         const absPath = require.resolve( request );
         resolve( absPath );
      }
      catch( e ) {
         reject( e );
      }
   } );
}

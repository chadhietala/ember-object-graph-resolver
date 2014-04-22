#Ember Object Resolver
The purpose of this project is to build a dependency graph for objects in Ember applications. Because Ember uses a container to invert control, it would be ideal map those dependencies at build time so that we can async load "pods" or "bundles" of files a given route.

#Why Not RequireJS
The hopes for this project is to just surface the object dependency graph and map it back on to the file system. That being said you could use the output of this tool to use with requirejs. No promises though.
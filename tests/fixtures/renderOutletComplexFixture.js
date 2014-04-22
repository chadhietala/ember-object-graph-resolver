var controller = 'export default Ember.Route.extend({' +
                    'foo: "taking care of business",' +
                    'renderTemplate: function() {' +
                      'var foo = function(){};'+
                      'foo();' +
                      'this.render("favoritePost", {' +
                        'into: "posts",' +
                        'outlet: "posts",' +
                        'controller: "blogPost"' +
                      '});' +
                    '}'+
                  '});';

module.exports = controller;
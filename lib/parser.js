var eparser = require('esprima').parse;
var handlebarsParse = require('handlebars').parse;
var traverse = require('ast-traverse');

/**
 * Checks to see if the keys in the object
 * are actually there.
 * @param  {Object} obj Object we want to check
 * @return {Boolean}
 */
function _keyExists(obj /*, ...thisp*/) {
  var args = Array.prototype.slice.call(arguments),
      obj = args.shift();

  for (var i = 0; i < args.length; i++) {
    if (!obj.hasOwnProperty(args[i])) {
      return false;
    }
    obj = obj[args[i]];
  }

  return true;
}

/**
 * Finds the name in any `controllerFor` method calls.
 * @param  {Object} node The AST of the file
 * @return {String}      The name of the controller
 */
function getControllerFor(node) {
  if ( node.type === 'CallExpression' && _keyExists(node, 'callee', 'property') && node.callee.property.name === 'controllerFor') {
    return node.arguments[0].value;
  }
}

/**
 * Finds the pieces of any this.render calls. This includes
 * simple calls where the into property and controller properties
 * are set.  This also supports multiple this.render calls.
 * @param  {Object} node The AST of the file
 * @return {Object}      The resolved templates and controllers
 */
function getRenderOutlet (node) {
  var obj = {};

  obj.templates = [];
  obj.controllers = [];

  if (node.key && node.key.name === 'renderTemplate') {
    var renderCall = node.value.body.body.filter(function(body) {
      return body.type === 'ExpressionStatement' &&
             _keyExists(body, 'expression', 'callee', 'object') &&
             body.expression.callee.object.type === 'ThisExpression' &&
             body.expression.callee.property.name === 'render';
    });

    // Pick out into and controller literals
    renderCall.forEach(function(call) {

      call.expression.arguments.forEach(function(arg) {
        if (arg.type === 'Literal') {
          obj.templates.push(arg.value);
        } else if (arg.type === 'ObjectExpression') {

          arg.properties.forEach(function(prop) {
            var name = prop.key.name,
                value = prop.value.value;

            if (name === 'into') {
              obj.templates.push(value);
            }

            if (name === 'controller' && prop.value.type === 'Literal') {
              obj.controllers.push(value);
            }
          });
        }
      });
    });

    return obj;
  }
}

/**
 * Finds the string values from the needs property
 * if it is an array.
 * @param  {Object} node The AST of the file
 * @return {Array}       An array of controller names
 */
function needsArray (node) {
  return node.value.elements.map(function(need) {
    return need.value;
  });
}

/**
 * Normalizes needs property to an array.
 * @param  {Object} node The AST of the file
 * @return {Array}      An array of controller names
 */
function needsString (node) {
  return [node.value.value];
}

/**
 * Determines if the needs property is an array or
 * string then handles them appropriatly.
 * @param  {Object} node The AST of the file
 * @return {Array}      An array of controller names
 */
function getNeeds(node) {
  var type;

  if (node.key && node.key.name === 'needs') {
    type = node.value.type;

    // needs: ['foo', 'bar']
    if (type === 'ArrayExpression') {
      return needsArray(node);
      // needs: 'foo'
    } else if (type === 'Literal') {
      return needsString(node);
    }
  }

  return false;
}

/**
 * Finds the name of any `{{view}}` helper calls.
 * @param  {Object} node The AST of the Handlebars files
 * @return {String}      The name of the view
 */
function getView (node) {
  if (node.type === 'mustache' && node.sexpr.id.original === 'view') {
    return node.sexpr.params.map(function(param) {
      return param.original;
    });
  }
}

/**
 * Finds the template needed to render the partial
 * @param  {Object} node The AST of the Handlebars template
 * @return {String}      The name of the template
 */
function getPartial (node) {
  var sexpr = node.sexpr;
  if (node.type === 'mustache' && sexpr.id.original === 'partial') {
    return sexpr.params.map(function(param) {
      return param.original;
    })[0];
  }
}

/**
 * Gets the template name to render
 * @param  {Object} node The AST of the Handlebars template
 * @return {String}      The name of the template
 */
function getRender (node) {
  var sexpr = node.sexpr;
  if (node.type === 'mustache' && sexpr.id.original === 'render') {

    // TODO Probably should throw if there are multiple strings or
    // items are not passed in the correct order
    return sexpr.params.filter(function(param) {
      return param.type === 'STRING';
    }).map(function(param) {
      return param.original;
    })[0];
  }

}

/**
 * Parses a file returns all of the fullnames for the objects.
 * @param {String} text    The contents of a javascript or handlebars file.
 * @param {Object} options Options hash to determine which parser to use.
 * @property {String} options.fileType Either 'script' or 'template'
 */
function Parser (text, options) {
  options = options || {};
  this._fullNames = [];
  this.fileType = options.fileType || 'script';
  this.parse(text);
}
/**
 * Uses either the JavaScript AST or the Handlebars
 * AST to surface object dependecies in files.
 * @param  {String} text    The contents of the file.
 * @param  {Object} options Configuration options
 * @property {String} options.fileType The type of file we are parsing.
 *                                     Either 'script' or 'template'.
 * @return {Nil}
 */
Parser.prototype.parse = function(text) {
  this.views = {};
  this.controllers = {};
  this.models = {};
  this.templates = {};

  if ( this.fileType === 'template' ) {
    return this.walkTemplate(handlebarsParse(text));
  } else if ( this.fileType === 'script' ){
    return this.walkScript(eparser(text, {range: true, comment: true}));
  } else {
    throw new Error('Cannot parse type ' + this.fileType);
  }

};

/**
 * Walks over the AST and generates the correct full names.
 * @param  {Object} nodes The AST of the file
 * @return {[type]}       [description]
 */
Parser.prototype.walkTemplate = function(nodes) {
  traverse(nodes, {
    pre: function(node) {
      var partial = getPartial(node),
          render = getRender(node),
          view = getView(node),
          templates = this.templates,
          _fullNames = this._fullNames,
          controllers = this.controllers;

      if (partial) {
        templates[partial] = 'template:' + partial;
        _fullNames.push(templates[partial]);
      }

      if (render) {
        templates[render] = 'template:' + render;
        controllers[render] = 'controller:' + render;
        _fullNames.push(templates[render], controllers[render] );
      }

      if (view) {
        this.views[view] = 'view:' + view;
        templates[view] = 'template:' + view;
        _fullNames.push(this.views[view], templates[view]);
      }

    }.bind(this)
  });
};

Parser.prototype.walkScript = function(nodes) {
  traverse(nodes, {
    pre: function(node) {
      var controllerFor = getControllerFor(node),
          needs = getNeeds(node),
          outlet = getRenderOutlet(node),
          controllers = this.controllers,
          _fullNames = this._fullNames;

      if (controllerFor) {
        controllers[controllerFor] = 'controller:' + controllerFor;
      }

      if (needs) {
        needs.forEach(function(need) {
          if (!controllers[need]) {
            controllers[need] = 'controller:' + need;
            _fullNames.push(controllers[need]);
          }
        }.bind(this));
      }

      if (outlet) {

        if (outlet.controllers) {
          outlet.controllers.forEach(function(controller) {
            controllers[controller] = 'controller:' + controller;
            _fullNames.push(controllers[controller]);
          }.bind(this));
        }

        if (outlet.templates) {
          outlet.templates.forEach(function(template) {
            this.templates[template] = 'template:' + template;
            _fullNames.push(this.templates[template]);
          }.bind(this));
        }

      }

    }.bind(this)
  });
};

Parser.prototype.getFullNames = function() {
  return this._fullNames;
};

module.exports = Parser;
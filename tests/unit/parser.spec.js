var expect = require('chai').expect;
var fs = require('fs');
var Parser = require('../../lib/Parser');
var controllerForFixture = require('../fixtures/controllerFor');
var modelForFixture = require('../fixtures/modelForFixture');
var needsStringFixture = require('../fixtures/needsString');
var needsArrayFixture = require('../fixtures/needsArray');
var renderOutletComplexFixture = require('../fixtures/renderOutletComplexFixture');
var renderMultipleOutletsComplexFixture = require('../fixtures/renderMultipleOutletsComplexFixture');
var partialFixture = require('../fixtures/partialFixture');
var partialMultipleFixture = require('../fixtures/partialMultipleFixture');
var renderFixture = require('../fixtures/renderFixture');
var viewFixture = require('../fixtures/viewFixture');
var parser;

describe('Parser', function() {
  describe('walkScript', function() {

    it('should find the object dependency in controllerFor', function() {
      parser = new Parser(controllerForFixture);
      expect(parser.controllers.post).to.equal('controller:post');
    });

    it('should find the object dependency in modelFor', function() {
      parser = new Parser(modelForFixture);
      expect(parser.controllers.post).to.equal('controller:post');
    });

    it('should find the object dependency in needs if it is a string', function() {
      parser = new Parser(needsStringFixture);
      expect(parser.controllers.post).to.equal('controller:post');
    });

    it('should find the object dependency in needs if it is an array', function() {
      parser = new Parser(needsArrayFixture);
      expect(parser.controllers.post).to.equal('controller:post');
      expect(parser.controllers.comments).to.equal('controller:comments');
    });

    it('should find the controller and the templates for a complex named outlet', function() {
      parser = new Parser(renderOutletComplexFixture);
      expect(parser.controllers.blogPost).to.equal('controller:blogPost');
      expect(parser.templates.posts).to.equal('template:posts');
      expect(parser.templates.favoritePost).to.equal('template:favoritePost');
    });

    it('should find the controllers and the templates for multiple render outlet calls', function() {
      parser = new Parser(renderMultipleOutletsComplexFixture);
      expect(parser.controllers.blogPost).to.equal('controller:blogPost');
      expect(parser.templates.posts).to.equal('template:posts');
      expect(parser.templates.favoritePost).to.equal('template:favoritePost');
      expect(parser.controllers.cat).to.equal('controller:cat');
      expect(parser.templates.foo).to.equal('template:foo');
      expect(parser.templates.bar).to.equal('template:bar');
    });
  });



  describe('walkTemplate', function() {
    var config;
    beforeEach(function() {
      config = {fileType: 'template'};
    });

    it('should find the template for the partial', function() {
      parser = new Parser(partialFixture, config);
      expect(parser.templates.foo).to.be.equal('template:foo');
    });

    it('should find the templates for multiple partials', function() {
      parser = new Parser(partialMultipleFixture, config);
      expect(parser.templates.foo).to.be.equal('template:foo');
      expect(parser.templates.bar).to.be.equal('template:bar');
    });

    it('should find the template and controller for render helper', function() {
      parser = new Parser(renderFixture, config);
      expect(parser.templates.foo).to.be.equal('template:foo');
      expect(parser.controllers.foo).to.be.equal('controller:foo');
    });

    it('should find the template for the view', function() {
      parser = new Parser(viewFixture, config);
      expect(parser.views.foo).to.be.equal('view:foo');
      expect(parser.templates.foo).to.be.equal('template:foo');
    });
  });

  describe('getFullNames', function() {
    it('should return the full names', function() {
      var fullNames;
      parser = new Parser(renderMultipleOutletsComplexFixture);
      fullNames = parser.getFullNames();
      expect(fullNames).to.eql(['controller:blogPost', 'controller:cat', 'template:favoritePost', 'template:posts', 'template:foo', 'template:bar']);
    });
  });
});

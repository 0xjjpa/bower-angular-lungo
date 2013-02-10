'use strict';

var AppRouter = function(Lungo, $location, $scope) {
  var routingHistory = [];

  var oldReplace = $location.replace;

  $location.replace = function() {
    $location.$$replace = true;
    routingHistory = [];
    return $location;
  };

  var showSection = function(path) {
    var pathParts = path.split('/');
    var sectionPathLength = 2;
    var sectionName = pathParts[1] !== '' ? pathParts[1] : 'main';
    
    if(pathParts.length > sectionPathLength) {
      Lungo.Router.article(pathParts[0], pathParts[1]);
    }
    else {
      console.log('AppRouter::showSection - transitioning to ', sectionName);
      Lungo.Router.section(sectionName);
    }
  };

  $scope.$on('$routeChangeStart', function() {
    console.log('AppRouter::routeChangeStart - route change beginning');
  });

  $scope.$on('$routeChangeSuccess', function(next, last) {    
    console.log('AppRouter::routeChangeSuccess - route change successful to: ', $location.path());
    if(routingHistory.length > 0 && routingHistory[routingHistory.length-2] == $location.path()) {
      console.log('AppRouter::routeChangeSuccess - detected back, and going there...');
      routingHistory.pop();
      try {
        Lungo.Router.back();
      } catch(e) {
        console.log('AppRouter::$routeChangeSuccess - caught exception while navigating to ', $location.path(), ' : ', e);
        throw e;
      }
    }
    else {
      showSection($location.path());
      routingHistory.push($location.path());
    }
  });

  var getPrevious = function() {
    if(routingHistory.length < 2) {
      throw new Error('No back to go back to!');
    }
    return routingHistory[routingHistory.length - 2];
  }

  var back = function() {

    if(routingHistory.length == 0) {
      console.log('AppRouter::back() - nothing to go back to :(');
      return;
    }
    var previousLocation = getPrevious();
    console.log('AppRouter::back() - going back to ', previousLocation);
    $location.path(previousLocation);
  }

  return {
    back: back
  }

};

angular.module('Centralway.angular-lungo-bridge', [])
	.directive('cwRouting', function($location) {
		return {
			restrict: 'ECA',
			terminal: true,
			link: function(scope, element, attr) {
				AppRouter.instance = AppRouter(Lungo, $location, scope);		
			}	
		}
		
	})
	.directive('cwView', function($http,   $templateCache,   $route,   $anchorScroll,   $compile, $controller) {
  return {
    restrict: 'ECA',
    terminal: true,
    link: function(scope, element, attr) {
      var lastScope,
          onloadExp = attr.onload || '';

      scope.$on('$routeChangeSuccess', update);
      update();


      function destroyLastScope() {
        if (lastScope) {
          lastScope.$destroy();
          lastScope = null;
        }
      }

      function clearContent() {
        element.html('');
        destroyLastScope();
      }

      function update() {
      	console.log('cw-view::update() - Performing content update');
        var locals = $route.current && $route.current.locals,
            template = locals && locals.$template;

        if (template) {
          var targetContainer = element.parent();
          
          targetContainer.append(template);

          var newElement = angular.element(targetContainer.children()[targetContainer.children().length - 1]);
          
          destroyLastScope();

          var link = $compile(newElement.contents()),
              current = $route.current,
              controller;

          lastScope = current.scope = scope.$new();
          if (current.controller) {
            locals.$scope = lastScope;
            controller = $controller(current.controller, locals);
            newElement.contents().data('$ngControllerController', controller);
          }

          link(lastScope);
          lastScope.$emit('$viewContentLoaded');
          lastScope.$eval(onloadExp);

          // $anchorScroll might listen on event...
          $anchorScroll();
        } else {
          //clearContent();
        }
      }
    }
  };
});

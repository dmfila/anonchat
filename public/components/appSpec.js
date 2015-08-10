describe('forumsController', function(){
  beforeEach(module('forum_app'));

  it('should create "players" model with 3 players', inject(function($controller) {
    var scope = {},
        ctrl = $controller('playerController', {$scope:scope});

    expect(scope.length).toBe(3);
  }));

});
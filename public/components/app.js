'use strict';
// Declare app level module which depends on views, and components
var app = angular.module('forum_app', ['ngCookies', 'ngRoute', 'angularMoment']);
var socket = io();


app.factory('clientInfo', function() {
    return {
        loggedIn: false
    };
});


// configure our routes
app.config(function($routeProvider, $locationProvider) {
    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl : 'pages/home.html',
            controller  : 'homeController'
        })

        // route for the about page
        .when('/about', {
            templateUrl : 'pages/about.html',
            controller  : 'aboutController'
        })

        // route for the about page
        .when('/topic/:topicName?', {
            templateUrl : 'pages/topicDetails.html',
            controller  : 'topicController'
        });
    //check browser support
    if(window.history && window.history.pushState){
        //$locationProvider.html5Mode(true); will cause an error $location in HTML5 mode requires a  tag to be present! Unless you set baseUrl tag after head tag like so: <head> <base href="/">

        // to know more about setting base URL visit: https://docs.angularjs.org/error/$location/nobase

        // if you don't wish to set base URL then use this
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        });
    }
});

// create the controller and inject Angular's $scope
app.controller('homeController',['$scope', '$location', '$filter', function($scope, $location, $filter) {
    // create a message to display in our view
    $scope.visitTopic = function(){
        $location.url('/topic/' + $filter('escape')($scope.search.content));
    };
}]);

app.controller('aboutController', function($scope) {
    $scope.message = 'Look! I am an about page.';
});

app.controller('forumsController', ['$scope', '$cookies', 'clientInfo', '$location', '$filter', function($scope, $cookies, clientInfo, $location, $filter){
    $scope.topics = [];
    $scope.recentTopics = [];
    $.getJSON("http://jsonip.com?callback=?", function (data) {
        socket.emit('fetchUserInfo', JSON.stringify({session: $cookies.get("userInfo"), ip: data.ip}));
    });
    socket.on('trendingTopics', function(topicsJSON){
        $scope.topics = JSON.parse(topicsJSON);
        $scope.$apply();
    });
    socket.on('recentTopics', function(recentTopicsJSON){
        $scope.recentTopics = JSON.parse(recentTopicsJSON);
        if ($scope.recentTopics.length > 5){
            $scope.recentTopics = $scope.recentTopics.splice(0,5);
        }
        $scope.$apply();
    });
    socket.on('createdUser', function(userInfo){
        var userSessionInfo = JSON.parse(userInfo);
        // this will set the expiration to 6 months
            var exp = new Date(new Date().setYear(new Date().getFullYear() + 3));

        $cookies.put("userInfo", userSessionInfo.session,{
            expires: exp
        });
        socket.emit('fetchUserInfo', userSessionInfo.session);
    });
    socket.on('returnUserInfo', function(userInfoJson){
        clientInfo = JSON.parse(userInfoJson);
        clientInfo.loggedIn = true;
        $scope.clientInfo = clientInfo;
        $scope.$apply();
    });
}]);

app.controller('topicController', ['$scope', '$routeParams', '$location', '$filter', function($scope, $routeParams, $location, $filter) {

    $scope.topicName = $routeParams.topicName;
    socket.emit('requestTopicDetails', $routeParams.topicName);

    socket.on('topicDetails', function(topicComments){
        $scope.comments = JSON.parse(topicComments);
        $scope.$apply();
    });

    $scope.submitComment = function(){
        if ($("#commentField").val() != "") {
            socket.emit('addComment', JSON.stringify({
                session: $scope.clientInfo.session,
                comment: $scope.comment.content,
                topic: $scope.topicName
            }));
            $("#commentField").val("");
        }
    };
    $scope.goBack = function(){
        $location.url('/');
    };
    $scope.nextTopic = function(){
        var newIndex = $scope.topics.indexOf($scope.topicName) + 1;
        if ($scope.topics.indexOf($scope.topicName) >= $scope.topics.length - 1)
            newIndex = 0;

        var topicName = $scope.topics[newIndex];
        $location.url('/topic/' + $filter('escape')(topicName));

    };
    $scope.prevTopic = function(){
        var newIndex = $scope.topics.indexOf($scope.topicName) - 1;
        if ($scope.topics.indexOf($scope.topicName) <= 0)
            newIndex = $scope.topics.length - 1;

        var topicName = $scope.topics[newIndex];
        $location.url('/topic/' + $filter('escape')(topicName));
    };

    $scope.deletePost = function(comment_id){
        socket.emit('deleteComment', JSON.stringify({_id: comment_id, session: $scope.clientInfo.session}))
    };
    socket.on('deletedComment', function(commentDetails){
        var comment = JSON.parse(commentDetails);
        var index = 0;
        // Retrieving indexof won't work since comment will have a different JS ObjectID than the same entry in comments Array.
        for (var x = 0; x < $scope.comments.length; x++){
            if ($scope.comments[x]._id == comment._id){
                index = x;
            }
        }
        $scope.comments.splice(index, 1);
        console.log($scope.comments);
        console.log(comment);
        $scope.$apply();

    });


    socket.on('successPost', function(postSuccess){

    });

    socket.on('new_comment', function(commentDetailsJSON){
        var commentDetails = JSON.parse(commentDetailsJSON);
        if ($scope.topicName == commentDetails.topic){
            $scope.comments.push(commentDetails);

            /**
             * Recent topic logic
             */
            if ($scope.recentTopics.indexOf(commentDetails.topic) != -1){
                $scope.recentTopics.splice($scope.recentTopics.indexOf(commentDetails.topic), 1);
            }
            $scope.recentTopics.unshift(commentDetails.topic);
            if ($scope.recentTopics.length > 5){
                $scope.recentTopics = $scope.recentTopics.splice(0,5);
            }

            $scope.$apply();
        }
    });
}]);



app.filter('escape', function() {
    return window.encodeURIComponent;
});
app.filter('reverse', function() {
    return function(items) {
        if (!items || !items.length) { return; }
        return items.slice().reverse();
    };
});
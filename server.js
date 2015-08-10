var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var Twitter = require('twitter');
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
var util = require('util');

var log_file;
var log_stdout;
var log_id = 0;
var file_exists = true;



var client = new Twitter({
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: ''
});


/**
 * Debug file set-up | Easier fixing when issue has a log....
 */

var mkdirSync = function (path) {
    try {
        fs.mkdirSync(path);
    } catch (e) {
        if (e.code != 'EEXIST') throw e;
    }
};
mkdirSync(__dirname + "/logs");

while (file_exists) {
    if (!fs.existsSync(__dirname + '/logs/debug_' + log_id + '.log')) {
        log_file = fs.createWriteStream(__dirname + '/logs/debug_' + log_id + '.log', {flags: 'w'});
        log_stdout = process.stdout;
        file_exists = !file_exists;
    }
    else
        log_id++;
}


app.use(express.static(__dirname + '/public'));
app.use("/bootstrap_scripts", express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));

app.all('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});
app.all('/topic/:topic', function(req, res) {
    res.sendFile(__dirname + '/public/index.html', {topic: req.topic});
});
//app.all('/*', function(req, res, next) {
//    res.sendFile('index.html', { root: __dirname+'/public/' });
//});
//app.all('/', function (req, res) {
//    res.sendFile(__dirname + '/public/index.html');
//});

console.log(__dirname);
var maxUsername = 1000000;
var minUsername = 9999999;
var trendsList = [];
(function(){
    client.get('trends/place', {id: 1}, function (error, tweets, response) {
        console.log(error);
        if (error) throw error;
        var trends = tweets[0].trends;
        trendsList = [];
        trends.forEach(function (trend) {
            trendsList.push(trend.name);
        });
    });
    setTimeout(arguments.callee, 1000 * 60 * 30);// Update the trending topics every 30 mins...
})();

var MongoClient = require('mongodb').MongoClient, assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/starForums';
// Use connect method to connect to the Server
var dbCon;
MongoClient.connect(url, function (err, dbConnection) {
    assert.equal(null, err);
    dbCon = dbConnection;
    console.log("Connected correctly to server. Server can now send queries.");
});


io.on('connection', function (socket) {
    console.log("User connected from " + socket.request.connection._peername.address.address);
    socket.emit('trendingTopics', JSON.stringify(trendsList));

    var topicsCollection = dbCon.collection('topic_comments');
    topicsCollection.find().sort({'_id': -1}).limit(5).toArray(function (err, items) {
        socket.emit('recentTopics', JSON.stringify(items));
    });

    socket.on('disconnect', function () {
        console.log('User Disconnected.');
    });
    socket.on('fetchUserInfo', function (user_sessionJSON) {
        var user_session = JSON.parse(user_sessionJSON);
        var usersCollection = dbCon.collection('users');

        usersCollection.find({session: user_session.session}).toArray(function (err, results) {
            if (results.length > 0) {
                socket.emit('returnUserInfo', JSON.stringify(results[0]));
            }
            else {
                var userInfo = {
                    username: Math.floor(Math.random() * (maxUsername - minUsername)) + minUsername,
                    user_ip: user_session.ip,
                    session: (Math.random().toString(36) + '00000000000000000').slice(2, 40 + 2)//crypto.createHash('md5').update((Math.random().toString(36)+'00000000000000000').slice(2, 40+2)).digest('hex')

                };
                usersCollection.find({"username": userInfo.username}).toArray(function (err, results) {
                    if (results.length > 0) {
                        // Deny registration - Username already exists.
                        //socket.emit("failedUserRegistration")
                    }
                    else {
                        // Process the registration...
                        usersCollection.insertOne(userInfo, {w: 1}, function (err2, result2) {
                            socket.emit("createdUser", JSON.stringify({session: userInfo.session}));
                        });
                    }
                });
            }

        });
    });
    socket.on('deleteComment', function (comment_details) {
        var comment = JSON.parse(comment_details);
        if (comment != undefined) {
            var usersCollection = dbCon.collection('users');
            usersCollection.find({session: comment.session}).toArray(function (err, results) {
                var username = results[0].username;
                var topicsCollection = dbCon.collection('topic_comments');
                topicsCollection.find({
                    username: username,
                    _id: ObjectId(comment._id)
                }).toArray(function (err2, results2) {
                    if (results2.length > 0) {
                        console.log(username + " deleted a comment with '" + results2[0].comment + "'");
                        topicsCollection.removeOne({
                            username: username,
                            _id: ObjectId(comment._id)
                        }, function (err3, results3) {
                            io.emit("deletedComment", JSON.stringify(results2[0]));
                            var topicsCollection = dbCon.collection('topic_comments');
                            topicsCollection.find().sort({'_id': -1}).limit(5).toArray(function (err, items) {
                                socket.emit('recentTopics', JSON.stringify(items));
                            });
                        });
                    }
                });
            });

        }
    });


    socket.on('addComment', function (comment_details) {
        var commentDetails = JSON.parse(comment_details);
        var usersCollection = dbCon.collection('users');

        usersCollection.find({session: commentDetails.session}).toArray(function (err, results) {
            var commentsCollection = dbCon.collection('topic_comments');
            commentsCollection.insertOne({
                username: results[0].username,
                topic: commentDetails.topic,
                topic_lower: commentDetails.topic.toLowerCase(),
                comment: commentDetails.comment,
                post_time: new Date().getTime()
            }, function (err2, results2) {
                io.emit('new_comment', JSON.stringify(results2.ops[0]));
            });
        })
    });


    socket.on('requestTopicDetails', function (topicName) {
        var topicsCollection = dbCon.collection('topic_comments');

        topicsCollection.find({topic_lower: topicName.toLowerCase()}).toArray(function (err, results) {
            socket.emit('topicDetails', JSON.stringify(results));
        })
    });

});

http.listen(3000, function () {
    console.log('Listening on *:3000');
});


console.log = function (d) { //
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};
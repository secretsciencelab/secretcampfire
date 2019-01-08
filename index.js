const cors = require('cors');
const express = require('express')
const basicAuth = require('express-basic-auth')
const bodyParser = require('body-parser')
const db = require('./db')
const http = require('http')
const path = require('path')
const PORT = process.env.PORT || 5000

var app = express();

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(cors())
  .options('*', cors());

// handle errors
app.use((err, req, res, next) => {
    if (!err)
      return next();

    res.status(500);
    res.send('500: Internal server error');
});

function getReqProtocol(req) {
  return req.headers['x-forwarded-proto'] || req.protocol;
}

function sendSampleFeed(req, res) {
  // send sample feed.json
  var testUrl = "http://" + req.headers.host + "/test_feed.json";
  http.get(testUrl, function(_res) {
    var body = '';
    _res.on('data', function(chunk) {
      body += chunk;
    });
    _res.on('end', function() {
      res.send(body);
    });
  });
}

app.get('/feed/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  res.setHeader('Content-Type', 'application/json');
  db.fetchPosts(index, function(err, docs) {
    if (!index && (!docs || docs.length == 0))
      sendSampleFeed(req, res);
    else
    {
      // send page from DB
      var feed = {
        'name': req.headers.host, 
        'description': '',
        'avatar_url': '',
        'header_url': '',
        'style_url': getReqProtocol(req) 
          + '://' + req.headers.host + '/stylesheets/feed.css',
        'posts': docs
      };
      res.send(JSON.stringify(feed, null, 2));
    }
  });
});

app.get('/post/:id', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  // TODO
  res.send(JSON.stringify({ 
    'path': 'post',
    'params': req.params
  }));
});

app.get('/render/:uri?', function (req, res) {
  var uri = getReqProtocol(req)
    + '://' + req.headers.host + '/feed'; //default to own feed
  if (req.params['uri'])
    uri = req.params['uri'];

  res.render('pages/render', {
    'uri': uri
  });
});

// catch-all route
app.get('*', function (req, res, next) {
  if (req.url.indexOf("/posts") != -1
     || req.url.indexOf("/dashboard") != -1
     || req.url.indexOf("/follow") != -1
     || req.url.indexOf("/logout") != -1)
    return next();

  res.send("");
});

/*
 * protected routes below
 */

var adminPassword = process.env.ADMIN_PASSWORD
  || Math.random().toString(36).substr(2);
app.use(basicAuth({ 
  users: { 'admin': adminPassword }, 
  challenge: true
}));

app.post('/post', function(req, res) {
  db.post(request.body, function(err, newPost) {
    res.status(200).json(newPost);
  });

  // TODO: allow post to user's other blog on a diff server using auth headers
  //console.log(request.auth);
});

app.get('/posts/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  res.render('pages/posts', {
    'uri': [
      getReqProtocol(req) + "://" + req.headers.host + "/feed/" + index
    ]
  });
});

app.get('/dashboard/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  res.render('pages/posts', {
    'uri': [] // TODO - fill with 'following' feeds
  });
});

app.get('/follow/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  res.render('pages/follow', {
    'following': [] // TODO
  });
});

app.post('/follow', function(req, res) {
  var url = req.body.url;
  // TODO verify that 'url' points to valid feed
  
  db.follow(req.body.url, function(err, newFollow) {
    res.status(200).json(newFollow);
  });
});

app.get('/logout', function (req, res) {
    return res.status(401).end();
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

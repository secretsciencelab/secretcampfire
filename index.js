const express = require('express')
const basicAuth = require('express-basic-auth')
const db = require('./db')
const http = require('http')
const path = require('path')
const PORT = process.env.PORT || 5000

var app = express()
var bodyParser = require('body-parser');

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }));

app.get('/feed/:index?', function (req, res) {
	var index = req.params['index'];

  var feed = {
    'name': req.headers.host, 
    'description': '',
    'avatar_url': '',
    'header_url': '',
    'style_url': '//' + req.headers.host + '/stylesheets/feed.css',
    'posts': []
  };

  db.fetchPosts(index, function(err, docs) {
    feed.posts = docs;
  
    res.setHeader('Content-Type', 'application/json');
    if (index == 0 && (!docs || docs.length == 0))
    {
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
    else
      res.send(JSON.stringify(feed));
  });

	//if (req.params['index'] > 1)
	//{
  //	res.send(JSON.stringify({}));
  //  return;
  //}
})

app.get('/post/:id', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ 
    'path': 'post',
    'params': req.params
  }));
})

app.get('/render/:uri?', function (req, res) {
  uri = '/feed'; //default to own feed
  if (req.params['uri'])
    uri = req.params['uri'];

  res.render('pages/render', {
    'uri': uri
  });
})

// protected routes below

var adminPassword = process.env.ADMIN_PASSWORD 
  || Math.random().toString(36).substr(2);
app.use(basicAuth({ 
  users: { 'admin': adminPassword }, 
  challenge: true
}))

app.post('/post', function(request, response) {
  db.post(request.body, response);

  // TODO: allow post to user's other blog on a diff server using auth headers
  //console.log(request.auth);
});

app.get('/dashboard/:index?', function (req, res) {
  res.render('pages/dashboard', {
  });
})

app.get('/logout', function (req, res) {
    return res.status(401).end();
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))

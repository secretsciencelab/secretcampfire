const cors = require('cors');
const express = require('express')
const basicAuth = require('express-basic-auth')
const bodyParser = require('body-parser')
const db = require('./db')
const http = require('http')
const path = require('path')
const PORT = process.env.PORT || 5000

var app = express();

app.locals.SITE_NAME = "secret campfire";
app.locals.SITE_EMAIL = "kalona@secretcampfire.com";
app.locals.MASTER_URL = "http://secretcampfire.com";
app.locals.NUM_POSTS_PER_FETCH = 10;

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
function getFeedUrl(req) {
  // default to own feed
  return getReqProtocol(req) + '://' + req.headers.host + '/feed';
}

app.get('/feed/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;
  var test = req.query['test'];

  if (test)
  {
    // send sample feed
    res.setHeader('Content-Type', 'application/json');
    res.sendFile("test_feed.json", {root: 'public'});
    return;
  }

  db.getSettings(function(err, settings) {
    db.fetchPosts(index, app.locals.NUM_POSTS_PER_FETCH, function(err, docs) {
      // send page from DB
      var feed = {
        'name': req.headers.host, 
        'description': '',
        'avatar_url': '',
        'header_url': '',
        'style_url': getReqProtocol(req) 
          + '://' + req.headers.host + '/stylesheets/feed.css',
        'posts': docs,
        'blog_url': getReqProtocol(req) + "://" + req.headers.host
      };

      if (settings)
      {
        feed.name = settings.name;
        feed.description = settings.description;
        feed.avatar_url = settings.avatar_url;
        feed.header_url = settings.header_url;
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(feed, null, 2));
    });
  });
});

app.get('/post/:id', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  db.getSettings(function(err, settings) {
    db.getPost(req.params['id'], function(err, post) {
      if (!post)
      {
        res.status(404).send("{}");
        return;
      }

      var ret = {
        'name': req.headers.host, 
        'description': '',
        'avatar_url': '',
        'header_url': '',
        'style_url': getReqProtocol(req) 
          + '://' + req.headers.host + '/stylesheets/feed.css',
        'post': post,
        'blog_url': getReqProtocol(req) + "://" + req.headers.host
      };

      if (settings)
      {
        ret.name = settings.name;
        ret.description = settings.description;
        ret.avatar_url = settings.avatar_url;
        ret.header_url = settings.header_url;
      }

      res.send(JSON.stringify(ret, null, 2));
    });
  });
});

app.get('/render/:uri?', function (req, res) {
  var uri = getFeedUrl(req); // default to own feed
  if (req.params['uri'])
    uri = req.params['uri'];

  res.render('pages/render', {
    'uri': uri
  });
});

app.get('/follow/check/:uri?', function (req, res) {
	var uri = req.params['uri'];
  db.isFollowing(uri, function(err, doc) {
    isFollowing = (doc)? true : false;
    ret = {
      'is_following': isFollowing
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(ret, null, 2));
  });
});

// catch-all route
app.get('*', function (req, res, next) {
  if (req.url.indexOf("/posts") != -1
     || req.url.indexOf("/dashboard") != -1
     || req.url.indexOf("/settings") != -1
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
  db.post(req.body, function(err, newPost) {
    res.status(200).json(newPost);
  });

  // TODO: allow post to user's other blog on a diff server using auth headers
  //console.log(req.auth);
});

app.get('/posts/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  res.render('pages/dashboard', {
    'uri': getFeedUrl(req),
    'render_uris': [
      getFeedUrl(req) + "/" + index
    ]
  });
});

app.get('/dashboard/:page_index?', function(req, res) {
	var pageIndex = req.params['page_index'];
  pageIndex = (pageIndex)? parseInt(pageIndex) : 0;

  db.getRandomFollowing(function(err, follows) {
    followUris = []
    for (var i=0; i < follows.length; i++)
      followUris.push(follows[i].url);

    res.render('pages/dashboard', {
      'uri': getFeedUrl(req),
      'render_uris': followUris,
      'page': pageIndex
    });
  });
});

app.get('/settings', function (req, res) {
  db.getSettings(function(err, settings) {
    res.render('pages/settings', {
      'uri': getFeedUrl(req),
      'settings': settings
    });
  });
});

app.post('/settings', function(req, res) {
  db.saveSettings(req.body, function(err, settings) {
    res.status(200).json(settings);
  });
});

app.post('/follow', function(req, res) {
  var url = req.body.url;
  // TODO verify that 'url' points to valid feed
  
  db.follow(req.body.url, function(err, newFollow) {
    res.status(200).json(newFollow);
  });
});

app.post('/unfollow', function(req, res) {
  // TODO
});

app.get('/following/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  db.getFollowing(index, 100, function(err, follows) {
    res.setHeader('Content-Type', 'application/json');
    ret = {
      'following': follows
    }
    res.send(JSON.stringify(ret, null, 2));
  });
});

app.get('/logout', function (req, res) {
    return res.status(401).end();
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

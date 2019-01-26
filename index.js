const bodyParser = require('body-parser')
const cors = require('cors')
const cel = require('connect-ensure-login')
const express = require('express')
const http = require('http')
const md5 = require('md5');
const path = require('path')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')
const db = require('./db')
const consts = require('./consts')
const PORT = process.env.PORT || 5000

/* 
 * setup passport for auth
 */

passport.use(new LocalStrategy(function(username, password, cb) {
  db.getSettings(function(err, settings) {
    if (err) { return cb(err); }
    if (!settings) { return cb(null, false); }
    if (settings.password != md5(password)) { return cb(null, false); }
    return cb(null, settings);
  });
}));

passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.getSettings(function(err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});

/*
 * setup app
 */

var app = express();

app.locals.SITE_NAME = consts.SITE_NAME;
app.locals.SITE_EMAIL = consts.SITE_EMAIL;
app.locals.MASTER_URL = consts.MASTER_URL;
app.locals.MASTER_DOMAIN = consts.MASTER_DOMAIN;
app.locals.MASTER_FEED = consts.MASTER_FEED;
app.locals.NUM_POSTS_PER_FETCH = consts.NUM_POSTS_PER_FETCH;

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(cors())
  .options('*', cors())
  .use(session({
    secret: app.locals.SITE_NAME, resave: false, saveUninitialized: false 
  }))
  .use(passport.initialize())
  .use(passport.session())

// handle errors
app.use((err, req, res, next) => {
  if (!err)
    return next();

  res.status(500);
  res.send('500: Internal server error');
});

app.get('/', function(req, res) {
  db.getSettings(function(err, settings) {
    if (settings.password == md5("password"))
    {
      res.render('pages/index');
      return;
    }

    res.redirect('/render');
  });
});

app.get('/login', function(req, res) {
  res.render('pages/login', {});
});

app.post('/login', passport.authenticate('local', { 
  successReturnToOrRedirect: '/',
  failureRedirect: '/login' 
}));

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
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

app.get('/is_owner', function (req, res) {
  var isOwner = false;
  if (req.user)
    isOwner = true;

  ret = {
    'is_owner': isOwner
  };

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(ret, null, 2));
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

app.post('/post', cel.ensureLoggedIn(), function(req, res) {
  db.post(req.body, function(err, newPost) {
    res.status(200).json(newPost);
  });

  // TODO: allow post to user's other blog on a diff server
});

app.get('/posts/:index?', cel.ensureLoggedIn(), function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  res.render('pages/dashboard', {
    'uri': getFeedUrl(req),
    'render_uris': [
      getFeedUrl(req) + "/" + index
    ]
  });
});

app.get('/dashboard/:page_index?', cel.ensureLoggedIn(), function(req, res) {
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

app.get('/settings', cel.ensureLoggedIn(), function (req, res) {
  db.getSettings(function(err, settings) {
    res.render('pages/settings', {
      'uri': getFeedUrl(req),
      'settings': settings
    });
  });
});

app.post('/settings', cel.ensureLoggedIn(), function(req, res) {
  db.saveSettings(req.body, function(err, settings) {
    res.status(200).json(settings);
  });
});

app.post('/follow', cel.ensureLoggedIn(), function(req, res) {
  var url = req.body.url;
  // TODO verify that 'url' points to valid feed
  
  db.follow(req.body.url, function(err, newFollow) {
    res.status(200).json(newFollow);
  });
});

app.post('/unfollow', cel.ensureLoggedIn(), function(req, res) {
  var url = req.body.url;

  db.unfollow(url, function(err) {
    res.status(200).json({ });
  });
});

app.get('/following/:index?', cel.ensureLoggedIn(), function (req, res) {
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

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

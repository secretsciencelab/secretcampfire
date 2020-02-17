require('dotenv').config()
const bodyParser = require('body-parser')
const cors = require('cors')
const cel = require('connect-ensure-login')
const express = require('express')
const md5 = require('md5')
const path = require('path')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const request = require('request')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const URL = require('url').URL
const db = require('./db')
const consts = require('./consts')
const cron = require('./cron')
const favicon = require('serve-favicon');

const PORT = process.env.PORT || 5000

var app = express();

app.locals.SITE_NAME = consts.SITE_NAME;
app.locals.SITE_EMAIL = consts.SITE_EMAIL;
app.locals.MASTER_URL = consts.MASTER_URL;
app.locals.MASTER_DOMAIN = consts.MASTER_DOMAIN;
app.locals.MASTER_FEED = consts.MASTER_FEED;
app.locals.MASTER_NEWS = consts.MASTER_NEWS;
app.locals.BLESSED_DOMAINS = consts.BLESSED_DOMAINS;
app.locals.NUM_POSTS_PER_FETCH = consts.NUM_POSTS_PER_FETCH;
app.locals.DARK_MODE_CSS = consts.DARK_MODE_CSS;

function _getReqProtocol(req) {
  return req.headers['x-forwarded-proto'] || req.protocol;
}

function _getDbNameFromHostUrl(host) {
  if (!host)
    return "";

  var urlObj = new URL(host);
  var name = urlObj.host.split('.')[0];
  name = name.toLowerCase();
  name = name.replace(/-/g, '_');

  return name;
}

function _getDbNameFromRequest(req, cb) {
  var dbName = _getDbNameFromHostUrl(
    _getReqProtocol(req) + '://' + req.headers.host);

  db.getEnv("MONGODB_URI_" + dbName, function(val) {
    if (val) {
      cb(dbName);
      return;
    }

    // fallback to default (standalone mode)
    cb("");
  });
}

function _getUploadKeyFromRequest(req, cb) {
  var name = _getDbNameFromHostUrl(
    _getReqProtocol(req) + '://' + req.headers.host);

  db.getEnv("HOME_UPLOAD_KEY_" + name, function(val) {
    if (val) {
      cb(val);
      return;
    }

    cb(process.env.HOME_UPLOAD_KEY);
  });
}

/* 
 * setup passport for authentication
 */

passport.use(new LocalStrategy({
    passReqToCallback: true
  }, 
  function(req, username, password, cb) {
    _getDbNameFromRequest(req, function(dbName) {
      db.getSettings(function(err, settings) {
        if (err) { return cb(err); }
        if (!settings) { return cb(null, false); }
        if (settings.password != md5(password)) { return cb(null, false); }
        return cb(null, settings);
      }, dbName);
    });
  }
));

passport.serializeUser(function(req, user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(req, id, cb) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getSettings(function(err, user) {
      if (err) { return cb(err); }
      cb(null, user);
    }, dbName);
  });
});

app
  .use(favicon(__dirname + '/public/favicon.ico'))
  .use(cors())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(session({
    secret: app.locals.SITE_NAME, 
    resave: false, 
    saveUninitialized: false,
    store: new MongoStore({ 
      url: process.env.MONGODB_URI,
      touchAfter: 6 * 3600 // time period in seconds
    })
  }))
  .use(passport.initialize())
  .use(passport.session())

// redirect to https if we know our environment supports it
app.use((req, res, next) => {
  if (process.env.NODE_ENV  == 'production'
    && req.headers['x-forwarded-proto'] != 'https') 
  {
    res.redirect(302, 'https://' + req.hostname + req.originalUrl);
    return;
  }

  next();
});

// handle errors
app.use((err, req, res, next) => {
  if (!err)
    return next();

  res.status(500);
  res.send('500: Internal server error');
});

function _decodeScampyUriParam(uri) { 
  if (!uri)
    return uri;
  return uri.replace(/\|/g, '/');
}

function _getFeedUrl(req) {
  // default to own feed
  return _getReqProtocol(req) + '://' + req.headers.host + '/feed';
}
function _getLikeFeedUrl(req) {
  // default to own feed
  return _getReqProtocol(req) + '://' + req.headers.host + '/dashboard/likefeed';
}
function _getQueueFeedUrl(req) {
  // default to own feed
  return _getReqProtocol(req) + '://' + req.headers.host + '/dashboard/qfeed';
}
function _render(req, res, myuri) {
  var uri = _getFeedUrl(req); // default to own feed
  if (myuri)
  {
    if (/^\d+$/.test(myuri))
    {
      // all digits = offset into own feed
      uri += "/" + myuri;
    }
    else
      uri = myuri;
  }

  uri = _decodeScampyUriParam(uri);
  if (uri.indexOf("http") == -1)
  {
    // convert relative paths to absolute paths
    uri = _getReqProtocol(req) + '://' + req.headers.host + uri
  }

  _assembleFeed(req, {}, function(siteTemplate) {
    res.render('pages/render', {
      'uri': uri,
      'fullscreen': req.query['fullscreen'],
      'random': req.query['random'],
      'site_template': siteTemplate
    });
  });
}
function _nocache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

app.get('/', function(req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getSettings(function(err, settings) {
      if (settings.password == md5("password"))
      {
        res.render('pages/index');
        return;
      }

      _render(req, res);
    }, dbName);
  });
});

function _assembleFeed(req, contents, cb) {
  _getDbNameFromRequest(req, function(dbName) {
    var host = req.headers.host;

    if (req.query['host'])
    {
      const hostUrl = req.query['host'];
      dbName = _getDbNameFromHostUrl(hostUrl);
      var urlObj = new URL(hostUrl);
      host = urlObj.host;
    }

    db.getSettings(function(err, settings) {
      var feed = {
        'name': host, 
        'description': '',
        'avatar_url': '',
        'header_url': '',
        'style_url': _getReqProtocol(req) + '://' + host 
                        + '/stylesheets/feed.css',
        'blog_url': _getReqProtocol(req) + "://" + host,
        'nsfw': false,
        'dark_mode': false
      };

      if (settings)
      {
        feed.name = settings.name;
        feed.description = settings.description;
        feed.avatar_url = settings.avatar_url;
        feed.header_url = settings.header_url;
        feed.nsfw = (settings.nsfw)? true : false;
        feed.custom_head = (settings.custom_head)? settings.custom_head : "";
        feed.dark_mode = (settings.dark_mode)? true : false;
      }

      for (k in contents)
        feed[k] = contents[k];

      cb(feed);
    }, dbName);
  });
}

app.get('/feed/:index?', function (req, res) {
  var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  var numToFetch = app.locals.NUM_POSTS_PER_FETCH;
  if (req.query['n'])
    numToFetch = parseInt(req.query['n']);

  filter = {};
  if (req.query['tag'])
    filter['tags'] = { '$regex': req.query['tag'], '$options': 'i' };

  _getDbNameFromRequest(req, function(dbName) {
    /*
     * 'host' param can be optionally passed to ask this server to
     * return the feed of the specified host. This server will connect
     * directly to the host's DB using credentials in .env
     * For use in a multi-tenant scenario, e.g. if this server is functioning 
     * as a proxy server for various hosts.
     */
    if (req.query['host'])
      dbName = _getDbNameFromHostUrl(req.query['host']);

    // send a page from DB
    var options = {
      'index': index,
      'limit': numToFetch,
      'filter': filter
    };
    if (req.query['random'])
      options['random'] = true;

    db.fetchPosts(options, function(err, posts) {
      _assembleFeed(req, { 'posts': posts }, function(feed) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(feed, null, 2));
      });
    }, dbName);

    if (index == 0)
      db.addFollower(req.headers.referer, dbName);
  });
});

app.get('/follow/check/:uri?', function (req, res) {
  var uri = _decodeScampyUriParam(req.params['uri']);
  _getDbNameFromRequest(req, function(dbName) {
    db.isFollowing(uri, function(err, doc) {
      isFollowing = (doc)? true : false;
      ret = {
        'is_following': isFollowing
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/followers/count', function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getFollowersCount(function(err, num) {
      ret = {
        'n': num
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/followers/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  _getDbNameFromRequest(req, function(dbName) {
    db.getFollowers(index, 100, function(err, followers) {
      res.setHeader('Content-Type', 'application/json');
      ret = {
        'followers': followers
      }
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/following/count', function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getFollowingCount(function(err, num) {
      ret = {
        'n': num
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/following/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  _getDbNameFromRequest(req, function(dbName) {
    db.getFollowing(index, 100, function(err, follows) {
      res.setHeader('Content-Type', 'application/json');
      ret = {
        'following': follows
      }
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get(['/is_connected', '/is_owner'], function (req, res) {
  var isConnected = false;
  if (req.user)
    isConnected = true;
  ret = {
    'is_owner': isConnected,
    'is_connected' : isConnected
  };
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(ret, null, 2));
});

app.get('/like/check/:uri?', function (req, res) {
  var uri = _decodeScampyUriParam(req.params['uri']);
  _getDbNameFromRequest(req, function(dbName) {
    db.isLiked(uri, function(err, doc) {
      isLiked = (doc)? true : false;
      ret = {
        'is_liked': isLiked
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/login', function(req, res) {
  res.render('pages/login', {
    'uri': _getFeedUrl(req)
  });
});

app.post('/login', passport.authenticate('local', { 
  successReturnToOrRedirect: '/dashboard',
  failureRedirect: '/login?error=1' 
}));

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/post/sources/count', function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getPostSourcesCount(function(err, num) {
      ret = {
        'n': num
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/post/sources/:index?', function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  _getDbNameFromRequest(req, function(dbName) {
    db.getPostSources(index, 100, function(err, sources) {
      res.setHeader('Content-Type', 'application/json');
      ret = {
        'sources': sources
      }
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/post/count', function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getPostCount(function(err, num) {
      ret = {
        'n': num
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/post/:id', function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getPost(req.params['id'], function(err, post) {
      if (!post)
      {
        res.status(404).send("{}");
        return;
      }

      _assembleFeed(req, { 'post': post }, function(feed) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(feed, null, 2));
      });
    }, dbName);
  });
});

app.get('/render/:uri?', function (req, res) {
  _render(req, res, req.params['uri']);
});

app.get('/tags', function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getHotTags(function(err, tags) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(tags, null, 2));
    }, dbName);
  });
});

app.get('/tag/:tag/:index?', function (req, res) {
  var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  uri = _getFeedUrl(req) 
    + "/" + index
    + "?tag=" + req.params['tag'];

  _render(req, res, uri);
});

// catch-all route
app.get('*', function (req, res, next) {
  if (req.url.indexOf("/dashboard") != -1
    || req.url.indexOf("/follow") != -1
    || req.url.indexOf("/like") != -1
    || req.url.indexOf("/logout") != -1
    || req.url.indexOf("/settings") != -1)
    return next();

  res.send("");
});

/*
 * protected routes below
 */

function _cronRun(dbName) {
  try {
    var options = {
      'index': 0,
      'limit': 1,
      'filter': {}
    };
    db.getSettings(function(err, settings) {
      db.fetchQueuedPosts(options, function(err, posts) {
        if (!posts || posts.length == 0)
          return;

        db.getLastCronExecTime("post_from_queue", function(lastExecTime) {
          var diffMs = Date.now() - lastExecTime;
          var diffMins = diffMs / 60000;
          if (diffMins < settings.queue_interval)
            return;

          db.updateLastCronExecTime("post_from_queue", dbName);
          var post = posts[0];
          post.queued = false;
          post.date = Date.now();
          post.save();
        }, dbName);
      }, dbName);
    }, dbName);
  }
  catch(err) {
    console.error(err);
  }
}

function _cronActivatePostQueue(interval) {
  console.log("[cron] auto-posting from queue every " 
    + interval + " minute(s)");

  cron.addTask("post_from_queue", interval, function() {
    // run cron for the default DB
    _cronRun("");

    // run cron for aux DBs
    db.getEnvs("MONGODB_URI_", function(envs) {
      for (var i=0; i < envs.length; i++) {
        const pfx = "MONGODB_URI_";
        const name = envs[i].key.substring(pfx.length);
        _cronRun(name);
      }
    });
  }, /*runNow=*/true);
}
function _cronDeactivatePostQueue() {
  console.log("[cron] auto-post queue disabled");
  cron.delTask("post_from_queue");
}

app.post('/post', cel.ensureLoggedIn(), function(req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.post(req.body, function(err, newPost) {
      res.status(200).json(newPost);
    }, dbName);
  });
});

app.post('/post/delete', cel.ensureLoggedIn(), function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.delPost(req.body.id, function(err) {
      res.status(200).json({'status': err});
    }, dbName);
  });
});

app.post('/post/now', cel.ensureLoggedIn(), function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.postNow(req.body.id, function(err, post) {
      res.status(200).json(post);
    }, dbName);
  });
});

app.get('/dashboard/posts/:index?', cel.ensureLoggedIn(), function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  _getUploadKeyFromRequest(req, function(uploadKey) {
    _assembleFeed(req, {}, function(siteTemplate) {
      res.render('pages/dashboard', {
        'uri': _getFeedUrl(req),
        'render_uris': [
          _getFeedUrl(req) + "/" + index
        ],
        'home_upload_key': uploadKey,
        'site_template': siteTemplate
      });
    });
  });
});

app.get('/dashboard/likefeed/:index?', 
  [_nocache, cel.ensureLoggedIn()], function (req, res) {
  var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  // send a page from DB
  var options = {
    'index': index,
    'limit': app.locals.NUM_POSTS_PER_FETCH,
    'filter': {}
  };
  _getDbNameFromRequest(req, function(dbName) {
    db.fetchLikes(options, function(err, posts) {
      _assembleFeed(req, { 'posts' : posts }, function(feed) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(feed, null, 2));
      });
    }, dbName);
  });
});

app.get('/dashboard/qfeed/:index?', 
  [_nocache, cel.ensureLoggedIn()], function (req, res) {
  var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  // send a page from DB
  var options = {
    'index': index,
    'limit': app.locals.NUM_POSTS_PER_FETCH,
    'filter': {}
  };
  _getDbNameFromRequest(req, function(dbName) {
    db.fetchQueuedPosts(options, function(err, posts) {
      _assembleFeed(req, { 'posts' : posts }, function(feed) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(feed, null, 2));
      });
    }, dbName);
  });
});

app.get('/dashboard/likes/:index?', cel.ensureLoggedIn(), function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  _getUploadKeyFromRequest(req, function(uploadKey) {
    _assembleFeed(req, {}, function(siteTemplate) {
      res.render('pages/dashboard', {
        'uri': _getLikeFeedUrl(req),
        'render_uris': [
          _getLikeFeedUrl(req) + "/" + index
        ],
        'home_upload_key': uploadKey,
        'site_template': siteTemplate
      });
    });
  });
});

app.get('/dashboard/queue/count', cel.ensureLoggedIn(), function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getQueuedCount(function(err, num) {
      ret = {
        'n': num
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(ret, null, 2));
    }, dbName);
  });
});

app.get('/dashboard/queue/:index?', cel.ensureLoggedIn(), function (req, res) {
	var index = req.params['index'];
  index = (index)? parseInt(index) : 0;

  _getUploadKeyFromRequest(req, function(uploadKey) {
    _assembleFeed(req, {}, function(siteTemplate) {
      res.render('pages/dashboard', {
        'uri': _getQueueFeedUrl(req),
        'render_uris': [
          _getQueueFeedUrl(req) + "/" + index
        ],
        'home_upload_key': uploadKey,
        'site_template': siteTemplate
      });
    });
  });
});

app.get('/dashboard/:start_offset?', cel.ensureLoggedIn(), function(req, res) {
	var startOffset = req.params['start_offset'];
  startOffset = (startOffset)? parseInt(startOffset) : 0;

  _getDbNameFromRequest(req, function(dbName) {
    db.getRandomFollowing(function(err, follows) {
      followUris = []
      for (var i=0; i < follows.length; i++)
      {
        var url = follows[i].url + "/" + startOffset;

        //if (url.indexOf(consts.MASTER_DOMAIN) != -1)
        //{
        //  // reroute official blogs to proxy feed server for performance
        //  url = consts.MASTER_FEED_PROXY + "/feed/" + startOffset
        //    + "?host=" + encodeURIComponent(url);
        //}

        followUris.push(url);
      }

      _getUploadKeyFromRequest(req, function(uploadKey) {
        _assembleFeed(req, {}, function(siteTemplate) {
          res.render('pages/dashboard', {
            'uri': _getFeedUrl(req),
            'render_uris': followUris,
            'home_upload_key': uploadKey,
            'site_template': siteTemplate
          });
        });
      });
    }, dbName);
  });
});

app.get('/settings', cel.ensureLoggedIn(), function (req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.getSettings(function(err, settings) {
      if (req.query['json'])
      {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(settings, null, 2));
        return;
      }

      _getUploadKeyFromRequest(req, function(uploadKey) {
        _assembleFeed(req, {}, function(siteTemplate) {
          res.render('pages/settings', {
            'uri': _getFeedUrl(req),
            'settings': settings,
            'home_upload_key': uploadKey,
            'site_template': siteTemplate
          });
        });
      });
    }, dbName);
  });
});

app.post('/settings', cel.ensureLoggedIn(), function(req, res) {
  _getDbNameFromRequest(req, function(dbName) {
    db.saveSettings(req.body, function(err, settings) {
      db.getEnvsCount("MONGODB_URI_", function(count) {
        if (count > 0)
          return; // toggle cron on/off only if this is a standalone site

        if (settings && settings.queue_interval)
          _cronActivatePostQueue(settings.queue_interval);
        else
          _cronDeactivatePostQueue();
      });

      res.status(200).json(settings);
    }, dbName);
  });
});

app.post('/like', cel.ensureLoggedIn(), function(req, res) {
  try {
    var url = req.body.url;
    if (!url || url.indexOf('/post/') == -1)
    {
      res.status(500).send("{}");
      return;
    }

    request(url, { json: true }, function(e, r, data) {
      if (e || !data || !data.post)
      {
        console.error("/like error: ", e);
        res.status(500).send("{}");
        return;
      }

      _getDbNameFromRequest(req, function(dbName) {
        db.addToLikes(url, data, function(err, newLike) {
          res.status(200).json(newLike);
        }, dbName);
      });
    });
  } catch(err) {
    console.error(err);
    res.status(500).send("{}");
  }
});

app.post('/like/delete', cel.ensureLoggedIn(), function(req, res) {
  var url = req.body.url;
  if (url.indexOf('/post/') == -1)
  {
    res.status(500).send("{}");
    return;
  }
  
  _getDbNameFromRequest(req, function(dbName) {
    db.delFromLikes(url, function(err) {
      res.status(200).json({});
    }, dbName);
  });
});

app.post('/follow', cel.ensureLoggedIn(), function(req, res) {
  var url = req.body.url;
  
  _getDbNameFromRequest(req, function(dbName) {
    db.follow(req.body.url, function(err, newFollow) {
      res.status(200).json(newFollow);
    }, dbName);
  });
});

app.post('/unfollow', cel.ensureLoggedIn(), function(req, res) {
  var url = req.body.url;

  _getDbNameFromRequest(req, function(dbName) {
    db.unfollow(url, function(err) {
      res.status(200).json({ });
    }, dbName);
  });
});

/*
 * add cron tasks
 */
db.getSettings(function(err, settings) {
  if (settings.queue_interval)
    _cronActivatePostQueue(settings.queue_interval);
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

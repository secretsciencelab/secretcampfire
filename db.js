(function() {
    const mongoose = require('mongoose');
    const normalizeUrl = require('normalize-url');
    const md5 = require('md5');
    const URL = require('url').URL;
    const consts = require('./consts');

    /* Schema */

    const SettingsSchema = new mongoose.Schema({
      id: String,
      name: String,
      description: String,
      avatar_url: String,
      header_url: String,
      style_url: String,
      password: String,
      nsfw: Boolean,
      imgur_key: String,
      queue_interval: { type: Number, default: 0 }
    });

    const PostSchema = new mongoose.Schema({
      id: String,
      title: String,
      date: { type: Date, default: Date.now },
      thumbs: [String],
      images: [String],
      urls: [String],
      text: String,
      tags: [String],
      post_url: String,
      re_url: String,
      queued: { type: Boolean, default: false }
    });

    // collections:
    // - follows
    // - followers
    // - postsources
    const FollowSchema = new mongoose.Schema({
      id: String,
      date: { type: Date, default: Date.now },
      url_key: { type: String, unique: true },
      url: { type: String },
      name: String,
      notes: String,
      count: { type: Number, default: 0 }
    });

    const _schema = {
      'Settings': SettingsSchema,
      'Post': PostSchema,
      'Follow': FollowSchema,
      'Follower': FollowSchema,
      'PostSource': FollowSchema
    };

    /* 
     * Connections 
     */

    var _dbs = {};

    function _Model(modelName, dbName) {
      const defaultName = "_default_";
      if (!dbName)
        dbName = defaultName;

      if (!(dbName in _dbs))
      {
        // open new connection
        var envKey = "MONGODB_URI";
        if (dbName != defaultName)
          envKey += "_" + dbName;

        if (!(envKey in process.env))
          return null;

        var newConn = mongoose.createConnection(process.env[envKey],
          { useNewUrlParser: true }, function (error) {
            if (error) console.error(error);
            else console.log('Connected DB ' + dbName);
          });
        _dbs[dbName] = newConn;
      }

      return _dbs[dbName].model(modelName, _schema[modelName]);
    }

    /* 
     * post
     */

    function _makeArray(x) {
      return Array.isArray(x)? x : [x];
    }

    function _makeUrlKey(url) {
      // normalize url to make url_key
      return normalizeUrl(url, {
        stripHash: true,
        stripProtocol: true
      });
    }

    function _addPostSource(url) {
      if (!url || url.indexOf('http') == -1)
        return;

      try {
        var urlObj = new URL(url);
        var hostUrl = urlObj.protocol + "//" + urlObj.host;
        var hostUrlKey = _makeUrlKey(hostUrl);

        _Model('PostSource')
          .findOne({ 'url_key': hostUrlKey }, function(err, source) {
          if (source)
          {
            source.date = Date.now();
            source.notes = url;
            source.count += 1;
          }
          else
          {
            source = new _Model('PostSource')({
              url_key: hostUrlKey,
              url: hostUrl,
              notes: url
            });
            source.id = source._id;
          }

          source.save();
        });
      }
      catch(err) {
        console.error(err);
      }
    }

    module.exports.post = function(postData, cb) {
      try {
        // sanitize inputs
        if (postData.thumbs)
          postData.thumbs = _makeArray(postData.thumbs);
        if (postData.images)
          postData.images = _makeArray(postData.images);
        if (postData.urls)
          postData.urls = _makeArray(postData.urls);
        if (postData.tags)
        {
          postData.tags = postData.tags.replace(/[^A-Za-z0-9_, ]/g, '');
          postData.tags = postData.tags.split(/(?:,| )+/);
        }
        postData.queued = (postData.queued)? true : false;

        if (postData.update_id) 
        {
          // update existing post
          var id = postData.update_id;
          delete postData.update_id;
          if (postData.re_url)
            delete postData.re_url; // don't allow this to change

          _Model('Post').findById(id, function(err, post) {
            if (!post)
            {
              if (err)
                console.error(err);
              if (cb)
                cb(err, {});
              return;
            }

            for (k in postData)
              post[k] = postData[k];

            post.save(function(err) {
              if (err)
                console.error(err);
              if (cb)
                cb(err, post);
            });
          });
        }
        else
        {
          // new post
          var newPost = new _Model('Post')(postData);
          newPost.id = newPost._id;
          newPost.post_url = "/post/" + newPost.id
          newPost.save(function(err) {
            if (err)
              console.error(err);
            if (cb)
              cb(err, newPost);
          });

          if (newPost.re_url && /\S/.test(newPost.re_url)) 
            _addPostSource(newPost.re_url); 
        }
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.getPost = function(id, cb) {
      _Model('Post').findById(id, cb);
    }

    module.exports.delPost = function(id, cb) {
      _Model('Post').deleteOne({'id': id}, function(err) {
        if (cb)
          cb(err);
      });
    }

    module.exports.postNow = function(id, cb) {
      _Model('Post').findById(id, function(err, post) {
        if (!post)
        {
          if (cb)
            cb(err, {});
          return;
        }

        if (post.queued == false)
        {
          if (cb)
            cb(err, post);
          return;
        }

        post.queued = false;
        post.date = Date.now();
        post.save(function(err) {
          if (cb)
            cb(err, post);
        });
      });
    }

    module.exports.getPostCount = function(cb) {
      _Model('Post').count({ 'queued': { "$ne": true } }, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }
    module.exports.getQueuedCount = function(cb) {
      _Model('Post').count({ 'queued': true }, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    /* 
     * feed
     */

    function _fetchPosts(index, limit, filter, order, cb) {
      try {
        if (index == 0)
          index = undefined;
        _Model('Post').find(filter)
          .skip(index)
          .limit(limit)
          .sort({'date': order })
          .exec(cb);
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, []);
      }
    }

    module.exports.fetchPosts = function(index, limit, filter, cb) {
      var _filter = { 'queued': { "$ne": true } };
      _filter = Object.assign(_filter, filter);
      _fetchPosts(index, limit, _filter, -1, cb);
    }
    module.exports.fetchQueuedPosts = function(index, limit, filter, cb) {
      var _filter = { 'queued': true };
      _filter = Object.assign(_filter, filter);  
      _fetchPosts(index, limit, _filter, 1, cb);
    }

    /*
     * networking
     */

    module.exports.follow = function(url, cb) {
      try {
        var newFollow = new _Model('Follow')({
          url_key: _makeUrlKey(url),
          url: url
        });
        newFollow.id = newFollow._id;

        newFollow.save(function (err) {
          if (cb)
            cb(err, newFollow);
        });
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.unfollow = function(url, cb) {
      try {
        _Model('Follow').deleteMany({
          'url_key': _makeUrlKey(url)
        }, function(err) {
          if (cb)
            cb(err);
        });
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err);
      }
    }

    module.exports.isFollowing = function(url, cb) {
      try {
        _Model('Follow').findOne({
          'url_key': _makeUrlKey(url)
        }, function(err, doc) {
          if (cb)
            cb(err, doc);
        });
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, null);
      }
    }

    module.exports.getFollowing = function(index, limit, cb) {
        if (index == 0)
          index = undefined;
        _Model('Follow').find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getFollowingCount = function(cb) {
      _Model('Follow').count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    module.exports.getRandomFollowing = function(cb) {
      _Model('Follow').aggregate([{
        $sample: { size: 100 }
      }], 
      function(err, follows) {
        if (cb)
          cb(err, follows);
      });
    }

    module.exports.addFollower = function(url, cb) {
      if (!url || url.indexOf('http') == -1
        || url.indexOf('/dashboard') == -1) /* only count as follower if 
                                             * fetch was from /dashboard */
      {
        if (cb)
          cb(null, null);
        return;
      }

      try {
        var urlObj = new URL(url);
        var hostUrl = urlObj.protocol + "//" + urlObj.host;
        var hostUrlKey = _makeUrlKey(hostUrl);

        _Model('Follower').findOne({ 'url_key': hostUrlKey }, function(err, follower) {
          if (follower)
          {
            follower.date = Date.now();
            follower.notes = url;
          }
          else
          {
            follower = new _Model('Follower')({
              url_key: hostUrlKey,
              url: hostUrl,
              notes: url
            });
            follower.id = follower._id;
          }

          follower.save(function (err) {
            if (cb)
              cb(err, follower);
          });
        });

      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.getFollowers = function(index, limit, cb) {
        if (index == 0)
          index = undefined;
        _Model('Follower').find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getFollowersCount = function(cb) {
      _Model('Follower').count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    module.exports.getPostSources = function(index, limit, cb) {
        if (index == 0)
          index = undefined;
        _Model('PostSource').find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getPostSourcesCount = function(cb) {
      _Model('PostSource').count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    /*
     * blog
     */
    module.exports.getSettings = function(cb) {
      try {
        _Model('Settings').findOne().sort({created_at: -1})
          .exec(function(err, settings) {
            if (settings)
            {
              // return existing
              if (cb)
                cb(err, settings);
              return;
            }

            // welcome new user! 
            // make new Settings entry
            settings = new _Model('Settings')();
            settings.id = settings._id;
            settings.password = md5("password");

            settings.save(function(err) {
              if (cb)
                cb(err, settings)
            });

            // follow "staff" blog to start
            module.exports.follow(consts.MASTER_FEED, null);
          });
      } 
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.saveSettings = function(newSettings, cb) {
      module.exports.getSettings(function(err, settings) {
        settings.name = newSettings.name;  
        settings.description = newSettings.description;  
        settings.avatar_url = newSettings.avatar_url;  
        settings.header_url = newSettings.header_url;  
        settings.nsfw = newSettings.nsfw;
        settings.imgur_key = newSettings.imgur_key;
        settings.queue_interval = newSettings.queue_interval;
        if (newSettings.password)
          settings.password = md5(newSettings.password);
        
        settings.save(function(err) {
          if (cb)
            cb(err, settings);
        });
      });
    }

    /*
     * cron
     */
    module.exports.addCronTask = function(name, cb) {
      try {
        var newTask = new CronTask({
          name: name
        });
        newTask.id = newTask._id;
        newTask.save(function(err, task) {
          if (cb)
            cb(err, task);
        });
      }
      catch(err) {
        console.info(err);
        if (cb)
          cb(err, {});
      }
    }
    module.exports.delCronTask = function(name, cb) {
      CronTask.deleteOne({'name': name}, function(err) {
        if (cb)
          cb(err);
      });
    }
    module.exports.getCronTask = function(name, cb) {
      CronTask.findOne({ 'name': name }, function(err, task) {
        if (cb)
          cb(err, task);
      });
    }
    module.exports.updateCronTaskLastRunTime = function(name) {
      CronTask.findOne({ 'name': name }, function(err, task) {
        if (!task)
          return;

        task.last_run = Date.now();
        task.save();
      });
    }

}());

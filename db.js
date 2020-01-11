(function() {
    const mongoose = require('mongoose');
    const mongooseExtendSchema = require('mongoose-extend-schema');
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
      queue_interval: { type: Number, default: 60 },
      dark_mode: { type: Boolean, default: false },
      custom_head: String
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
    const LikeSchema = new mongooseExtendSchema(PostSchema, {
      url_key: { type: String, unique: true },
      source_url: String,
      avatar_url: String,
      blog_url: String,
    });

    const FollowSchema = new mongoose.Schema({
      id: String,
      date: { type: Date, default: Date.now },
      url_key: { type: String, unique: true },
      url: { type: String },
      name: String,
      notes: String,
      count: { type: Number, default: 0 }
    });

    const NoteSchema = new mongoose.Schema({
      id: String,
      date: { type: Date, default: Date.now },
      type: { type: String, enum: ['like', 'reblog'] },
      url_key: { type: String, unique: true },
      url: { type: String }, // relative pathname without host
      visitor: { type: String }
    });

    const ThingSchema = new mongoose.Schema({
      id: String,
      date: { type: Date, default: Date.now },
      key: String,
      val: String
    });

    const _schema = {
      'Settings': SettingsSchema,
      'Post': PostSchema,
      'Follow': FollowSchema,
      'Follower': FollowSchema,
      'PostSource': FollowSchema,
      'Like': LikeSchema,
      'Note': NoteSchema,
      'Housekeeping': ThingSchema
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
          { useNewUrlParser: true, useCreateIndex: true }, function (error) {
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
      if (Array.isArray(x))
          return x;

      return x.split(",");
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
      } catch(err) {
        console.error(err);
      }
    }

    module.exports.post = function(postData, cb, dbName) {
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

          _Model('Post', dbName).findById(id, function(err, post) {
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
          var newPost = new _Model('Post', dbName)(postData);
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

    module.exports.getPost = function(id, cb, dbName) {
      _Model('Post', dbName).findById(id, cb);
    }

    module.exports.delPost = function(id, cb, dbName) {
      _Model('Post', dbName).deleteOne({'id': id}, function(err) {
        if (cb)
          cb(err);
      });
    }

    module.exports.postNow = function(id, cb, dbName) {
      _Model('Post', dbName).findById(id, function(err, post) {
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

    module.exports.getPostCount = function(cb, dbName) {
      _Model('Post', dbName).count({ 'queued': { "$ne": true } }, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }
    module.exports.getQueuedCount = function(cb, dbName) {
      _Model('Post', dbName).count({ 'queued': true }, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    module.exports.getHotTags = function(cb, dbName) {
      _Model('Post', dbName).aggregate([
        { "$match": { "queued": { "$ne": true } } },
        { "$unwind": "$tags" },
        { "$group": { "_id": { "$toLower": "$tags" }, "count": {"$sum":1} } },
        { "$match": { "_id": { "$ne": "" } } },
        { "$sort": {"count": -1} },
        { "$limit": 10 }
      ],
      function(err, results) {
        if (cb)
          cb(err, results);
      });
    };

    /* 
     * feed
     */

    function _fetchPosts(options, cb, dbName) {
      try {
        const index = (options.index == 0)? undefined : options.index;
        const limit = options.limit; 
        const filter = options.filter;
        const order = options.order;

        _Model('Post', dbName).find(filter)
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

    module.exports.fetchPosts = function(options, cb, dbName) {
      var _filter = { 'queued': { "$ne": true } };
      options.filter = Object.assign(options.filter, _filter);
      options.order = -1;
      _fetchPosts(options, cb, dbName);
    }
    module.exports.fetchQueuedPosts = function(options, cb, dbName) {
      var _filter = { 'queued': true };
      options.filter = Object.assign(options.filter, _filter);
      options.order = 1;
      _fetchPosts(options, cb, dbName);
    }

    /*
     * networking
     */

    module.exports.follow = function(url, cb, dbName) {
      try {
        var newFollow = new _Model('Follow', dbName)({
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

    module.exports.unfollow = function(url, cb, dbName) {
      try {
        _Model('Follow', dbName).deleteMany({
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

    module.exports.isFollowing = function(url, cb, dbName) {
      try {
        _Model('Follow', dbName).findOne({
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

    module.exports.getFollowing = function(index, limit, cb, dbName) {
        if (index == 0)
          index = undefined;
        _Model('Follow', dbName).find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getFollowingCount = function(cb, dbName) {
      _Model('Follow', dbName).count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    module.exports.getRandomFollowing = function(cb, dbName) {
      _Model('Follow', dbName).aggregate([{
        $sample: { size: 100 }
      }], 
      function(err, follows) {
        if (cb)
          cb(err, follows);
      });
    }

    module.exports.addFollower = function(url, dbName) {
      if (!url || url.indexOf('http') == -1
        || url.indexOf('/dashboard') == -1) /* only count as follower if 
                                             * fetch was from /dashboard */
        return;

      try {
        var urlObj = new URL(url);
        var hostUrl = urlObj.protocol + "//" + urlObj.host;
        var hostUrlKey = _makeUrlKey(hostUrl);

        _Model('Follower', dbName)
          .findOne({ 'url_key': hostUrlKey }, function(err, follower) {
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
          });
        });

      }
      catch(err) {
        console.error(err);
      }
    }

    module.exports.getFollowers = function(index, limit, cb, dbName) {
        if (index == 0)
          index = undefined;
        _Model('Follower', dbName).find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getFollowersCount = function(cb, dbName) {
      _Model('Follower', dbName).count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    module.exports.getPostSources = function(index, limit, cb, dbName) {
        if (index == 0)
          index = undefined;
        _Model('PostSource', dbName).find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getPostSourcesCount = function(cb, dbName) {
      _Model('PostSource', dbName).count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    /*
     * likes
     */

    module.exports.isLiked = function(url, cb, dbName) {
      try {
        _Model('Like', dbName).findOne({
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

    module.exports.addToLikes = function(url, data, cb, dbName) {
      try {
        var urlKey = _makeUrlKey(url);

        // cache original post contents so we can display liked posts
        // without having to fetch each one from the source
        like = new _Model('Like', dbName)({
          url_key: urlKey,
          source_url: url,
          avatar_url: data.avatar_url,
          blog_url: data.blog_url,
          title: data.post.title,
          thumbs: data.post.thumbs,
          images: data.post.images,
          urls: data.post.urls,
          text: data.post.text,
          tags: data.post.tags,
          post_url: data.post.post_url,
          re_url: data.post.re_url
        });
        like.id = like._id;

        like.save(function(err) {
          if (cb)
            cb(err, like);
        });
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.delFromLikes = function(url, cb, dbName) {
      try {
        var urlKey = _makeUrlKey(url);
        _Model('Like', dbName).deleteOne({'url_key': urlKey}, function(err) {
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

    module.exports.fetchLikes = function(options, cb, dbName) {
      try {
        const index = (options.index == 0)? undefined : options.index;
        const limit = options.limit; 
        const filter = options.filter;

        _Model('Like', dbName).find(filter)
          .skip(index)
          .limit(limit)
          .sort({'date': -1 })
          .exec(cb);
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, []);
      }
    }

    /*
     * blog
     */
    module.exports.getSettings = function(cb, dbName) {
      try {
        _Model('Settings', dbName).findOne().sort({created_at: -1})
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
            module.exports.follow(consts.MASTER_FEED, null, dbName);
          });
      } 
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.saveSettings = function(newSettings, cb, dbName) {
      module.exports.getSettings(function(err, settings) {
        settings.name = newSettings.name;  
        settings.description = newSettings.description;  
        settings.avatar_url = newSettings.avatar_url;  
        settings.header_url = newSettings.header_url;  
        settings.dark_mode = newSettings.dark_mode;
        settings.nsfw = newSettings.nsfw;
        settings.imgur_key = newSettings.imgur_key;
        settings.queue_interval = newSettings.queue_interval;
        settings.custom_head = newSettings.custom_head;
        if (newSettings.password)
          settings.password = md5(newSettings.password);
        
        settings.save(function(err) {
          if (cb)
            cb(err, settings);
        });
      }, dbName);
    }

    /*
     * housekeeping
     */
    module.exports.getLastCronExecTime = function(taskname, cb, dbName) {
      const key = "CRON_" + taskname;
      _Model('Housekeeping', dbName).findOne({'key': key}, function(err, thing) {
        if (!thing)
        {
          thing = new _Model('Housekeeping')({ key: key });
          thing.date = Date.now();
          thing.id = thing._id;
          thing.save();
        }
        
        if (cb)
          cb(thing.date);
      });
    }
    module.exports.updateLastCronExecTime = function(taskname, dbName) {
      const key = "CRON_" + taskname;
      _Model('Housekeeping', dbName).findOne({'key': key}, function(err, thing) {
        if (!thing)
          return;

        thing.date = Date.now();
        thing.save();
      });
    }
}());

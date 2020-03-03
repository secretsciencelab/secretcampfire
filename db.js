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
      'Housekeeping': ThingSchema,
      'Env': ThingSchema
    };

    /*
     * ENV
     */

    module.exports.setEnv = function(key, val) {
      _Model('Env', "", function(model) {
        model.findOne({'key': key}, function(err, thing) {
          if (!thing) {
            thing = new model({ key: key });
            thing.date = Date.now();
            thing.id = thing._id;
          }

          thing.val = val;
          thing.save();
        });
      });
    }

    module.exports.getEnv = function(key, cb) {
      if (key in process.env) {
        cb(process.env[key]);
        return;
      }

      _Model('Env', "", function(model) {
        model.findOne({'key': key}, function(err, thing) {
          if (!thing)
            cb(null);
          else
            cb(thing.val);
        });
      });
    }

    // fetch all envs with key containing substring 'qry'
    module.exports.getEnvs = function(qry, cb) {
      _Model('Env', "", function(model) {
        model.find({'key': {$regex: ".*" + qry + ".*"}}, function(err, things) {
          cb(things);
        });
      });
    }

    module.exports.getEnvsCount = function(qry, cb) {
      _Model('Env', "", function(model) {
        model.countDocuments({'key': {$regex: ".*" + qry + ".*"}}, function(err, count) {
          cb(count);
        });
      });
    }

    /* 
     * Connections 
     */

    var _dbs = {};

    function _connectDBAndReturnModel(connStr, modelName, dbName, cb) {
      var newConn = mongoose.createConnection(connStr,
        { useNewUrlParser: true, useCreateIndex: true }, function (error) {
          if (error) {
            console.error(error);
            cb(null);
          } else {
            console.log('Connected DB ' + dbName);
            _dbs[dbName] = newConn;
            cb(_dbs[dbName].model(modelName, _schema[modelName]));
          }
        });
    }

    function _Model(modelName, dbName, cb) {
      const defaultName = "_default_";
      if (!dbName)
        dbName = defaultName;

      if (dbName in _dbs)
      {
        cb(_dbs[dbName].model(modelName, _schema[modelName]));
        return;
      }
        
      // open new connection
      if (dbName == defaultName) {
        // default DB connection string must be defined in .env
        const envKey = "MONGODB_URI";
        if (!(envKey in process.env)) {
          cb(null);
          return;
        }
        const connStr = process.env[envKey];
        try {
          _connectDBAndReturnModel(connStr, modelName, dbName, cb);
        } catch(err) {
          cb(null);
        }
      } else {
        // aux DB connection string can be defined in:
        // .env or default DB's Env collection
        const envKey = "MONGODB_URI_" + dbName;
        module.exports.getEnv(envKey, function(connStr) {
          if (!connStr) {
            cb(null);
            return;
          }
          try {
            _connectDBAndReturnModel(connStr, modelName, dbName, cb);
          } catch(err) {
            cb(null);
          }
        });
      }
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

    function _addPostSource(url, dbName) {
      if (!url || url.indexOf('http') == -1)
        return;

      try {
        var urlObj = new URL(url);
        var hostUrl = urlObj.protocol + "//" + urlObj.host;
        var hostUrlKey = _makeUrlKey(hostUrl);

        _Model('PostSource', dbName, function(model) {
          if (!model)
            return;
          model.findOne({ 'url_key': hostUrlKey }, function(err, source) {
            if (source)
            {
              source.date = Date.now();
              source.notes = url;
              source.count += 1;
            }
            else
            {
              source = model({
                url_key: hostUrlKey,
                url: hostUrl,
                notes: url
              });
              source.id = source._id;
            }

            source.save();
          });
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

          _Model('Post', dbName, function(model) {
            if (!model)
              return;

            model.findById(id, function(err, post) {
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
          });
        }
        else
        {
          // new post
          _Model('Post', dbName, function(model) {
            if (!model)
              return;

            var newPost = new model(postData);
            newPost.id = newPost._id;
            newPost.post_url = "/post/" + newPost.id
            newPost.save(function(err) {
              if (err)
                console.error(err);
              if (cb)
                cb(err, newPost);
            });

            if (newPost.re_url && /\S/.test(newPost.re_url)) 
              _addPostSource(newPost.re_url, dbName); 
          });
        }
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.getPost = function(id, cb, dbName) {
      _Model('Post', dbName, function(model) {
        model.findById(id, cb);
      });
    }

    module.exports.delPost = function(id, cb, dbName) {
      _Model('Post', dbName, function(model) {
        model.deleteOne({'id': id}, function(err) {
          if (cb)
            cb(err);
        });
      });
    }

    module.exports.postNow = function(id, cb, dbName) {
      _Model('Post', dbName, function(model) {
        model.findById(id, function(err, post) {
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
      });
    }

    module.exports.getPostCount = function(cb, dbName) {
      _Model('Post', dbName, function(model) {
        model.countDocuments({ 'queued': { "$ne": true } }, function(err, count) {
          if (cb)
            cb(err, count);
        });
      });
    }
    module.exports.getQueuedCount = function(cb, dbName) {
      _Model('Post', dbName, function(model) {
        model.countDocuments({ 'queued': true }, function(err, count) {
          if (cb)
            cb(err, count);
        });
      });
    }

    module.exports.getHotTags = function(cb, dbName) {
      _Model('Post', dbName, function(model) {
        model.aggregate([
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
      });
    };

    /* 
     * feed
     */

    function _fetchPosts(options, cb, dbName) {
      const index = (options.index == 0)? undefined : options.index;
      const limit = options.limit; 
      const filter = options.filter;
      const order = options.order;

      _Model('Post', dbName, function(model) {
        try {
          model.find(filter)
               .skip(index)
               .limit(limit)
               .sort({'date': order })
               .exec(cb);

        } catch(err) {
          //console.error(err);
          if (cb)
            cb(err, []);
        }
      });
    }

    function _fetchRandomPosts(options, cb, dbName) {
      const limit = options.limit; 
      const filter = options.filter;

      _Model('Post', dbName, function(model) {
        try {
          model.aggregate([
            { "$match": filter },
            { "$sample": {size: limit} }
          ],
          function(err, results) {
            if (cb)
              cb(err, results);
          });
        } catch(err) {
          //console.error(err);
          if (cb)
            cb(err, []);
        }
      });
    }

    module.exports.fetchPosts = function(options, cb, dbName) {
      if (options.random) {
        _fetchRandomPosts(options, cb, dbName);
        return;
      }
      
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
      _Model('Follow', dbName, function(model) {
        try {
          var newFollow = new model({
            url_key: _makeUrlKey(url),
            url: url
          });
          newFollow.id = newFollow._id;

          newFollow.save(function (err) {
            if (cb)
              cb(err, newFollow);
          });
        } catch(err) {
          console.error(err);
          if (cb)
            cb(err, {});
        }
      });
    }

    module.exports.unfollow = function(url, cb, dbName) {
      _Model('Follow', dbName, function(model) {
        try {
          model.deleteMany({
            'url_key': _makeUrlKey(url)
          }, function(err) {
            if (cb)
              cb(err);
          });
        } catch(err) {
          console.error(err);
          if (cb)
            cb(err);
        }
      });
    }

    module.exports.isFollowing = function(url, cb, dbName) {
      _Model('Follow', dbName, function(model) {
        try {
          model.findOne({
            'url_key': _makeUrlKey(url)
          }, function(err, doc) {
            if (cb)
              cb(err, doc);
          });
        } catch(err) {
          console.error(err);
          if (cb)
            cb(err, null);
        }
      });
    }

    module.exports.getFollowing = function(index, limit, cb, dbName) {
        if (index == 0)
          index = undefined;
        _Model('Follow', dbName, function(model) {
          model.find()
            .skip(index)
            .limit(limit)
            .sort({'date': -1})
            .exec(cb);
        });
    }

    module.exports.getFollowingCount = function(cb, dbName) {
      _Model('Follow', dbName, function(model) {
        model.countDocuments({}, function(err, count) {
          if (cb)
            cb(err, count);
        });
      });
    }

    module.exports.getRandomFollowing = function(cb, dbName) {
      _Model('Follow', dbName, function(model) {
        model.aggregate([{
          $sample: { size: 100 }
        }], 
        function(err, follows) {
          if (cb)
            cb(err, follows);
        });
      });
    }

    module.exports.addFollower = function(url, dbName) {
      if (!url || url.indexOf('http') == -1
        || url.indexOf('/dashboard') == -1) /* only count as follower if 
                                             * fetch was from /dashboard */
        return;

      _Model('Follower', dbName, function(model) {
        try {
          var urlObj = new URL(url);
          var hostUrl = urlObj.protocol + "//" + urlObj.host;
          var hostUrlKey = _makeUrlKey(hostUrl);

          model.findOne({ 'url_key': hostUrlKey }, function(err, follower) {
            if (follower)
            {
              follower.date = Date.now();
              follower.notes = url;
            }
            else
            {
              follower = new model({
                url_key: hostUrlKey,
                url: hostUrl,
                notes: url
              });
              follower.id = follower._id;
            }

            follower.save(function (err) {
            });
          });
        } catch(err) {
          console.error(err);
        }
      });
    }

    module.exports.getFollowers = function(index, limit, cb, dbName) {
        if (index == 0)
          index = undefined;
        _Model('Follower', dbName, function(model) {
          model.find()
               .skip(index)
               .limit(limit)
               .sort({'date': -1})
               .exec(cb);
        });
    }

    module.exports.getFollowersCount = function(cb, dbName) {
      _Model('Follower', dbName, function(model) {
        model.countDocuments({}, function(err, count) {
          if (cb)
            cb(err, count);
        });
      });
    }

    module.exports.getPostSources = function(index, limit, cb, dbName) {
        if (index == 0)
          index = undefined;
        _Model('PostSource', dbName, function(model) {
          model.find()
               .skip(index)
               .limit(limit)
               .sort({'date': -1})
               .exec(cb);
        });
    }

    module.exports.getPostSourcesCount = function(cb, dbName) {
      _Model('PostSource', dbName, function(model) {
        model.countDocuments({}, function(err, count) {
          if (cb)
            cb(err, count);
        });
      });
    }

    /*
     * likes
     */

    module.exports.isLiked = function(url, cb, dbName) {
      _Model('Like', dbName, function(model) {
        try {
          model.findOne({
            'url_key': _makeUrlKey(url)
          }, function(err, doc) {
            if (cb)
              cb(err, doc);
          });
        } catch(err) {
          console.error(err);
          if (cb)
            cb(err, null);
        }
      });
    }

    module.exports.addToLikes = function(url, data, cb, dbName) {
      _Model('Like', dbName, function(model) {
        try {
          // cache original post contents so we can display liked posts
          // without having to fetch each one from the source
          like = new model({
            url_key: _makeUrlKey(url),
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
        } catch(err) {
          console.error(err);
          if (cb)
            cb(err, {});
        }
      });
    }

    module.exports.delFromLikes = function(url, cb, dbName) {
      _Model('Like', dbName, function(model) {
        try {
          var urlKey = _makeUrlKey(url);
          model.deleteOne({'url_key': urlKey}, function(err) {
            if (cb)
              cb(err);
          });
        } catch(err) {
          console.error(err);
          if (cb)
            cb(err);
        }
      });
    }

    module.exports.fetchLikes = function(options, cb, dbName) {
      _Model('Like', dbName, function(model) {
        try {
          const index = (options.index == 0)? undefined : options.index;
          const limit = options.limit; 
          const filter = options.filter;

          model.find(filter)
               .skip(index)
               .limit(limit)
               .sort({'date': -1 })
               .exec(cb);
        } catch(err) {
          console.error(err);
          if (cb)
            cb(err, []);
        }
      });
    }

    /*
     * blog
     */
    module.exports.getSettings = function(cb, dbName) {
      _Model('Settings', dbName, function(model) {
        if (!model) {
          cb({'message': 'no DB', 'name': 'NoDB'}, {});
          return;
        }
        
        model.findOne().sort({created_at: -1})
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
            settings = new model();
            settings.id = settings._id;
            settings.password = md5("password");

            settings.save(function(err) {
              if (cb)
                cb(err, settings)
            });

            // start by following our recommended blogs
            for (var fi=0; fi < consts.STARTER_FEEDS.length; fi++)
              module.exports.follow(consts.STARTER_FEEDS[fi], null, dbName);
          });
      });
    }

    module.exports.saveSettings = function(newSettings, cb, dbName) {
      module.exports.getSettings(function(err, settings) {
        if ('NSFW_FEED' in process.env) {
          const feed = process.env['NSFW_FEED'];
          if (!settings.nsfw && newSettings.nsfw == "true")
            module.exports.follow(feed, null, dbName);
          else if (settings.nsfw && newSettings.nsfw == "false")
            module.exports.unfollow(feed, null, dbName);
        }

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
      _Model('Housekeeping', dbName, function(model) {
        model.findOne({'key': key}, function(err, thing) {
          if (!thing) {
            thing = new model({ key: key });
            thing.date = Date.now();
            thing.id = thing._id;
            thing.save();
          }
          
          if (cb)
            cb(thing.date);
        });
      });
    }
    module.exports.updateLastCronExecTime = function(taskname, dbName) {
      const key = "CRON_" + taskname;
      _Model('Housekeeping', dbName, function(model) {
        model.findOne({'key': key}, function(err, thing) {
          if (!thing)
            return;

          thing.date = Date.now();
          thing.save();
        });
      });
    }
}());

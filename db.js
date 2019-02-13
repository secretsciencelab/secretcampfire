(function() {
    const mongoose = require('mongoose');
    const normalizeUrl = require('normalize-url');
    const md5 = require('md5');
    const URL = require('url').URL;
    const consts = require('./consts');

    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser:true }, function (error) {
      if (error) console.error(error);
      else console.log('DB connected');
    });

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
    Settings = mongoose.model('Settings', SettingsSchema);

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
    Post = mongoose.model('Post', PostSchema);

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
    Follow = mongoose.model('Follow', FollowSchema);
    Follower = mongoose.model('Follower', FollowSchema);
    PostSource = mongoose.model('PostSource', FollowSchema);

    const CronTaskSchema = new mongoose.Schema({
      id: String,
      name: { type: String, unique: true },
      last_run: { type: Date, default: Date.now }
    });
    CronTask = mongoose.model('CronTask', CronTaskSchema);

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

        PostSource.findOne({ 'url_key': hostUrlKey }, function(err, source) {
          if (source)
          {
            source.date = Date.now();
            source.notes = url;
            source.count += 1;
          }
          else
          {
            source = new PostSource({
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
        if (postData.queued)
          postData.queued = true;
        
        var newPost = new Post(postData);
        newPost.id = newPost._id;
        newPost.post_url = "/post/" + newPost.id

        newPost.save(function (err) {
          if (cb)
            cb(err, newPost);
        });

        if (newPost.re_url && /\S/.test(newPost.re_url)) 
          _addPostSource(newPost.re_url); 
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.getPost = function(id, cb) {
      Post.findById(id, cb);
    }

    module.exports.delPost = function(id, cb) {
      Post.deleteOne({'id': id}, function(err) {
        if (cb)
          cb(err);
      });
    }

    module.exports.getPostCount = function(cb) {
      Post.count({ 'queued': { "$ne": true } }, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }
    module.exports.getQueuedCount = function(cb) {
      Post.count({ 'queued': true }, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    /* 
     * feed
     */

    function _fetchPosts(index, limit, filter, cb) {
      try {
        if (index == 0)
          index = undefined;
        Post.find(filter)
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, []);
      }
    }

    module.exports.fetchPosts = function(index, limit, cb) {
      _fetchPosts(index, limit, { 'queued': { "$ne": true } }, cb);
    }
    module.exports.fetchQueuedPosts = function(index, limit, cb) {
      _fetchPosts(index, limit, { 'queued': true }, cb);
    }

    /*
     * networking
     */

    module.exports.follow = function(url, cb) {
      try {
        var newFollow = new Follow({
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
        Follow.deleteMany({
          'url_key': _makeUrlKey(url)
        }, function(err) {
          if (cb)
            cb(err);
        });
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.isFollowing = function(url, cb) {
      try {
        Follow.findOne({
          'url_key': _makeUrlKey(url)
        }, function(err, doc) {
          if (cb)
            cb(err, doc);
        });
      }
      catch(err) {
        console.error(err);
        if (cb)
          cb(err, {});
      }
    }

    module.exports.getFollowing = function(index, limit, cb) {
        if (index == 0)
          index = undefined;
        Follow.find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getFollowingCount = function(cb) {
      Follow.count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    module.exports.getRandomFollowing = function(cb) {
      Follow.aggregate([{
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

        Follower.findOne({ 'url_key': hostUrlKey }, function(err, follower) {
          if (follower)
          {
            follower.date = Date.now();
            follower.notes = url;
          }
          else
          {
            follower = new Follower({
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
        Follower.find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getFollowersCount = function(cb) {
      Follower.count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    module.exports.getPostSources = function(index, limit, cb) {
        if (index == 0)
          index = undefined;
        PostSource.find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
    }

    module.exports.getPostSourcesCount = function(cb) {
      PostSource.count({}, function(err, count) {
        if (cb)
          cb(err, count);
      });
    }

    /*
     * blog
     */
    module.exports.getSettings = function(cb) {
      Settings.findOne().sort({created_at: -1})
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
          settings = new Settings();
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

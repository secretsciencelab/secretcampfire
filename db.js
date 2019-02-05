(function() {
    const mongoose = require('mongoose');
    const normalizeUrl = require('normalize-url');
    const md5 = require('md5');
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
      nsfw: Boolean
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
      re_url: String
    });
    Post = mongoose.model('Post', PostSchema);

    // collections:
    // - follows
    // - followers
    // - rebloggedfroms
    const FollowSchema = new mongoose.Schema({
      id: String,
      date: { type: Date, default: Date.now },
      url_key: { type: String, unique: true },
      url: { type: String },
      name: String,
      notes: String
    });
    Follow = mongoose.model('Follow', FollowSchema);
    Follower = mongoose.model('Follower', FollowSchema);

    /* 
     * post
     */
    module.exports.getPostSchema = function() {
      return PostSchema;
    }

    function _makeArray(x) {
      return Array.isArray(x)? x : [x];
    }
    module.exports.post = function(postData, cb) {
      try {
        // sanitize postData
        for (key in PostSchema.paths)
          if (key.indexOf("_") != 0 
            && key.indexOf("date") == -1
            && typeof postData[key] === "undefined")
            postData[key] = ""
        postData.thumbs = _makeArray(postData.thumbs);
        postData.images = _makeArray(postData.images);
        postData.urls = _makeArray(postData.urls);
        postData.tags = postData.tags.split(/(?:,| )+/);
        
        var newPost = new Post(postData);
        newPost.id = newPost._id;
        newPost.post_url = "/post/" + newPost.id

        newPost.save(function (err) {
          if (cb)
            cb(err, newPost);
        });
      }
      catch(err) {
        console.log(err);
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

    /* 
     * feed
     */

    module.exports.fetchPosts = function(index, limit, cb) {
      try {
        if (index == 0)
          index = undefined;
        Post.find()
          .skip(index)
          .limit(limit)
          .sort({'date': -1})
          .exec(cb);
      }
      catch(err) {
        if (cb)
          cb(err, []);
      }
    }

    /*
     * networking
     */

    function _makeUrlKey(url) {
      // normalize url to make url_key
      return normalizeUrl(url, {
        stripHash: true,
        stripProtocol: true
      });
    }

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
        if (cb)
          cb(err, {});
      }
    }

    module.exports.unfollow = function(url, cb) {
      Follow.deleteMany({
        'url_key': _makeUrlKey(url)
      }, function(err) {
        if (cb)
          cb(err);
      });
    }

    module.exports.isFollowing = function(url, cb) {
      Follow.findOne({
        'url_key': _makeUrlKey(url)
      }, function(err, doc) {
        if (cb)
          cb(err, doc);
      });
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
      if (url.indexOf('http') == -1)
      {
        if (cb)
          cb(null, null);
        return;
      }

      try {
        var urlObj = new URL(url);
        var host = urlObj.host;

        var newFollower = new Follower({
          url_key: _makeUrlKey(host),
          url: host,
          notes: url
        });
        newFollower.id = newFollower._id;

        newFollower.save(function (err) {
          if (cb)
            cb(err, newFollower);
        });
      }
      catch(err) {
        if (cb)
          cb(err, {});
      }
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
        if (newSettings.password)
          settings.password = md5(newSettings.password);
        
        settings.save(function(err) {
          if (cb)
            cb(err, settings);
        });
      });
    }

}());

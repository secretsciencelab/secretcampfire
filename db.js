(function() {
    const mongoose = require('mongoose');
    const normalizeUrl = require('normalize-url');

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
      password: String
    });
    Settings = mongoose.model('Settings', SettingsSchema);

    const PostSchema = new mongoose.Schema({
      id: String,
      title: String,
      date: { type: Date, default: Date.now },
      thumbs: [String],
      urls: [String],
      text: String,
      tags: [String],
      post_url: String,
      re_url: String
    });
    Post = mongoose.model('Post', PostSchema);

    // collections:
    // - following
    // - reblogged_from
    const FollowSchema = new mongoose.Schema({
      id: String,
      date: { type: Date, default: Date.now },
      url_key: { type: String, unique: true },
      url: { type: String },
      name: String,
      notes: String
    });
    Follow = mongoose.model('Follow', FollowSchema);

    /*
     * blog
     */
    module.exports.getSettings = function(cb) {
      Settings.findOne().sort({created_at: -1})
        .exec(function(err, settings) {
          if (settings)
          {
            // return existing
            cb(err, settings);
            return;
          }

          // make new entry and return it
          settings = new Settings();
          settings.id = settings._id;

          settings.save(function(err) {
            cb(err, settings)
          });
        });
    }

    module.exports.saveSettings = function(newSettings, cb) {
      module.exports.getSettings(function(err, settings) {
        settings.name = newSettings.name;  
        settings.description = newSettings.description;  
        settings.avatar_url = newSettings.avatar_url;  
        settings.header_url = newSettings.header_url;  
        if (newSettings.password)
          settings.password = newSettings.password;
        
        settings.save(function(err) {
          cb(err, settings);
        });
      });
    }

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
        postData.thumbs = _makeArray(postData.thumbs);
        postData.urls = _makeArray(postData.urls);
        postData.tags = postData.tags.split(/(?:,| )+/);
        
        var newPost = new Post(postData);
        newPost.id = newPost._id;
        newPost.post_url = "/post/" + newPost.id

        newPost.save(function (err) {
          cb(err, newPost);
        });
      }
      catch(err) {
        cb(err, {});
      }
    }

    module.exports.reblog = function(post) {
    }

    module.exports.getPost = function(id, cb) {
      Post.findById(id, cb);
    }

    module.exports.update = function(id, keyVals) {
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
        var urlKey = _makeUrlKey(url);
        
        var newFollow = new Follow({
          url_key: urlKey,
          url: url
        });
        newFollow.id = newFollow._id;

        newFollow.save(function (err) {
          cb(err, newFollow);
        });
      }
      catch(err) {
        cb(err, {});
      }
    }

    module.exports.isFollowing = function(url, cb) {
      var urlKey = _makeUrlKey(url);

      Follow.findOne({'url_key': urlKey}, function(err, doc) {
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
        cb(err, follows);
      });
    }


}());

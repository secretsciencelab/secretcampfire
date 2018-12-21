(function() {
    const mongoose = require('mongoose')
    mongoose.connect(process.env.MONGODB_URI, function (error) {
      if (error) console.error(error);
      else console.log('DB connected');
    });

    const BlogSchema = new mongoose.Schema({
      id: String,
      name: String,
      description: String,
      avatar_url: String,
      header_url: String
    });

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

    // collections:
    // - following
    // - reblogged_from
    const FollowingSchema = new mongoose.Schema({
      id: String,
      date: { type: Date, default: Date.now },
      url: String,
      name: String,
      notes: String
    });

    /*
     * blog
     */
    module.exports.updateInfo = function(info) {
    }

    /* 
     * post
     */

    module.exports.post = function(post) {
    }

    module.exports.reblog = function(post) {
    }

    module.exports.getPost = function(id) {
    }

    /* 
     * feed
     */

    module.exports.fetchFeed = function(index) {
    }

    /*
     * networking
     */

    module.exports.follow = function(blog) {
    }

    module.exports.getFollowing = function(blog) {
    }


}());

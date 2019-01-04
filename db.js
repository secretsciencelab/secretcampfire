(function() {
    const mongoose = require('mongoose')
    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser:true }, function (error) {
      if (error) console.error(error);
      else console.log('DB connected');
    });

    const BlogSchema = new mongoose.Schema({
      id: String,
      name: String,
      description: String,
      avatar_url: String,
      header_url: String,
      style_url: String
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
    Post = mongoose.model('Post', PostSchema);

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
    module.exports.getPostSchema = function() {
      return PostSchema;
    }

    function _makeArray(x) {
      return Array.isArray(x)? x : [x];
    }
    module.exports.post = function(postData, res) {
      // sanitize postData
      postData.thumb = _makeArray(postData.thumb);
      postData.url = _makeArray(postData.url);
      postData.tags = postData.tags.split(/(?:,| )+/);
      
      var newPost = new Post(postData);
      newPost.id = newPost._id;
      newPost.post_url = "/post/" + newPost.id

      newPost.save(function (err) {
        res.status(200).json(newPost);
      });
    }

    module.exports.reblog = function(post) {
    }

    module.exports.getPost = function(id) {
    }

    module.exports.update = function(id, keyVals) {
    }

    /* 
     * feed
     */

    module.exports.fetchPosts = function(index, cb) {
      if (index == 0)
        index = undefined;
      Post.find()
        .skip(index)
        .limit(10)
        .sort({'date': -1})
        .exec(cb);
    }

    /*
     * networking
     */

    module.exports.follow = function(blog) {
    }

    module.exports.getFollowing = function(blog) {
    }


}());

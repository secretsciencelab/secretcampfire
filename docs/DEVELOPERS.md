## Design guide
 
- Separate code from platform (user is free to run code on any platform).
- Separate platform from database (user is free to plug and play any database).
- Separate platform from media -- don't host media (user is free to use existing platforms to host images and videos). 
- Database only stores user's text data and links to external media.
- For security, all user's actions must be redirected to execute on the user's own Dashboard (e.g., Post, Reblog, Follow, Unfollow, Like, Dislike). 
- Don't reinvent the wheel. Use off-the-shelf components whenever possible.
- "Two is one and one is none": support >2 free hosting options for each feature.

## `secret campfire` handshake requirements
To participate and play in the `secret campfire` network, your instance must implement the following endpoints:
  - `/feed`
    
    `/feed/<offset>`
    
    - feed JSON schema:
      ```
        {
          "name": "Feed Name",
          "description": "",
          "avatar_url": "",
          "header_url": "",
          "blog_url": "http://instance",
          "style_url": "http://instance/stylesheets/feed.css",
          "custom_head": "",
          "nsfw": false,
          "dark_mode": false,
          "posts": [
            {
              "id": "5c5d40a0e96ba00004b9cde9",
              "title": "Title",
              "date": "2012-04-23T18:25:43.511Z",
              "thumbs": [],
              "urls": [],
              "text": "markdown",
              "tags": [],
              "post_url": "/post/id",
              "re_url": "http://reblogged_from_instance/post/id"
            }
          ]
        }
      ```
    - the `style_url` field in the feed provides custom CSS file to render:
      - infinite-scroll viewer for entire feed
      - single-post page
    - the `custom_head` field lets the owner insert custom code (e.g., Google Analytics)
  - `/post/<id>`
    - returns JSON of post from DB
    
    - post JSON schema:
    ```
      {
          "name": "Feed Name",
          "description": "",
          "avatar_url": "",
          "header_url": "",
          "blog_url": "http://instance",
          "style_url": "http://instance/stylesheets/feed.css",
          "nsfw": false,
          "post":
            {
              "id": "5c5d40a0e96ba00004b9cde9",
              "title": "Title",
              "date": "2012-04-23T18:25:43.511Z",
              "thumbs": [],
              "urls": [],
              "text": "markdown",
              "tags": [],
              "post_url": "/post/id",
              "re_url": "http://reblogged_from_instance/post/id"
            }
       }
    ```
  - `/render/<feed>` and `/render/<post>`
    - pulls `feed` JSON and renders infinite-scroll viewer
    - pulls `post` JSON and renders single-post page
  - `/dashboard` 
  
    `/dashboard/<offset>`
    
    - (private)
    - for owner to view live stream of followed blogs
    - for owner to add/manage posts

## Recommended tech
  - MVC: Node.js + Express + Bootstrap + MongoDB
  - hosting: Heroku, Google Cloud Platform
  - media hosting: Imgbox, ImageBam, Gfycat, Imgur, YouTube, etc

The architecture ingredients above are recommendations. Feel free to use your favorite technology to meet the `handshake requirements` above.

## `secret campfire` handshake requirements
To participate and play in the secretcampfire network, your instance must implement the following endpoints:
  - `/feed`
    - feed JSON schema:
      ```
        {
          "name": "Feed Name",
          "description": "",
          "avatar_url": "",
          "header_url": "",
          "style_url": "http://instance/stylesheets/feed.css",
          "posts": [
            {
              "title": "Title",
              "date": "2012-04-23T18:25:43.511Z",
              "thumbs": [],
              "urls": [],
              "text": "markdown",
              "tags": [],
              "post_url": "http://instance/post/id",
              "re_url": "http://reblogged_from_instance/post/id"
            }
          ]
        }
      ```
    - the `style_url` field in the feed provides CSS to render:
      - infinite-scroll viewer for entire feed
      - single-post page
  - `/post/<id>`
    - returns JSON of post from DB
  - `/render/<feed>` and `/render/<post>`
    - pulls `feed` JSON and renders infinite-scroll viewer
    - pulls `post` JSON and renders single-post page
  - `/dashboard` (private)
    - for owner to view live stream of followed blogs
    - for owner to add/manage posts

## UX guidelines
  - When reblogging, 'urls' and 'text' fields are initialized with the source post's urls/text

## Technologies used
  - MVC: Node.js + Express + Bootstrap + MongoDB
  - hosting: Heroku
  - media hosting: ImageBam / YouTube

The architecture ingredients above are recommendations. Feel free to use your favorite technology to meet the 'handshake requirements' above.

# secretblogr

An immortal, lightweight microblogging system that...
- supports tumblr features like `reblog`, `follow` and an infinite-scroll `dashboard` feed
- is built with 100% free (but industry-grade) services, so it costs you nothing to run your blog forever
- can never be killed, because you own and control:
  - your blog
  - your blog's content 
  - your blogs connections to other blogs
- is open-source, so you may customize it to your heart's content

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Secret handshake requirements
To play in the secretblogr network, your instance must implement the following endpoints:
  - `/feed`
    - feed JSON schema:
      ```
        {
          "name": "Feed Name",
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
          ],
          "style": "http://instance/public/feed.css"
        }
      ```
    - the `style` field in the feed provides CSS to render:
      - infinite-scroll viewer for entire feed
      - single-post page
  - `/post/<id>`
    - returns JSON of post from DB
  - `/render/<feed>` and `/render/<post>`
    - pulls `feed` JSON and renders infinite-scroll viewer
    - pulls `post` JSON and renders single-post page
  - `/dashboard` (private)
    - for owner to add feeds to follow
    - for owner to view stream of followed feeds
    - for owner to add/reblog posts to personal feed

## UX guidelines
  - When reblogging, 'urls' and 'text' fields are initialized with the source post's urls/text

## Technologies used
  - secretblogr MVC: Node.js + Express + Bootstrap + MongoDB
  - secretblogr hosting: Heroku
  - media hosting: ImageBam / YouTube

The architecture ingredients above are recommendations. You are free to use your favorite technology to meet the 'handshake requirements' above.

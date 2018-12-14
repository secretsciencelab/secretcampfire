# secretblogr

An immortal self-hosted microblogging network built using 100% free services to replace tumblr.

## Instance handshake requirements
All secretblogr instances must implement the following endpoints:
  - `/feed`
    - feed JSON schema:
      ```
        {
          "name": "Feed Name",
          "posts": [
            {
              "title": "Title",
              "date": "2012-04-23T18:25:43.511Z",
              "media": [],
              "text": "markdown",
              "tags": [],
              "url": "http://instance/post/id",
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
  - When reblogging, 'media' and 'text' fields are initialized with the source post's media/text

## Architecture
  - secretblogr MVC: Node.js + Express + MongoDB
  - secretblogr hosting: Heroku
  - media hosting: ImageBam / YouTube
  - *all architecture ingredients above are optional --- but your instance must meet the 'handshake requirements' above to play in the secretblogr network*

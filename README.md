# secretblogr

An immortal, self-hosted microblogging network built using 100% free services to replace tumblr.

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
              "url": "http://post/url",
              "re_url": "http://reblogged_from/url"
            }
          ],
          "style": "http://path/to/style.css"
        }
      ```
  - `/post/<id>`
    - returns json of post from DB

`style.css` has CSS to render:
  - entire feed infinite-scroll viewer 
  - single-post page

## UX guidelines
  - When reblogging, 'media' and 'text' fields are initialized with the source post's media/text

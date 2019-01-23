![secretcampfire](http://assets.innbetweenworlds.com/media/campfire/glowingForest.jpg)

# secretcampfire

An immortal, lightweight, self-hosted microblogging system that...
- supports tumblr features like `reblog`, `follow` and an infinite-scroll `dashboard` feed
- is built with 100% free (but industry-grade) services, so it costs you nothing to run your blog 24/7 forever
- can never be killed, because you own and control:
  - your blog
  - your blog's content 
  - your blogs social network
- is open-source, so you may customize it to your heart's content
- can run on any platform you like, so you are never locked into one service

## Quickstart

1. Click [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

2. Enter a name for your app. This will be the name used in your blog's address. E.g. if you enter `secretcampfire`, your blog's address will be `secretcampfire.herokuapp.com`.

3. Go to [dashboard.heroku.com](https://dashboard.heroku.com) and select your app.

4. Click the `Resources` tab at the top.

5. In the `Add-ons` search bar, type `mlab` and select `mLab MongoDB`. This will be the database that stores your blog's content. Select the "Sandbox - Free" plan and click `Provision`.

6. Visit `your-app.herokuapp.com` in a browser (where `your-app` is the name you entered in step 2). 

7. If all went well, you should see a welcome message that says "Congratulations! Your secret campfire blog is alive!" Follow the instructions there to set your password and secure your blog. 

## Secret handshake requirements
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

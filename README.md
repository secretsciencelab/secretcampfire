![secretcampfire](http://assets.innbetweenworlds.com/media/campfire/glowingForest.jpg)

# secret campfire

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

2. Enter a name for your app. This name will be used as your blog's address. E.g. if you enter `secretcampfire`, your blog's address will be `secretcampfire.herokuapp.com`. Click `Deploy app`.

3. Go to [dashboard.heroku.com](https://dashboard.heroku.com) and select your app.

4. Click the `Resources` tab at the top.

5. In the `Add-ons` search bar, type `mlab` and select `mLab MongoDB`. This will be the database that stores your blog's content. Select the `Sandbox - Free` plan and click `Provision`.

6. Visit `your-app.herokuapp.com` in a browser (where `your-app` is the name you entered in step 2). 

7. If all went well, you'll see a welcome message that says "Congratulations! Your secret campfire blog is alive!" Follow the instructions there to set your password and secure your blog. 

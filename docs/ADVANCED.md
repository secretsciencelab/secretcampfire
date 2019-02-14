## How to unlock image file uploads

To unlock image file uploads on `secret campfire` via Imgur, you'll need to provide your own Imgur key. This is so that `secret campfire` is authorized to upload files to Imgur on your behalf. Imgur will host your images for free and your blog will point to Imgur for images.

To start, visit this page to *Register an Application*: https://api.imgur.com/oauth2/addclient 

Under *Authorization type*, make sure to select *Anonymous usage without user authentication*. Leave *Authorization callback URL* empty. You may enter anything you want in the remaining fields. Click *submit*.

On the next page, you'll find your `Client ID` and your `Client secret`. Save both for your records, but what `secret campfire` needs is the `Client ID`. 

Go to your blog's `Settings` page. Click `advanced settings` at the bottom. Enter your Imgur `Client ID` and save.

Once you do this, image file upload buttons will be unlocked throughout your blog.

--- 

## How to unlock Queued Posting

The `Queue` helps keep your blog active by staggering posts over a period of hours or days. 

To unlock this feature, go to your blog's `Settings` page. Click `advanced settings` at the bottom. Enter a number in the `Auto-publish queued posts` box. This number tells your blog how often (in minutes) to auto-post from your queue. E.g., if you enter `60` in the box, that tells your blog to post from your `Queue` every 60 minutes. 

Once you do this, you will see an arrow button next to your "Post" button. To add a `Post` to your `Queue`, click this arrow and choose "Add to queue" from the menu. Then click "Queue."

*Warning: activating your `Queue` may prevent your blog from sleeping. This will eat up your free hosting hours faster. [See here](FAQ.md#why-does-my-blog-go-to-sleep-after-a-while-and-why-does-it-take-a-long-time-to-start-back-up-again) for more details.*

--- 

## How to set up without a credit card

Two things will make Heroku prompt you for your credit card, even though everything is 100% free:

1. to add the `mLab MongoDB` database
2. to boost your monthly free quota from 550 hours to 1000 hours

These extra features are free and your card will not be charged, but Heroku just wants to use them as an excuse to get your card on file.

If you are opposed to this, you can still use `secret campfire` without a credit card by setting up your `mLab MongoDB` database manually:

1. Instead of getting `mLab MongoDB` from Heroku, go directly to the `mlab` website: https://mlab.com
2. Make a new account.
3. Click `Create new` to make a new database.
4. For `Cloud Provider` click `amazon web services` and for `Plan Type` click `SANDBOX (FREE)`. Click `CONTINUE`.
5. Pick any region you like. Click `CONTINUE`.
6. Enter a name for your database. Click `CONTINUE`.
7. Click `SUBMIT ORDER`.
8. Your new database will appear in the table. Click on it.
9. Click on the `Users` tab and click `Add database user`. Enter any `username` and `password`. (Make sure you don't have the `@` symbol in your password.)
10. Look at the top of the page for `To connect using a driver via the standard MongoDB URI`. Copy the URL that looks like: `mongodb://<dbuser>:<dbpassword>@ds127655.mlab.com:27655/<database_name>`

Next, we will tell your Heroku app to use this database you just created:

1. Sign in to https://dashboard.heroku.com
2. Go to your blog/app and click `Settings`
3. Click `Reveal Config Vars`
4. Enter `MONGODB_URI` into the left box and the URL that looks like `mongodb://<dbuser>:<dbpassword>@ds127655.mlab.com:27655/<database_name>` into the right box. Replace `<dbuser>` and `<dbpassword` with the `username` and `password` you used in Step 9. above. Replace `<database_name>` with the name you used in Step 6. above.

You're all set! Only catch is without a credit card on Heroku, your free quota remains at 550 hours per month -- not enough to run your blog 24/7. It'll go to sleep whenever it's idle for 30 minutes and it'll take a couple of seconds to wake up whenever you get visitors.

--- 

## How to upgrade your `secret campfire` blog to the latest official version

When you clicked Deploy, a `snapshot` of the official master code wooshed to your server and got installed. 

As time goes by, the master code will get updated. New features will be added and bugs will be fixed. But, your server does not automatically get updated. It stays on your older `snapshot`. This is so that your blog is stable and doesn't change unless you say so.

To upgrade your blog to the latest master code, please see [UPGRADING](UPGRADING.md). Upgrading does not touch any data you have stored your database. Your data is kept safe and unmolested.

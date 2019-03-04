## Why are there many extra things I have to manage on my `secret campfire` blog?

Because you are now graduating from a *simple user of the Internet* to an __owner__. And just like with anything else, being an owner comes with responsibilities.

If you want things to be brain-dead simple, there are many other options available where someone else takes care of your blog for you. But as you know, the trade-off when someone runs your blog for you is that you don't really own anything. They own you.

If you want the freedom of owning and keeping what you own, there will be a slight learning curve. But these are good things to know, because knowledge is power. For years, all these other sites have happily kept people ignorant, helpless and in the dark. Think about it -- they **don't want you to know** how to run your own site. They make **more money** if you don't know how to run your own site and are completely dependent on them. 

In contrast, `secret campfire` will show you exactly how to run your own server so you can finally be independent and free. But of course, our goal is to make it as simple as possible -- it's only as hard as it needs to be but no harder. In fact, it's so easy... you don't even need a computer.

However, if you're not the DIY type and prefer to have your blogs set up for you, email [getscampy@secretcampfire.com](mailto:getscampy@secretcampfire.com) and we'll take care of you. In your email, tell us what blog name you want and we'll set you up for a one-time fee of $5. After they're set up, your blogs belong 100% to you and run free forever.

--- 

## How do I unlock image file uploads?

[See here.](ADVANCED.md#how-to-unlock-image-file-uploads)

--- 

## How do I unlock Queued Posting?

[See here.](ADVANCED.md#how-to-unlock-queued-posting)

--- 

## How is it possible that `secret campfire` can run 24/7 for free?

This wouldn't have been possible a few years ago. It's only possible now because we live an interesting time. What's interesting is that Internet has matured enough that the technology has become a commodity. 

Like they said in *The Incredibles* movie, "When everyone is super, no one is." Now that the technology has become a commodity, there is little value in the technology itself. The value has shifted to *providing a service* on top of the technology.

Think about the biggest Internet companies. Where do they get their profits from? Yup. By providing you some service. Google, Facebook, Twitter, Instagram, etc. They provide you a service and their goal is to get you hooked to their service. Then they make money off you later. E.g. by selling your data to advertisers and showing you ads, or by making you pay for premium features.

And because there are so many companies fighting to get you hooked to their service, they let you use their service for free. This is the key.

Almost every cloud platform today gives you generous free quotas to run your web application. So `secret campfire` was designed to take advantage of this. It's designed to be lightweight and modular, so that each of its components can live entirely within the free budgets of various cloud platforms like Heroku, Google Cloud or Microsoft Azure. It's a win-win because we get a free ride while they get more people using their platform.

--- 

## Why does my Heroku blog go to sleep after a while, and why does it take a long time to start back up again? 

When you deploy your `secret campfire` blog on Heroku for free, they set you up on their free `Dyno`. By default, that gives you 550 free hours per month. And if it receives no traffic for 30 minutes, your `Dyno` goes to sleep. If your blog gets visited while asleep, it will wake up again after a short delay. (https://devcenter.heroku.com/articles/free-dyno-hours).

To prevent your blog from sleeping, you can set up a service like Pingdom or New Relic to periodically ping your site. But if you do that, your blog will run 24/7 and you'll blow through your free quota in 23 days. 

To keep your blog running 24/7 forever, you'll have to add your credit card to Heroku. That upgrades you to 1000 free hours per month. Your card will not be charged as long as you stay on the free tier.

--- 

## Why do I need to provide my credit card to Heroku if it's 100% free?

Two things will make Heroku prompt you for your credit card, even though everything is 100% free:

1. to add the `mLab MongoDB` database
2. to boost your monthly free quota from 550 hours to 1000 hours

These extra features are free and your card will not be charged, but Heroku just wants to use them as an excuse to get your card on file.

If you are opposed to this, you can still use `secret campfire` without a credit card. [See how here.](ADVANCED.md#how-to-set-up-without-a-credit-card)

--- 

## How can I have multiple blogs?

First, repeat the steps in the [README](../README.md) for each new blog you want to create. 

Then, as you sign in to each of your blogs, `secret campfire` remembers all the blogs you own. All your connected blogs appear in a handy menu at the top right of the screen. Select the blog you want to browse as, and all your `secret campfire` actions will be performed for your selected blog. E.g., if you select your *first blog* from the menu and then click a `Reblog` button on a post, the post will be reblogged to your *first blog*. 

--- 

## How do I reset my password?

First, go to an online md5 hash generator like https://www.md5hashgenerator.com or http://onlinemd5.com . 

Next, enter your new text password and generate an md5 hash from it. E.g., if you enter `password` as your password, you'll get an md5 hash of `5f4dcc3b5aa765d61d8327deb882cf99`. Save the md5 hash of your new password for the next step.

Finally, open up your Database. Open your `settings` collection. Replace the old `password` hash with the new md5 hash you generated above and save.

---

## How do I upgrade my `secret campfire` blog to the latest official version?

[See here.](ADVANCED.md#how-to-upgrade-your-secret-campfire-blog-to-the-latest-official-version)

--- 

## I have a suggestion / I found a problem / Please halp / I want to contribute / I want to thank you from the bottom of my heart / I am a big fan

You can email me at kalona@secretcampfire.com. I read every email but I can't guarantee I'll answer every one. Thousands of people have joined already and more keep flooding in since Tumblr died. I'm only human, unfortunately, and I just can't do everything. That said, I give highest priority to clever suggestions and serious problems. And because of my delicate ego, I will always welcome flattery and praise.

--- 

## Why does my blog go to sleep after a while, and why does it take a long time to start back up again? 

When you deploy your `secret campfire` blog on Heroku for free, they set you up on their free `Dyno`. By default, that gives you 550 free hours per month. And if it receives no traffic for 30 minutes, your `Dyno` goes to sleep. If your blog gets visited while asleep, it will wake up again after a short delay. (https://devcenter.heroku.com/articles/free-dyno-hours).

To prevent your blog from sleeping, you can set up a service like Pingdom or New Relic to periodically ping your site. But if you do that, your blog will run 24/7 and you'll blow through your free quota in 23 days. 

To keep your blog running 24/7 forever, you'll have to add your credit card to Heroku. That upgrades you to 1000 free hours per month. Your card will not be charged as long as you stay on the free tier.

--- 

## Why are there many extra things I have to manage on my `secret campfire` blog?

Because you are now graduating from a *simple user of the Internet* to an __owner__. And just like with anything else, being an owner comes with responsibilities.

If you want things to be brain-dead simple, there are many other options available where someone else takes care of your blog for you. But as you know, the trade-off when someone runs your blog for you is that you don't really own anything. They own you.

If you want the freedom of owning and keeping what you own, there will be a slight learning curve. But these are good things to know, because knowledge is power. For years, all these other sites have happily kept people ignorant, helpless and in the dark. Think about it -- they don't want you to know how to run your own site. They make more money if you don't know how to run your own site and are completely dependent on them. 

In contrast, `secret campfire` will show you exactly how to run your own server so you can finally be independent and free. But of course, our goal is to make it as simple as possible -- it's only as hard as it needs to be but no harder.

--- 

## Why do I need to provide my credit card to Heroku if it's 100% free?

Two things will make Heroku prompt you for your credit card, even though everything is 100% free:

1. to add the `mLab MongoDB` database
2. to boost your monthly free quota from 550 hours to 1000 hours

These extra features are free and your card will not be charged, but Heroku just wants to use them as an excuse to get your card on file.

If you are opposed to this, you can still use `secret campfire` without a credit card. [See how here.](ADVANCED.md#how-to-set-up-without-a-credit-card)

--- 

## How do I unlock image file uploads?

[See here.](ADVANCED.md#how-to-unlock-image-file-uploads)

--- 

## How do I upgrade my `secret campfire` blog to the latest official version?

[See here.](ADVANCED.md#how-to-upgrade-your-secret-campfire-blog-to-the-latest-official-version)

--- 

## I have a suggestion / I found a problem / Please halp / I want to contribute / I want to thank you from the bottom of my heart / I am a big fan

You can email me at kalona@secretcampfire.com. I read every email but I can't guarantee I'll answer every one. Thousands of people have joined already and more keep flooding in since Tumblr died. I'm only human, unfortunately, and I just can't do everything. That said, I give highest priority to brilliant suggestions and serious problems. And because of my delicate ego, I will always welcome flattery and praise.

--- 

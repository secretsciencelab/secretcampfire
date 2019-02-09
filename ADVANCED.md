## How to set up Imgur for image file uploads

To unlock image file uploads via Imgur on `secret campfire`, you'll need to provide your own Imgur key. This is so that `secret campfire` is authorized to upload files to Imgur on your behalf.

To start, visit this page to *Register an Application*: https://api.imgur.com/oauth2/addclient 

Under *Authorization type*, make sure to select *Anonymous usage without user authentication*. You may enter anything you want in the remaining fields. Leave *Authorization callback URL* empty.

Click *submit* and on the next page you'll find your `Client ID` and your `Client secret`. Save both for your records, but what `secret campfire` needs is the `Client ID`. This is what you enter into your blog's `Settings` page.

Once you do this, image file upload buttons will be unlocked throughout your blog.

--- 

## How to set up your blog without needing a credit card

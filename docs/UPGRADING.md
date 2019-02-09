## Setup

1. Go to https://github.com/secretsciencelab/secretcampfire and click `Fork`. This pulls a snapshot of the master code into your personal GitHub account.

  ![Fork](media/upgrade-1-fork.png)

2. Go to https://dashboard.heroku.com and select your blog/app. Click on the `Deploy` tab and under `Deployment method` click ` GitHub`.

  ![Link GitHub](media/upgrade-2-link-github.png)

3. Find the `Connect to GitHub` section. Search for the `secretcampfire` repository in your GitHub account. (This was created in Step 1. above). Click `Connect`.

  ![Connect repository](media/upgrade-3-connect-repo.png)

4. Find the `Automatic deploys` section. Click `Enable Automatic Deploys`. Now whenever your personal `secretcampfire` repository is updated, the new code will automatically get installed on your blog.

  ![Enable automatic deploys](media/upgrade-4-auto-deploy.png)


## Syncing your blog to the latest code

1. Login to https://github.com and go to your snapshot/fork of `secretcampfire`. The URL should look like `https://github.com/<yourname>/secretcampfire`.
  

2. In your browser's address bar, add `/compare/master...secretsciencelab:master` to the end of the URL. The URL should now look like `https://github.com/<yourname>/secretcampfire/compare/master...secretsciencelab:master`.

3. Verify the changes you are about to sync from the master repository. Click `Create pull request`.

  ![Pull](media/sync-1-pull.png)

4. Enter some notes for your own reference if you like. Or just enter `Sync`. Click `Create pull request`

  ![Pull](media/sync-2-pull.png)

5. Scroll down and wait for the green button to pop up. Click `Merge pull request`. Click `Confirm merge`.

  ![Merge](media/sync-3-merge.png)

6. That's it! Because you set up your site to *automatically deploy* from this respository earlier, it will do just that. Now sit back and relax. In a few minutes, your blog will be upgraded to the latest code from the master repository. Enjoy!

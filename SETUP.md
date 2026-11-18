# Setting up the MAGIC GitHub profile

This folder is a complete, ready-to-push GitHub profile. Nothing here needs a paid service or a secret key.

## 1. Is `magicsolutions-tech` a personal account or an organisation?

Open https://github.com/magicsolutions-tech. If the left side shows "Followers / Following", it is a **personal account**: follow **Option A**.
If it shows "People" and "Repositories" tabs and a "Sponsor" or "Follow" button for the org, it is an **organisation**: follow **Option B**.

## Option A: personal account (a README shown at the top of the profile)

1. On GitHub choose **New repository**. Name it exactly `magicsolutions-tech` (the same as the username). Make it **Public**. Do not tick "Add a README".
2. In PowerShell, clone it and copy this folder's files in (the hidden `.github` folder must come across too):

   ```powershell
   cd D:\
   git clone https://github.com/magicsolutions-tech/magicsolutions-tech.git
   Copy-Item -Recurse -Force "D:\magicsolutions-web\docs\github-profile\*" "D:\magicsolutions-tech\"
   cd D:\magicsolutions-tech
   git add -A; git commit -m "feat: MAGIC profile README"; git push
   ```

   (Do not copy the `SETUP.md`, `optional` and `org-variant` folders if you do not want them in the public repo. They are harmless.)
3. In that repository open **Settings, Actions, General, Workflow permissions** and choose **Read and write permissions**, then Save.
4. Open the **Actions** tab, pick **Update profile** and click **Run workflow**. In about a minute it fills in your real numbers, languages, recent activity and repository list.
5. Open your profile page. The README is shown at the top.

## Option B: organisation

An organisation profile uses a special repository named `.github` with a file `profile/README.md`.

1. Create a public repository named `magicsolutions-tech` (it will hold the images and the refresh job). Push the files exactly as in Option A, steps 1 to 4.
2. Create a second public repository named `.github`. Add one file, `profile/README.md`, with the contents of `org-variant/profile/README.md` from this folder. That version uses full web addresses for the images, so it shows the pictures that live in the first repository.
3. Open https://github.com/magicsolutions-tech. The organisation page now shows the README.

In Option B the "Latest repositories" list is replaced by a link to the repositories tab, because the refresh job only updates the repository it runs in. The numbers, languages and activity pictures still refresh.

## What refreshes by itself

| Part | Source | How often |
|---|---|---|
| Repositories, stars, forks, followers | Public GitHub data | Every 6 hours |
| Language bar | Public repositories (forks and archived ones are ignored) | Every 6 hours |
| Recent activity (pushes, pull requests, issues, releases, stars) | Public events | Every 6 hours |
| Latest repositories list (Option A) | Public repositories | Every 6 hours |

Only **public** information is read. Private repositories and private activity never appear.

## Changing the look or wording

- The banner text, rotating lines and "What we build" tiles are at the top of `scripts/build-art.mjs`. Edit them, then run `node scripts/build-art.mjs` and commit the new `assets/*.svg`.
- The live cards are built by `scripts/generate.mjs`.
- Colours and fonts are in `scripts/theme.mjs`.

## Good to know

- GitHub plays the animations on github.com in a browser. In some apps and e-mail views the pictures may stay still.
- GitHub pauses scheduled jobs in a repository that has had no activity for 60 days. If the numbers stop updating, open the Actions tab and click **Run workflow** once.
- A personal account can also show the **contribution snake** (a snake eating your contribution squares). It is optional and not tested here: see `optional/snake.yml`. It does not work for organisations.
- Pin your best repositories manually on the profile page (**Customize your pins**); GitHub does not allow this to be automated.

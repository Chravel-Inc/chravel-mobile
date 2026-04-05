# Google Play Store Setup Guide

Step-by-step instructions to set up automated Android builds and Google Play submission for Chravel.

---

## Prerequisites

- Access to a Google account for the Play Developer account (use a company/team account, not personal)
- Access to the [chravel-mobile GitHub repo settings](https://github.com/Chravel-Inc/chravel-mobile/settings/secrets/actions) to add secrets
- The [EAS CLI](https://docs.expo.dev/eas/) installed locally (`npm install -g eas-cli`)

---

## Step 1: Create a Google Play Developer Account

1. Go to **https://play.google.com/console/signup**
2. Sign in with the Google account that will own the developer account
3. Accept the Google Play Developer Distribution Agreement
4. Pay the **$25 one-time registration fee**
5. Fill in your **Developer name** (e.g., "Chravel Inc") — this is public on the Play Store
6. Complete **identity verification**:
   - A valid government-issued ID is required
   - If registering as an organization, a D-U-N-S number is required
   - Verification can take **2-7 business days**
7. Once approved, you'll have access to the Google Play Console at **https://play.google.com/console**

---

## Step 2: Create the App Listing in Google Play Console

1. Go to **https://play.google.com/console**
2. Click **"Create app"** (top right)
3. Fill in:
   - **App name**: `Chravel`
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
4. Check all the declaration boxes and click **"Create app"**
5. Complete the required setup steps on the Dashboard:

### App content (left sidebar > Policy > App content)

- **App access**: Choose "All functionality is available without special access" OR provide test credentials (`demo@chravel.app`)
- **Ads**: Select "No, my app does not contain ads"
- **Content rating**: Click "Start questionnaire", answer questions, then "Save" > "Calculate" > "Apply"
- **Target audience**: Select your target age group (likely 18+)
- **News app**: Select "No"
- **COVID-19 contact tracing**: Select "No"
- **Data safety**: Fill out the form matching the iOS privacy manifest:
  - **Data collected**: Email, Name, Phone number, Photos/Videos, Precise location, User ID, Purchase history, App interactions, Crash logs
  - **Data shared**: None
  - **Encryption**: Yes, data encrypted in transit

### Store listing (left sidebar > Grow > Store listing)

- **Short description**: Brief tagline (max 80 chars)
- **Full description**: App description (max 4000 chars)
- **App icon**: 512x512 PNG (scale up `assets/icon.png` from the repo if needed)
- **Feature graphic**: 1024x500 banner image (required)
- **Phone screenshots**: At least 2 screenshots
- Click **"Save"**

---

## Step 3: Create a Google Cloud Service Account

This service account key allows EAS Submit to upload builds to Google Play automatically.

1. Go to **https://console.cloud.google.com**
2. Sign in with the **same Google account** that owns your Play Developer account
3. **Create a project**:
   - Click the project dropdown at the top > "New Project"
   - Name: `chravel-play-publishing`
   - Click "Create", then select the new project
4. **Enable the Google Play Android Developer API**:
   - Go to **https://console.cloud.google.com/apis/library**
   - Search for **"Google Play Android Developer API"**
   - Click on it > click **"Enable"**
5. **Create a Service Account**:
   - Go to **https://console.cloud.google.com/iam-admin/serviceaccounts**
   - Click **"+ Create Service Account"**
   - **Name**: `eas-play-submit`
   - **ID**: auto-fills as `eas-play-submit@your-project.iam.gserviceaccount.com`
   - Click **"Create and Continue"**
   - **Skip** "Grant this service account access to project" (click "Continue")
   - **Skip** "Grant users access to this service account" (click "Done")
6. **Generate a JSON key**:
   - Click on the `eas-play-submit` service account
   - Go to the **"Keys"** tab
   - Click **"Add Key"** > **"Create new key"**
   - Select **"JSON"**
   - Click **"Create"**
   - A `.json` file downloads — **keep this safe, never commit it to git**

The downloaded file looks like:
```json
{
  "type": "service_account",
  "project_id": "chravel-play-publishing",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "eas-play-submit@chravel-play-publishing.iam.gserviceaccount.com",
  ...
}
```

---

## Step 4: Grant Play Console Access to the Service Account

1. Go to **https://play.google.com/console**
2. Click **"Users and permissions"** (left sidebar, under Settings at the bottom)
3. Click **"Invite new users"**
4. **Email**: paste the service account email from Step 3 (e.g., `eas-play-submit@chravel-play-publishing.iam.gserviceaccount.com`)
5. Under **"App permissions"** tab:
   - Click **"Add app"** > select **"Chravel"** > click **"Apply"**
6. Grant these permissions:
   - **Releases**: "Create, edit, and roll out releases" — **check this**
   - **Store presence**: "Edit and delete draft apps" — **check this**
7. Click **"Invite user"** > **"Send invitation"**

> **Note**: There is typically a **24-48 hour delay** before the service account can upload builds. Google needs time to propagate permissions.

---

## Step 5: Add GitHub Repository Secrets

Go to **https://github.com/Chravel-Inc/chravel-mobile/settings/secrets/actions**

### Secret 1: `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`

1. Click **"New repository secret"**
2. **Name**: `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`
3. **Value**: Open the JSON key file from Step 3.6, copy the **entire file contents**, paste here
4. Click **"Add secret"**

### Secret 2: `REVENUECAT_ANDROID_API_KEY`

1. Click **"New repository secret"**
2. **Name**: `REVENUECAT_ANDROID_API_KEY`
3. **Value**: Your RevenueCat Android public API key (see Step 6 to get this)
4. Click **"Add secret"**

### Verify existing secrets

Ensure these already exist (from iOS setup):
- `EXPO_TOKEN` — EAS authentication token

---

## Step 6: Set Up RevenueCat for Android

1. Go to **https://app.revenuecat.com** and sign in
2. Select your **Chravel** project
3. Go to **"Projects"** > your project > **"Apps"**
4. Click **"+ New"** to add a new app
5. Select **"Google Play Store"**
6. Fill in:
   - **App name**: `Chravel (Android)`
   - **Google Play package**: `com.chravel.app`
7. **Google Play service credentials**:
   - Upload the same JSON key file from Step 3.6 (or create a dedicated one per [RevenueCat docs](https://www.revenuecat.com/docs/creating-play-service-credentials))
   - This lets RevenueCat verify purchases with Google
8. Click **"Save"**
9. **Copy the Android API key**:
   - Click on the Android app in the apps list
   - Find **"API Keys"** section
   - Copy the **"Public app-specific API key"** (starts with `goog_...`)
   - This goes in the `REVENUECAT_ANDROID_API_KEY` GitHub secret (Step 5)
10. **Set up products**:
    - In Google Play Console: go to **"Monetize"** > **"Subscriptions"**
    - Create subscription products matching your iOS in-app purchases
    - In RevenueCat: go to **"Products"**, add the Google Play product IDs
    - Link them to the same **Entitlements** and **Offerings** as iOS

---

## Step 7: First Local Android Build (Generate Keystore)

EAS manages Android signing keys automatically, but the first build must run to generate the keystore.

1. Open a terminal in the `chravel-mobile` directory
2. Verify you're logged into EAS:
   ```bash
   eas whoami
   ```
   If not logged in: `eas login`
3. Run the first Android production build:
   ```bash
   eas build --platform android --profile production --non-interactive
   ```
4. EAS will ask to generate a new Android Keystore — **select Yes**
5. Wait for the build to complete (10-20 minutes)
6. Note the download URL for the `.aab` file — you'll need it for Step 8

The keystore is stored securely on EAS servers and reused for all future builds.

---

## Step 8: First Manual Upload to Google Play

Google Play requires the **first** AAB to be uploaded manually before the API can submit subsequent builds.

1. Download the `.aab` file from the EAS build URL (Step 7)
2. Go to **https://play.google.com/console** > select **Chravel**
3. Left sidebar: **"Testing"** > **"Internal testing"**
4. Click **"Create new release"**
5. Click **"Upload"** and upload the `.aab` file
6. Add **Release notes** (e.g., "Initial internal test build")
7. Click **"Review release"** > **"Start rollout to Internal testing"**
8. **Add testers**:
   - Go to **"Internal testing"** > **"Testers"** tab
   - Create a testers list with email addresses
   - Share the opt-in link with testers

After this first manual upload, EAS Submit can upload subsequent builds automatically.

---

## Step 9: Verify Automated Pipeline

1. Push a commit to `main` (or trigger the workflow manually via Actions > "Run workflow")
2. Go to **https://github.com/Chravel-Inc/chravel-mobile/actions**
3. You should see three jobs: `test`, `build-ios`, `build-android`
4. The Android build should:
   - Build successfully
   - Auto-submit to Google Play internal testing track
5. Check Google Play Console > Internal testing to see the new build

---

## Promoting from Internal Testing to Production

When ready to publish to the Play Store:

1. Go to **Google Play Console** > **Chravel** > **"Testing"** > **"Internal testing"**
2. Click on the release you want to promote
3. Click **"Promote release"** > **"Production"**
4. Review and roll out

To switch to automatic production submissions later, change `"track": "internal"` to `"track": "production"` in `eas.json`.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "The caller does not have permission" on submit | Wait 24-48 hours after Step 4, or verify service account permissions |
| Build succeeds but submit fails | Ensure you completed Step 8 (first manual upload) |
| RevenueCat purchases not working | Verify Google Play service credentials in RevenueCat dashboard |
| Missing `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` secret | The Android build job will fail at the "Write Google Play service account key" step |
| Keystore issues | EAS manages keystores automatically; run `eas credentials` to inspect |

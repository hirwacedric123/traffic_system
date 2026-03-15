# Kigali Traffic Navigation System

A modern web application to help users navigate Kigali with real-time traffic updates, community-reported issues, and route recommendations. Includes user authentication and an admin dashboard for managing reports.

## Features

-**Route Planning:** Get directions between locations in Kigali with simulated real-time traffic conditions.
-**Interactive Map:** Google Maps integration for route display and location selection.
-**Start Navigation:** Start navigating through the chosen route with full route information like  Distance Remaining, Time Remaining and Current Speed all in a full screen mode with the route on the map.
-**Community Issue Reporting:** Users can report traffic jams, accidents, road closures, and more.
-**View & Filter Issues:** See all reported issues, filter by type/status, and view details.
-**Authentication:** Secure login and signup for users and admin.
-**Admin Dashboard:** Manage, filter, and update the status of reported issues.



## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/Kigali_Traffic_App.git
cd Kigali_Traffic_App
```

### 2. Google Maps API Key
This app uses Google Maps JavaScript API. You need to provide your own API key:

- Open `index.html` and `issue-report.html`.
- Replace the value of `key=YOUR_API_KEY` in the `<script src="https://maps.googleapis.com/maps/api/js?...">` tag with your actual Google Maps API key.

Example:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initMap" async defer></script>
```

### 3. Run the App
This is a static frontend app. You can open `index.html` directly in your browser, or use a local server for best results:

#### Using VSCode Live Server Extension
- Right-click `index.html` and select **Open with Live Server**.

### 4. Deploy with GitHub Pages
This app is deployed at **[https://hirwacedric123.github.io/traffic_system/](https://hirwacedric123.github.io/traffic_system/)**.

To enable or update the deployment:
1. Go to your repo **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/ (root)**, then **Save**.
4. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add `https://hirwacedric123.github.io/*` to your API key’s **HTTP referrers** so the map works on the live site.

### 5. Deploy with Firebase Hosting
The project includes a `firebase.json` config for [Firebase Hosting](https://firebase.google.com/docs/hosting).

1. **Install Firebase CLI** (if needed):
   ```bash
   npm install -g firebase-tools
   ```
2. **Log in** to your Google account:
   ```bash
   firebase login
   ```
3. **Create a Firebase project** (or use an existing one) at [Firebase Console](https://console.firebase.google.com/).
4. **Link this folder** to your project:
   ```bash
   firebase use --add
   ```
   Select your project and choose an alias (e.g. `default`).
5. **Deploy**:
   ```bash
   firebase deploy
   ```
   Your site will be at `https://<project-id>.web.app` (and `https://<project-id>.firebaseapp.com`).

6. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add `https://<project-id>.web.app/*` and `https://<project-id>.firebaseapp.com/*` to your Maps API key’s **HTTP referrers**.

## Folder Structure
```
Kigali_Traffic_App/
├── index.html           # Main app page (map, directions, issues)
├── script.js            # Main JS logic for map, routes, issues
├── admin.html           # Admin dashboard
├── admin.js             # Admin dashboard logic
├── admin.css            # Admin dashboard styles
├── auth.html            # Login/Signup page
├── auth.js              # Auth logic
├── auth.css             # Auth styles
├── issue-report.html    # Issue reporting page
├── issue-report.js      # Issue reporting logic
├── issue-report.css     # Issue reporting styles
```

## Usage
- **Sign Up / Log In:** Access the app via `auth.html`. Users can sign up or log in. Admin uses `admin@kigali.com` / `admin123`.

- **Get Directions:** Enter start and end locations, click **Get Directions**.
- **Start Navigation:** You can start navigation on the chosen route **Start Navigation**.
- **Report Issue:** Click **Report an Issue** to submit a new traffic problem.
- **View Issues:** Click **See Reported Issues** to view and filter community reports.
- **Admin:** Log in as admin to access the dashboard and manage issues.

## Customization
- **Change Map Center:** Edit the coordinates in `initMap()` in `script.js` and `issue-report.js`.
- **Add Issue Types:** Update the `<select>` in `issue-report.html` and related logic in JS files.

## Credits
- Developed by David Birenzi
- Powered by [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)


God Bless You!
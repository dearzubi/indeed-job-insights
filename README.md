# Indeed Job Insights

A Chrome extension that decorates Indeed job listings with information that helps you triage postings faster - without clicking into every card.

## What you get

- **Driving time from your address** shown on each card.
- **Work mode badge** (Remote / Hybrid / Onsite) inferred from the posting.
- **City-mention pill** when the description mentions your home city or a nearby city you've listed.
- **Keyword hit count** based on your own list of keywords, with matches highlighted inline in the snippet and in the full description.
- **Excluded-keyword count** so you can see at a glance how many red-flag terms a posting contains.
- **"X interested" pill** showing how many people have started applying.
- **Posted-date pill** ("Posted today" / "5 days ago").
- **Must-have skills panel** in the detail pane, listing the skills Indeed has flagged as hard requirements.
- **Employer insights panel** in the detail pane (response rate, typical reply time).
- **Dimming** - optional, so low-relevance cards fade into the background:
  - Zero-match cards (no keyword hits, no city mention).
  - Cards where excluded keywords outnumber your keyword hits.

Everything is cached locally and rate-limited, so repeated scrolling stays fast and stays well under API free tiers.

## Before you install

You need a Google Maps API key with the **Routes API** enabled. The driving-time feature won't work without it. Everything else (pills, highlights, insights) works regardless.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick one you already use).
3. Enable the **Routes API**.
4. Create an API key under *APIs & Services → Credentials*.
5. Restrict the key: under *Application restrictions* pick "HTTP referrers" and allow `https://*.indeed.com/*`; under *API restrictions* limit it to the Routes API.

Pricing: usage falls under "Compute Route Matrix Essentials" - 10,000 free calls per month, then $5 per 1,000. Personal job hunting fits in the free tier easily thanks to the local cache.

## Install the extension

1. Download or clone this repository.
2. In a terminal, from the project root, run:
   ```bash
   pnpm install
   pnpm build
   ```
   (You'll need Node 22+ and pnpm 10+. If you don't have pnpm: `npm install -g pnpm`.)
3. Open Chrome and navigate to `chrome://extensions`.
4. Toggle **Developer mode** on (top-right).
5. Click **Load unpacked** and select the `dist/` folder from this repo.
6. The extension is now installed. Pin it to the toolbar so you can open the popup later.

## First-time setup

After installing, click the extension icon and pick **Open options** - or right-click the icon and choose *Options*. Fill in:

- **Your address** - your full address (e.g. `1 High St, Woking, UK`) or just a city (e.g. `Mississauga, ON`). This is the origin for driving-time calculations and the "home city match" detection. Using a full address gives more accurate driving times; using just a city is fine if that's all you want.
- **Nearby cities** - one per line. Cards whose description mentions any of these get a "…mentioned" pill.
- **Keywords** - one per line. Whole-word, case-insensitive matches. These are what the extension highlights in green and counts per card.
- **Excluded keywords** - one per line. Highlighted in red; counted but not treated as positive signal. Used by the "excluded > keyword hits" dim rule.
- **Google Maps API key** - paste the key you created above.
- **Dim zero-match cards by default** - optional. Fades cards with no keyword hits and no city mention.
- **Dim cards where excluded hits outnumber keyword hits** - optional, on by default. Fades cards whose description contains more excluded hits than keyword hits.

Click **Save**. Your settings stay on your machine (local Chrome storage) - nothing syncs to Google.

## Using it

Open any Indeed page. The extension runs automatically on:

- `*.indeed.com/jobs` (search results).
- `*.indeed.com/` (homepage job feed).
- Any posting page or detail pane you land on from there.

As cards scroll into view, the extension fetches each posting's detail page in the background (rate-limited to one request per second so Indeed's bot protection doesn't kick in), extracts location and insight data, computes driving time via Google Maps, and renders everything as a footer inside each card. The right-hand detail pane gets the must-have skills and employer insights panels above the description.

The popup (click the toolbar icon) gives you instant toggles for the two dim modes without reopening the full options page.

## Tips

- **Changing your address or API key** takes effect on the next card view - no extension reload needed, though already-decorated cards keep their old driving times until the cache entry expires (30 days).
- **If driving-time badges show `⚠`**, click the badge to see the error. Most commonly: the API key isn't valid yet (Google keys take a minute to propagate), the Routes API isn't enabled, or the key has a referrer restriction that blocks `indeed.com`.
- **If no decorations appear**, make sure you reloaded the extension after building, and that you're on a page with job cards (homepage feed or `/jobs` search).
- **To pause on a specific tab**, uninstall/reinstall isn't needed - just close the tab; the extension has no global state that outlives a page.

## Privacy

- Nothing leaves your machine except:
  - Requests to Google's Routes API with your address and each listing's location (needed for driving time).
  - Requests to Indeed's own `/viewjob` endpoint (the same one your browser would hit if you clicked the card).
- Your API key, keywords, cities, and toggle state are stored in `chrome.storage.local` and never synced.

# OmniStream Browser Extension 2.0

<div align="center">
  <img src="assets/icons/icon128.png" alt="OmniStream" width="128" height="128">
  <h3>Stream, Download & Save TeraBox Content Instantly</h3>
  <p>Skip ads. Get direct links. Manage your files.</p>
</div>

---

## ✨ Features

### 🎯 TeraBox Page Enhancement
When you visit a TeraBox link, OmniStream automatically:
- Shows file info (name, size, type)
- Provides one-click streaming and download
- Displays cached status for faster access
- Allows saving to your OmniStream library

### 🔍 Smart Link Detection
- Detects TeraBox links on any webpage
- Adds quick-save buttons next to links
- Auto-detects links copied to clipboard

### 📱 Premium Popup UI
- Beautiful dark theme with glassmorphism
- Current page file info
- Quick URL input with paste support
- Library, Recent, and Stats tabs
- Full sync with OmniStream web app

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Alt + T` | Open OmniStream popup |
| `Alt + S` | Save current page link |
| `Alt + D` | Quick download current file |

### 🖱️ Context Menu
Right-click on any TeraBox link to:
- ❤️ Save to Favorites
- ▶️ Stream Now
- ⬇️ Download
- 📋 Copy Direct Link

### ⚙️ Customizable Settings
- Show/hide overlay on TeraBox pages
- Enable/disable notifications
- Configure default actions
- Light/Dark theme support

---

## 📦 Installation

### Chrome / Edge / Brave

1. **Download** the extension folder
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `extension-starter` folder
6. Done! 🎉

### Firefox (Coming Soon)
Firefox version is under development.

---

## 🔧 Project Structure

```
extension-starter/
├── manifest.json           # Extension manifest (MV3)
├── background/
│   └── service-worker.js   # Background scripts, API, notifications
├── content/
│   ├── terabox-enhancer.js # TeraBox page overlay injection
│   ├── overlay.css         # Overlay styles
│   └── link-detector.js    # Link detection on all pages
├── popup/
│   ├── popup.html          # Popup UI structure
│   ├── popup.css           # Popup styles
│   └── popup.js            # Popup interactions
├── options/
│   ├── options.html        # Settings page
│   ├── options.css         # Settings styles
│   └── options.js          # Settings logic
├── assets/
│   └── icons/              # Extension icons
└── README.md               # This file
```

---

## 🔐 Permissions Explained

| Permission | Why Needed |
|------------|------------|
| `storage` | Save settings, cached data, and recent links |
| `notifications` | Show alerts when files are ready |
| `contextMenus` | Add right-click options on links |
| `activeTab` | Access current tab to detect TeraBox pages |
| `scripting` | Inject content scripts on TeraBox pages |
| `clipboardRead` | Detect TeraBox links in clipboard |
| `alarms` | Schedule periodic cache cleanup |

---

## 🛡️ Privacy

- **No data collection**: We don't collect any personal data
- **Local storage**: All settings are stored locally
- **Secure API calls**: Communication with OmniStream uses HTTPS
- **Open source**: Review the code yourself

---

## 🔗 Integration with OmniStream App

This extension integrates seamlessly with [OmniStream](https://terastream-vault.lovable.app):

1. **Sign in** once in the web app
2. **Token is shared** with the extension
3. **Sync favorites** across devices
4. **Track downloads** in your dashboard

---

## 🚀 Development

### Prerequisites
- Node.js 18+ (optional, for icon generation)
- Chrome/Edge browser

### Setup
```bash
# Clone the repo
git clone https://github.com/your-repo/terastream.git
cd terastream/extension-starter

# Load in browser (see Installation section)
```

### Making Changes
1. Edit files in the `extension-starter` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the OmniStream extension
4. Test your changes

### Building for Production
Currently no build step required. The extension runs as-is.

---

## 🐛 Troubleshooting

### Extension not loading?
- Check for errors in `chrome://extensions/`
- Ensure all files are present (especially icons)
- Make sure manifest.json is valid JSON

### Overlay not showing?
- Check if you're on a TeraBox share page (URL contains `/s/`)
- Make sure "Show overlay" is enabled in settings
- Try refreshing the page

### Not authenticated?
- Visit the OmniStream web app and sign in
- The extension will sync your authentication

### API errors?
- Check your internet connection
- The TeraBox API might be rate-limited
- Try again in a few minutes

---

## 📝 Changelog

### v2.0.0 (Current)
- ✨ Complete redesign with premium UI
- 🎯 TeraBox page overlay with file info
- 📋 New popup with Library, Recent, Stats
- ⌨️ Keyboard shortcuts
- ⚙️ Full settings page
- 🔔 Smart notifications
- 🔍 Link detection on all pages

### v1.0.0
- Initial release
- Basic link saving functionality

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details

---

<div align="center">
  <p>Made with ❤️ by Md Ashraful Islam</p>
  <a href="https://terastream-vault.lovable.app">Website</a> •
  <a href="https://terastream-vault.lovable.app/help">Help</a> •
  <a href="https://github.com/your-repo/terastream">GitHub</a>
</div>

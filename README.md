# File Vault

A secure, local-only encrypted file storage PWA protected by a 6-digit PIN. Designed primarily for iPhone, installed via Safari's "Add to Home Screen".

All files are encrypted before storage using AES-256-GCM. No data ever leaves the device — no backend, no server, no network calls.

## Running Locally

```bash
npm install
npm run dev
```

### Testing on iPhone

1. Find your computer's local IP address (e.g., `192.168.1.100`)
2. Run with host access:
   ```bash
   npm run dev -- --host
   ```
3. For HTTPS (required for full PWA features), use a tool like [mkcert](https://github.com/FiloSottile/mkcert) to create a local cert:
   ```bash
   mkcert -install
   mkcert localhost 192.168.1.100
   npm run dev -- --host --https --cert ./192.168.1.100+1.pem --key ./192.168.1.100+1-key.pem
   ```
4. Open `https://192.168.1.100:5173` in Safari on your iPhone

Alternatively, use [ngrok](https://ngrok.com/) to create a temporary HTTPS tunnel:
```bash
npx ngrok http 5173
```

## Installing to iPhone Home Screen

1. Open the app URL in **Safari** (not Chrome or other browsers)
2. Tap the **Share** button (square with arrow) at the bottom of Safari
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top-right corner
5. The app will now appear on your home screen and run in full-screen standalone mode

## Production Build

```bash
npm run build
```

Outputs a static `dist/` folder. Serve with any static file server.

## Security Model

- **PIN-based encryption**: A 6-digit PIN is used to derive a 256-bit encryption key via PBKDF2 (SHA-256, 600,000 iterations) with a random salt
- **AES-256-GCM**: Every file is encrypted using AES-256-GCM via the Web Crypto API before writing to IndexedDB. A unique IV is stored alongside each encrypted blob
- **No PIN storage**: The PIN is never stored. Only the salt (localStorage) and encrypted canary values (IndexedDB) persist
- **Memory safety**: Decrypted file bytes exist only in memory for the duration of a preview and are dereferenced immediately after. Object URLs are revoked on close
- **Zero network**: The app makes zero network requests, enforced by Content Security Policy
- **Auto-lock**: On app backgrounding, all decrypted data is cleared from memory and the PIN screen is shown

## Decoy Vault

File Vault includes a **decoy vault** system for plausible deniability:

- During setup, you create two PINs: a **real PIN** and a **decoy PIN**
- Entering the real PIN unlocks your actual vault with all your files
- Entering the decoy PIN unlocks a separate, empty vault
- Both vaults are **visually and behaviorally identical** — there is no way to tell which vault is active
- You can optionally add harmless files to the decoy vault to make it look convincing
- The decoy vault can be cleared from Settings

## Resetting the Vault

If you forget your PIN, the only option is to destroy all data and start over:

1. The app provides a "Destroy Everything" button in Settings (requires triple confirmation)
2. Alternatively, clear the site's data through your browser settings:
   - **iOS**: Settings > Safari > Advanced > Website Data > find the site > Delete
   - **Desktop**: DevTools > Application > Storage > Clear site data

## Browser Compatibility

- **iOS Safari 16.4+** required for full PWA and IndexedDB support
- Chrome, Firefox, and Edge on desktop are also supported
- The app is optimized for the iPhone standalone PWA experience

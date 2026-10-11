# VRK Tax Solutions — website (Netlify, static)

Plain HTML / CSS / JavaScript (Design A). No server, database or admin page.

```
public/                 the published site (Netlify "publish" directory)
  index, about, services, contact, service-*.html, site.css
  js/enquiry.js         enquiry form -> owner's WhatsApp
  assets/               logo + office photos
netlify.toml            publish dir + security headers
dev-server.mjs          local preview (npm run local -> http://localhost:8888)
```

## How enquiries reach the owner
- Every **"Book a consultation"** button opens WhatsApp to **+91 90921 88514** with a ready message.
- The **enquiry forms** (Contact page and each service page) validate the details, then open WhatsApp
  to the same number with the name, mobile, email, service and message pre-filled — the visitor presses Send.
- To change the number, edit `WA_NUMBER` in `public/js/enquiry.js` and regenerate/replace the `wa.me/…` links in the pages.

## Deploy (Netlify free)
Import the GitHub repo in Netlify (Add new site → Import from Git). No build command; publish directory `public`
(read from `netlify.toml`). Add the custom domain `vrktaxsolutions.in` under Domain management.

## Run locally
```
npm run local     # http://localhost:8888
```

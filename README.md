# The Global Academy — UX Mockup Package

A static HTML/CSS/JS mockup for iterating on UX ahead of the Node.js rebuild.
No build tools, no dependencies beyond one Google Fonts link.

## Structure
```
index.html
css/style.css
js/main.js
images/            (empty — see below)
download-images.sh (fetches the real images from theglobalacademy.ac)
```

## Setup

1. Get the images. This sandbox couldn't reach theglobalacademy.ac to
   download them for you, so grab them yourself on a machine with network
   access:
   ```
   chmod +x download-images.sh
   ./download-images.sh
   ```
   This pulls the logo, hero banner, researcher photos, article thumbnails,
   and footer badges directly from your live site into `images/`.

   If curl isn't available (e.g. plain Windows), open each URL in
   `download-images.sh` in a browser and save it into `images/` under the
   matching filename instead.

2. Open `index.html` directly in a browser — or serve it locally:
   ```
   npx serve .
   ```
   or
   ```
   python3 -m http.server 8000
   ```

## Notes for design iteration
- `css/style.css` — all styling, using CSS custom properties at the top
  (`--brand-blue`, `--cream`, etc.) pulled from your site's real
  `wp-custom-css`. Change those variables to test palette ideas quickly.
- `--footer-dark` is an assumption — the real footer background color
  wasn't visible in the source I had; adjust if it's wrong.
- SDG goal badge colors (`--goal-2/3/4`) are the real official colors from
  your `acf-researcher-goals-style-inline-css`.
- `js/main.js` only handles the mobile menu toggle — everything else is
  static markup, easy to restructure.

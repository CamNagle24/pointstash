Drop icon-16.png, icon-48.png, and icon-128.png here.

Chrome refuses to load an unpacked extension if a referenced icon file is
missing, so until real artwork is ready, either:
  1. Replace these with any valid PNGs at those exact sizes, or
  2. Remove the "default_icon" and "icons" blocks from manifest.json.

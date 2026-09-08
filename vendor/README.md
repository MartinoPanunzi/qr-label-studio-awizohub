# vendor/ — offline support for warehouses without internet
CDN is default (index.html). To vendor locally:

1. Run: `npm run vendor` (downloads bwip-js + jspdf into vendor/)
2. In index.html replace the two CDN <script> with:
```html
<script src="vendor/bwip-js-min.js"></script>
<script src="vendor/jspdf.umd.min.js"></script>
```
Why: warehouses often have no internet; printing must not depend on CDN.

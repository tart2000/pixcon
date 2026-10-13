# Pixicons

11×11 pixel icons with personality, in 9 styles. Browse them on [pixicons.io](https://www.pixicons.io).

This package is the Pixicons kit, mirrored from `https://www.pixicons.io/kit/pixicons.js`. A new version is
published whenever icons are added or redrawn.

## Use

From the CDN, with no install (`@latest` always serves the newest icons):

```html
<script src="https://cdn.jsdelivr.net/npm/pixiconsio@latest/pixicons.js"></script>

<i class="px px-heart px-blob px-fill"></i>
```

Or with npm and a bundler:

```bash
npm install pixiconsio
```

```js
// in your app's entry file
import "pixiconsio";
```

Each icon is `px px-{name} px-{style} px-{variant}`:

- styles: `pixel`, `rounded`, `blob`, `liquid`, `liquid-blob`, `retro`, `stitch`, `knit`, `dots`
- variants: `regular`, `fill`

Icons are 1em square and use the current text colour. Page-wide defaults:
`<script src="…" data-style="blob" data-variant="fill"></script>`.

More on [pixicons.io/how-to](https://www.pixicons.io/how-to).

## License

MIT

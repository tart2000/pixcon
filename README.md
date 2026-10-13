# Pixicons for WeWeb

A WeWeb coded element that shows any [Pixicons](https://www.pixicons.io) icon.

It loads the Pixicons kit (`https://www.pixicons.io/kit/pixicons.js`) into the page and renders
`<i class="px px-{icon} px-{style} px-{variant}">`, so new icons are available as soon as they
are published on pixicons.io, with no update of this component.

## Properties

| Property | Section | Description |
|---|---|---|
| Icon | Settings | Icon name from pixicons.io, e.g. `heart`. Bindable. |
| Variant | Settings | `regular` or `fill`. |
| Style | Settings | `pixel`, `rounded`, `blob`, `liquid`, `liquid-blob`, `retro`, `stitch`, `knit`, `dots`. |
| Accessible label | Settings | Read by screen readers. Leave empty for a decorative icon. |
| Size | Style | Icon size (sets the font size; the icon is 1em square). |
| Color | Style | Icon colour. Empty uses the surrounding text colour. |

## Develop

```bash
npm install
npm run serve --port=8080
```

Then in WeWeb: Dev → Open Dev Editor → Add local Element, with the same port.

## Publish

In the WeWeb workspace dashboard: Coded components → Import element, pick this repository and
the `weweb` branch. For an update, bump `version` in `package.json` and push.

## Check the build

```bash
npx weweb build --name=pixicons-icon --type=wwobject
```

const STYLES = [
  { value: "pixel", label: "Pixel" },
  { value: "rounded", label: "Rounded" },
  { value: "blob", label: "Blob" },
  { value: "liquid", label: "Liquid" },
  { value: "liquid-blob", label: "Liquid Blob" },
  { value: "retro", label: "Retro" },
  { value: "stitch", label: "Stitch" },
  { value: "knit", label: "Knit" },
  { value: "dots", label: "Dots" },
];

export default {
  editor: {
    label: { en: "Pixicons icon" },
    icon: "star",
  },
  properties: {
    icon: {
      label: { en: "Icon" },
      type: "Text",
      section: "settings",
      options: { placeholder: "heart" },
      defaultValue: "heart",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: "string", tooltip: "An icon name from pixicons.io, e.g. heart, arrow-right" },
      propertyHelp: { tooltip: "Any icon name listed on https://www.pixicons.io" },
      /* wwEditor:end */
    },
    variant: {
      label: { en: "Variant" },
      type: "TextSelect",
      section: "settings",
      options: {
        options: [
          { value: "regular", label: "Regular" },
          { value: "fill", label: "Fill" },
        ],
      },
      defaultValue: "regular",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: "string", tooltip: "regular | fill" },
      /* wwEditor:end */
    },
    iconStyle: {
      label: { en: "Style" },
      type: "TextSelect",
      section: "settings",
      options: { options: STYLES },
      defaultValue: "pixel",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: "string", tooltip: STYLES.map((s) => s.value).join(" | ") },
      /* wwEditor:end */
    },
    label: {
      label: { en: "Accessible label" },
      type: "Text",
      section: "settings",
      options: { placeholder: "Leave empty if decorative" },
      defaultValue: "",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: "string", tooltip: "Read by screen readers; empty hides the icon from them" },
      /* wwEditor:end */
    },
    size: {
      label: { en: "Size" },
      type: "Length",
      section: "style",
      options: { unitChoices: [{ value: "px", label: "px", min: 1, max: 1000 }, { value: "em", label: "em", min: 0.1, max: 50, digits: 2 }] },
      defaultValue: "24px",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: "string", tooltip: "A CSS length, e.g. 24px or 1.5em" },
      /* wwEditor:end */
    },
    color: {
      label: { en: "Color" },
      type: "Color",
      section: "style",
      defaultValue: "",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: "string", tooltip: "A CSS colour; empty uses the text colour around the icon" },
      /* wwEditor:end */
    },
  },
};

<template>
  <span
    class="pixicons-icon"
    :style="rootStyle"
    :role="label ? 'img' : null"
    :aria-label="label || null"
    :aria-hidden="label ? null : 'true'"
  >
    <!-- The Pixicons kit turns this into an inline SVG (and redraws it when the classes change). -->
    <i :class="classes"></i>
  </span>
</template>

<script>
import { computed, onMounted } from "vue";

const KIT_URL = "https://www.pixicons.io/kit/pixicons.js";

/** Load the kit once into the page the icons live in (the editor canvas is its own document). */
function loadKit() {
  const doc = wwLib.getFrontDocument();
  if (!doc || doc.querySelector(`script[src="${KIT_URL}"]`)) return;
  const script = doc.createElement("script");
  script.src = KIT_URL;
  script.async = true;
  doc.head.appendChild(script);
}

export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  setup(props) {
    onMounted(loadKit);

    const name = computed(() =>
      String(props.content?.icon || "")
        .trim()
        .toLowerCase(),
    );
    const classes = computed(() => [
      "px",
      name.value && `px-${name.value}`,
      `px-${props.content?.iconStyle || "pixel"}`,
      `px-${props.content?.variant || "regular"}`,
    ]);
    const label = computed(() => props.content?.label || "");
    const rootStyle = computed(() => ({
      fontSize: props.content?.size || "24px",
      color: props.content?.color || undefined,
    }));

    return { classes, label, rootStyle };
  },
};
</script>

<style lang="scss" scoped>
.pixicons-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>

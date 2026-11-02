<script lang="ts">
import { cloneVNode, defineComponent, h, isVNode, TransitionGroup } from 'vue'

export default defineComponent({
  name: 'AppStagger',
  inheritAttrs: false,
  props: {
    tag: { type: String, default: 'div' },
  },
  setup(props, { slots, attrs }) {
    return () => h(TransitionGroup, { ...attrs, name: 'motion-stagger', tag: props.tag, appear: true }, {
      default: () => (slots.default?.() ?? []).map((child, index) => isVNode(child)
        ? cloneVNode(child, { style: { '--motion-index': Math.min(index, 9) } })
        : child),
    })
  },
})
</script>

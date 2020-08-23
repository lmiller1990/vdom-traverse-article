import { ComponentInternalInstance, VNodeTypes, isVNode, VNode } from 'vue'

interface NamedComponent {
  name?: string
}

// safely handles circular references
const safeStringify = (obj: any, indent = 2) => {
  let cache: any[] = [];
  const retVal = JSON.stringify(
    obj,
    (key, value) =>
      typeof value === "object" && value !== null
        ? cache.includes(value)
          ? undefined // Duplicate reference found, discard key
          : cache.push(value) && value // Store value in our collection
        : value,
    indent
  );
  return retVal;
};

const debug = false

const isObject = (arg: any) => typeof arg === 'object'

export const matches = (vnode: VNode, query: NamedComponent): number => {
  const nodeType = vnode.type
  if (isObject(nodeType) && nodeType['name']) {
    if (debug) {
      console.log(`Traversed: ${nodeType['name']}`)
    }

    if (nodeType['name'] === query.name) {
      if (debug) {
        console.log(vnode)
      }
      if (vnode?.component?.uid) {
        return vnode.component.uid
      }
      return Math.random()
    }
  }

  return 0
}

export const findComponentCounts = (vnodes: VNode[], query: NamedComponent): number => {
  const results = findComponentCount(vnodes, query, {})
  return Object.keys(results).length
}

export const findComponentCount = (vnodes: VNode[], query: NamedComponent, uids: Record<string, true>): Record<string, true> => {
  const result = vnodes.reduce((acc, vnode) => {
    const uid = matches(vnode, query)
    if (uid) {
      return { ...acc, [uid]: true }
    }

    if (vnode.component?.vnode) {
      const uid = matches(vnode.component.vnode, query)
      if (uid) {
        return {...acc, [uid]: true }
      }

      if (vnode.component?.subTree) {
        const uid = matches(vnode.component.subTree, query)
        if (uid) {
          return { ...acc, [uid]: true }
        }
      }

      if (vnode.component.subTree) {
        if (vnode.component.subTree.children) {
          if (vnode.component.subTree.children && Array.isArray(vnode.component.subTree.children)) {
            const nodes = vnode.component.subTree.children.filter(isVNode)
            return findComponentCount(nodes, query, uids)
          } else {
            if (isObject(vnode.component.subTree.children) && vnode.component.subTree.children['default']) {
              const slot = vnode.component.subTree.children['default']()
              console.log(slot)
              if (Array.isArray(slot)) {
                return findComponentCount(slot, query, uids)
              } else {
                const nodes = isVNode(slot) ? [slot] : []
                return findComponentCount(nodes, query, uids)
              }
            }

            const nodes = isVNode(vnode.component.subTree.children) ? [vnode.component.subTree.children] : []
            return findComponentCount(nodes, query, uids)
          }
        }

        return findComponentCount([vnode.component.subTree], query, uids)
      }
    }

    return acc
  }, {})

  return result
}

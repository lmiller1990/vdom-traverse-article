require('jsdom-global')()
const assert = require('assert')
const { createApp, h } = require('vue')

const A = { 
  name: 'A',
  data() {
    return { msg: 'msg' }
  },
  render() {
    return h('div', 'A')
  }
}

const B = { 
  name: 'B',
  render() {
    return h('span', h(A))
  }
}

const C = { 
  name: 'C',
  data() {
    return { foo: 'bar' }
  },
  render() {
    return h('p', { id: 'a', foo: this.foo }, h(B))
  }
}

const app = createApp(C).mount(document.createElement('div'))

function matches(vnode, target) {
  if (!vnode) {
    return false
  }

  return vnode.type === target
}

function findComponent(comp, { within }) {
  const result = find([within.$], comp, [])
  if (result) {
    return result[0]
  }
}

function find(vnodes, target, found) {
  if (!Array.isArray(vnodes)) {
    return found
  }

  return vnodes.reduce((acc, vnode) => {
    if (matches(vnode, target)) {
      return [...acc, vnode]
    }

    if (vnode?.subTree?.children) {
      return find(vnode.subTree.children, target, found)
    }

    if (vnode?.component?.subTree) {
      return find(vnode.component.subTree.children, target, found)
    }

    return acc
  }, [])
}

const result = findComponent(A, { within: app })
console.log(
  result.component.proxy.msg
)

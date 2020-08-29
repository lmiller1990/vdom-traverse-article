require('jsdom-global')()
const { h, createApp } = require('vue')

const Bottom = {
  name: 'Bottom',
  data() {
    return {
      msg: 'msg'
    }
  },
  computed: {
    greeting() {
      return this.msg.toUpperCase()
    }
  },
  render() {
    return h('h6', 'TITLE')
  }
}
const A = {
  name: 'A',
  render() {
    return h('h4', h(Bottom))
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
  render() {
    return h('div', h(B))
  }
}

// console.log(app.$
//   .subTree.children[0].component
//   .subTree.children[0].component.type)

const app = createApp(C).mount(document.createElement('div'))

function matches(vnode, target) {
  return vnode.type === target
}

function find(vnodes, target) {
  return vnodes.reduce((acc, vnode) => {
    if (matches(vnode, target)) {
      return vnode
    }

    if (vnode?.subTree?.children) {
      return find(vnode.subTree.children, target)
    }

    if (vnode?.component?.subTree?.children) {
      return find(vnode.component.subTree.children, target)
    }
  }, {})
}

function findComponent(target, { within }) {
  return find([within.$], target)
}

const result = findComponent(Bottom, { within: app })

console.log(result.component.proxy.greeting)

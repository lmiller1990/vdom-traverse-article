In this article, we do a dive into the *virtual dom* in Vue.js 3, and how we can traverse it with the goal of finding a specific component (or what we will call a `vnode` - more on this soon).

Most of the time, you don't need to think about how Vue internally represents your components. Some libraries do make sure of this though - one such library is Vue Test Utils and it's `findComponent` function. Another such use case is the Vue DevTools, which show you the component hierarchy for your application, seen on the left hand side of this screenshot.

![](https://raw.githubusercontent.com/vuejs/vue-devtools/dev/media/screenshot-shadow.png)

Note: this is a technical article. While I will do my best to explain how everything works, the only real way to fully grasp this is to write your own code and `console.log` a lot, to see what's really happening. This is often the nature of the type of recursive algorithm we will be writing.

An alternative would be to watch the accompanying screencast, will I will make free indefinitely. You can find the [source code for this example here](https://github.com/lmiller1990/vdom-traverse-article).


## The Virtual DOM

For various reasons, one of which is performance, Vue keeps an internal representation  of the component hierarchy. This is called a Virtual DOM (VDOM). When something changes (for example a prop) Vue will figure out if something needs to be updated, calculate the new representation, and finally, update the DOM. A trivial example might be:

```html
<div>
  <span v-if="show">Visible</span>
</div>
```

It could be represented like this:

```yml
- div
  - span
    - 'Visible'
```

So it would be `HTMLDivElement -> HTMLSpanElement -> TextNode`. If `show` becomes `false`, Vue would update it's Virtual DOM:

```yml
- div
```

Then, finally, Vue would update the DOM, removing the `<span>`.

## Our Goal - findComponent

Our goal will be to implement a subset of `findComponent`, part of the Vue Test Utils API. We will write something like this:

```js
const { createApp } = require('vue')

const App = {
  template: `
    <C>
      <B>
        <A />
      </B>
    </C>
  `
}

const app = createApp(App).mount('#app')

const component = findComponent(A, { within: app })
// we found <A />!
```

To have a working `findComponent` function, we need to traverse the Virtual DOM, a tree like structure of arbitrary depth. Let's get started.

## Inspecting the Component Internals

If you would like to follow along, you can grab the source code [here](). We will just use Node.js (v14, so we can use the `?` or "optional chaining" operator). You will need Vue, jsdom and jsdom-global installed.

Start with setting up a simple app with some components:

```js
// import jsdom-global. We need a global `document` for this to work.
require('jsdom-global')()
const { createApp, h } = require('vue')

// some components
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

// mount the app!
const app = createApp(C).mount(document.createElement('div'))
```

We start of with some imports to ensure we have a globally available `document` to work with. This will let us have somewhere to mount our app. We set up some simple components - we are using `render` functions instead of `template` because it simplifies this example a little bit. We will discuss why that is later on. Finally, we create the app.

Some of the components have `data` and `props` - this will be useful as we investigate the Virtual DOM Vue creates for our app. 

If you go ahead and do either `console.log(app)` or `console.log(Object.keys(app))`, you don't see anything - just `{}`. `Object.keys` will only show enumerable properties - ones that show up in a `for...of` loop. There are some hidden non enumerable properties, though, which we can `console.log`. Try doing `console.log(app.$)`. You get a whole bunch of information:

```js
<ref *1> {
  uid: 0,
  vnode: {
    __v_isVNode: true,
    __v_skip: true,
    type: {
      name: 'C',
      data: [Function: data],
      render: [Function: render],
      __props: []
    },

    // hundreds of lines ...
```

You can do `console.log(Object.keys(app.$))` to have a summary of what's available:

```js
Press ENTER or type command to continue
[
  'uid',         'vnode',       'type',
  'parent',      'appContext',  'root',
  'next',        'subTree',     'update',
  'render',      'proxy',       'withProxy',
  'effects',     'provides',    'accessCache',
  'renderCache', 'ctx',         'data',
  'props',       'attrs',       'slots',
  'refs',        'setupState',  'setupContext',
  'suspense',    'asyncDep',    'asyncResolved',
  'isMounted',   'isUnmounted', 'isDeactivated',
  'bc',          'c',           'bm',
  'm',           'bu',          'u',
  'um',          'bum',         'da',
  'a',           'rtg',         'rtc',
  'ec',          'emit',        'emitted'
]
```

It's obvious what some of the properties do - `slots` and `data` for example. `suspense` is used for the new `<Suspense>` feature. `emit` is something every Vue dev knows, same as `attrs`. `bc`, `c`, `bm` etc are lifecycle hooks - `bc` is `beforeCreate`, `c` is `created`. There are some internal only lifecycle hooks, like `rtg` - it's `renderTriggered`, used for updates after something changes and causes a re-render, like `props` or `data` changing.

We are interested in `vnode`, `subTree`, `component`, `type` and `children`. 

## Comparing Components

Let's take a look at `vnode`. Again it has many properties, the two we will look at are `type` and `component`:

```js
console.log(app.$.vnode.component)

<ref *1> {
  uid: 0,
  vnode: {
    __v_isVNode: true,
    __v_skip: true,
    type: {
      name: 'C',
      data: [Function: data],
      render: [Function: render],
      __props: []
    },

    // ... many more things ...
  }
}
```

`type` is of interest! It matches the `C` component we defined earlier. You can see it has a `data` function (we defined one with a `msg` variable). In fact, if we compare this to `C`:

```js
console.log(C === app.$.vnode.component.type) //=> true
```

It matches! We can also do the same comparison with `vnode.type`: `console.log(C === app.$.vnode.type) //=> true`. I am not entirely clear on why there is two properties pointing to the same object. I am still learning. Anyway, we identified a way to match components.

## Diving Deeper into the Virtual DOM 

After a little trial and error, you can eventually find `A` like this:

```js
console.log(
  app.$
  .subTree.children[0].component
  .subTree.children[0].component
  .type === A) //=> true
```

There is a pattern emerging - `subTree -> children -> component`. `children` can be an array. It is going to be an array of `vnode`. Consider this structure:

```js
<div>
  <span />
  <span />
</div>
```

In this case, the `<div>` node would have a `subTree.children` array with a length of 2.

Now we know the recursive nature of the Virtual DOM, we can write a recursive solution!

## Writing findComponent

I am using Node.js v14, which supports optional chaining: `subTree?.children` for example. Before we write a recursive find function, we need some way to know if we have found the component: `matches`:

```js
function matches(vnode, target) {
  if (!vnode) {
    return false
  }

  return vnode.type === target
}
```

You could write `vnode?.type === target` but I like the verbose one a little more.

We will write two functions. `findComponent`, which will be the public API that users call, and `find`, an internal, recursive function.

Let's start with the public API:

```js
function findComponent(comp, { within }) {
  const result = find([within.$], comp, [])
  if (result) {
    return result[0]
  }
}
```

Since we know `children` can be an array, we will make the first argument to the `find` function an array of vnodes. The second will be the component we are looking for. Because the initial starting vnode, `app.$`, is a single vnode, we just put it in an array to kick things off. 

The third argument is an empty array - because are writing a recursive function, we need some place to keep the components we have found that match the target. We will store them in this array, passing it to each recursive call of `find`. This way we avoid mutating an array - I find less mutation leads to less bugs (your mileage may vary).

## Recursive find

When writing a recursive function, you need to have some way to exit, or you will get stuck in an endless loop. Let's start with that:

```js
function find(vnodes, target, found) {
  if (!Array.isArray(vnodes)) {
    return found
  }
}
```

If we have recursed all the way to the bottom of the Virtual DOM (and checked all vnodes in the process) we just return all the `found` components. This will ensure we do not get stuck in a loop. If we run this now:

```js
const result = findComponent(A, { within: app }) //=> undefined
```

Of course we find nothing. Let's dive into `subTree`. Because we potentially are working with an array of vnodes, we can use `reduce` to iterate over them. If you don't understand `reduce` well, you will need to look it up and understand it to get what is happening here. 

While traversing the vnodes, if we find a matching component, we want to keep it by adding it to the `found` array, which we maintain by passing to each `find` call. If we did not find a matching component, we may need to dive deeper by checking if `vnode.subTree.children` is defined. Finally, if it's not, we return the accumulator.

```js
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

    return acc
  }, [])
}
```

If you do a `console.log` inside of the `if (vnode?.subTree?.children) {` block, you will see we are now at the `B` component subTree. Remember, the path to `A` is as follows:

```js
app.$
  .subTree.children[0].component
  .subTree.children[0].component
  .type === A) //=> true
```

By calling `find` again: `find(vnode.subTree.children, target, found)`, the first argument to `find` on the next iteration will be `app.$.subTree.children`, which is an array of `vnodes`. That means we need to do `component.subTree.children` on the next iteration of `find` - but we are only checking `vnode.subTree.children`. We need a check for `vnode.component.subTree` as well:

```js
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
```

And somewhat surprisingly, *that's it*. `const result = findComponent(A, { within: app })` now returns a reference to `A`. You can see it working like this:

```js
console.log(
  result.component.proxy.msg
) // => 'msg'
```

If you have used Vue Test Utils before, you may recognise this in a slightly different syntax: `wrapper.vm.msg`, which is actually accessing the `proxy` internally (for Vue 3) and the `vm` for Vue 2. If you are using TypeScript, you may notice `proxy` does not show up as a valid type - that's because it is internal, not generally intended for use in regular applications, although some internal tools still use it, like Vue Test Utils and Vue DevTools.

## A More Complete Example

This implementation is far from perfect - there are more checks that need to be implemented. For example, this does not work with components using `template` instead of `render`, or `<Suspense>`. A more complete implementation can be found here in the [Vue Test Utils source code](https://github.com/vuejs/vue-test-utils-next/blob/master/src/utils/find.ts). 

At the time of this article, the implementation there mutates an array instead of passing a new copy to each recursive call. You can [see it here](https://github.com/vuejs/vue-test-utils-next/blob/8cdee798798d81fbae4c0ea9ebddb184bafc2d7a/src/utils/find.ts#L101) - the functions you want to look at are `findAllVNodes` and `aggregateChildren`. Although I much prefer the recursive style implementation here, both are valid approaches to the problem. 

You can find the [source code for this example here](https://github.com/lmiller1990/vdom-traverse-article).

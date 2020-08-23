import { h } from 'vue'
import { simpleMount } from './simpleMount'
import { findComponentCounts } from './findComponent'

const createRenderComponent = (name: string, props: Record<string, string> = {}, children?: any) => ({
  name,
  render() {
    return h('div', props, children)
  }
})

test('simple render functions', () => {
  const Child = {
    name: 'Child',
    render() {
      return h('div', { id: 'child' })
    }
  }
  const Parent = {
    name: 'Parent',
    render() {
      return h(Child)
    }
  }

  const wrapper = simpleMount(Parent)

  expect(findComponentCounts([wrapper.$.subTree], Parent)).toBe(1)
  expect(findComponentCounts([wrapper.$.subTree], Child)).toBe(1)
})

test('many layers deep', () => {
  const A = createRenderComponent('A', { id: 'a' })
  const B = createRenderComponent('B', { id: 'b' }, h(A))
  const C = createRenderComponent('C', { id: 'c' }, h(B))
  const Parent = createRenderComponent('Parent', { id: 'parent' }, h(C))
  const wrapper = simpleMount(Parent)

  expect(findComponentCounts([wrapper.$.subTree], C)).toBe(1)
})

test('fragment children', () => {
  const Child = {
    name: 'Child',
    render() {
      return h('div', { id: 'child' })
    }
  }
  const Parent = {
    name: 'Parent',
    render() {
      return [h(Child), h(Child)]
    }
  }

  const wrapper = simpleMount(Parent)

  expect(findComponentCounts([wrapper.$.subTree], Parent)).toBe(1)
  expect(findComponentCounts([wrapper.$.subTree], Child)).toBe(2)
})

test('render components - slots', () => {
  const Parent = {
    name: 'Parent',
    render() {
      return h('span', { id: 'Parent' }, this.$slots.default())
    }
  }
  
  const Child = {
    name: 'Child',
    render() {
      return h('p', { id: 'child' })
    }
  }
  
  const App = {
    name: 'App',
    render() {
      return h(Parent, () => h(Child))
    }
  }
  
  const wrapper = simpleMount(App)

  expect(findComponentCounts([wrapper.$.subTree], Parent)).toBe(1)
  // expect(findComponentCounts([wrapper.$.subTree], Child)).toBe(1)
})

test('inline templates - basic example', () => {
  const Child = {
    name: 'Child',
    template: `
      <div id="child" />
    `
  }
  const Parent = {
    name: 'Parent',
    components: { Child },
    template: `
      <Child />
    `
  }

  const wrapper = simpleMount(Parent)

  expect(findComponentCounts([wrapper.$.subTree], Parent)).toBe(1)
  expect(findComponentCounts([wrapper.$.subTree], Child)).toBe(1)
})

test('inline templates - basic example', () => {
  const Child = {
    name: 'Child',
    template: `
      <div id="child" />
    `
  }
  const Parent = {
    name: 'Parent',
    components: { Child },
    template: `
      <Child />
    `
  }

  const wrapper = simpleMount(Parent)

  expect(findComponentCounts([wrapper.$.subTree], Parent)).toBe(1)
  expect(findComponentCounts([wrapper.$.subTree], Child)).toBe(1)
})

test('inline templates - fragment children', () => {
  const Child = {
    name: 'Child',
    template: '<div id="child" />'
  }
  const Parent = {
    components: { Child },
    name: 'Parent',
    template: `<Child /> <Child />`
  }

  const wrapper = simpleMount(Parent)

  expect(findComponentCounts([wrapper.$.subTree], Parent)).toBe(1)
  expect(findComponentCounts([wrapper.$.subTree], Child)).toBe(2)
})


test('components - slots', () => {
  const Parent = {
    name: 'Parent',
    template: '<span id="parent"><slot /></span>'
  }
  
  const Child = {
    name: 'Child',
    template: '<p id="child" />'
  }
  
  const App = {
    components: { Parent, Child },
    name: 'App',
    template: '<parent><child /></parent>'
  }
  
  const wrapper = simpleMount(App)
  console.log(document.body.outerHTML)

  expect(findComponentCounts([wrapper.$.subTree], Parent)).toBe(1)
  expect(findComponentCounts([wrapper.$.subTree], Child)).toBe(1)
})


test('repro', () => {
  const ComponentA = {
    name: 'ComponentA',
    template: `<div class="comp-a"><slot /></div>`,
  }
  const ComponentB = {
    name: 'ComponentB',
    template: `<div class="comp-b"><slot /></div>`,
  }
  const Main = {
    name: 'Main',
    components: { ComponentA, ComponentB },
    template: `
    <ComponentA>
      <ComponentB>1</ComponentB>
      <ComponentB>2</ComponentB>
      <ComponentB>3</ComponentB>
    </ComponentA>
  `,
  }

  const App = {
    components: { Main },
    name: 'App',
    template: '<Main />',
  }

  const wrapper = simpleMount(App)

  expect(findComponentCounts([wrapper.$.subTree], ComponentA)).toBe(1)
  expect(findComponentCounts([wrapper.$.subTree], ComponentB)).toBe(3)
})
import { h } from 'vue'
import { simpleMount } from './simpleMount'
import { findComponentCount } from './findComponent'

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

  console.log(wrapper)

  // expect(findComponentCount()).toBe(1)
})

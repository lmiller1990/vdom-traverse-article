import { h, createApp } from 'vue'

export function simpleMount(originalComponent: any) {
  document.getElementsByTagName('html')[0].innerHTML = ''

  const wrapped = {
    setup: () => () => h(originalComponent)
  }
  const el = document.createElement('div')
  document.body.appendChild(el)

  const Parent = {
    name: 'Parent',
    render() {
      return h(wrapped, { ref: 'REF' })
    }
  }

  // create the app
  const app = createApp(Parent)

  // mount the app!
  const vm = app.mount(el)

  // get ref to component
  return vm.$refs['REF']
}
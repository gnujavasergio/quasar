import { QBtn, QBtnToggle, QBtnDropdown, QBtnGroup } from '../btn'
import { QTooltip } from '../tooltip'
import { QList, QItem, QItemSide, QItemMain } from '../list'
import extend from '../../utils/extend'

function run (e, btn, vm) {
  if (btn.handler) {
    btn.handler(e, vm, vm.caret)
  }
  else {
    vm.runCmd(btn.cmd, btn.param)
  }
}

function getBtn (h, vm, btn, clickHandler) {
  const
    child = [],
    events = {
      click (e) {
        clickHandler && clickHandler()
        run(e, btn, vm)
      }
    }

  if (btn.tip && vm.$q.platform.is.desktop) {
    const Key = btn.key
      ? h('div', [h('small', `(CTRL + ${String.fromCharCode(btn.key)})`)])
      : null
    child.push(h(QTooltip, { props: {delay: 1000} }, [
      h('div', { domProps: { innerHTML: btn.tip } }),
      Key
    ]))
  }

  if (btn.type === void 0) {
    return h(QBtnToggle, {
      props: extend({
        icon: btn.icon,
        label: btn.label,
        toggled: vm.caret.is(btn.cmd, btn.param),
        color: vm.color,
        toggleColor: vm.toggleColor,
        disable: btn.disable ? btn.disable(vm) : false
      }, vm.buttonProps),
      on: events
    }, child)
  }
  if (btn.type === 'no-state') {
    return h(QBtn, {
      props: extend({
        icon: btn.icon,
        color: vm.color,
        label: btn.label,
        disable: btn.disable ? btn.disable(vm) : false
      }, vm.buttonProps),
      on: events
    }, child)
  }
}

function getDropdown (h, vm, btn) {
  let
    label = btn.label,
    icon = btn.icon,
    noIcons = btn.list === 'no-icons',
    onlyIcons = btn.list === 'only-icons',
    Items

  function closeDropdown () {
    Dropdown.componentInstance.close()
  }

  if (onlyIcons) {
    Items = btn.options.map(btn => {
      const active = btn.type === void 0
        ? vm.caret.is(btn.cmd, btn.param)
        : false

      if (active) {
        label = btn.tip
        icon = btn.icon
      }
      return getBtn(h, vm, btn, closeDropdown)
    })
    Items = [
      h(
        QBtnGroup,
        { props: vm.buttonProps, staticClass: 'relative-position q-editor-toolbar-padding' },
        Items
      )
    ]
  }
  else {
    Items = btn.options.map(btn => {
      const disable = btn.disable ? btn.disable(vm) : false
      const active = btn.type === void 0
        ? vm.caret.is(btn.cmd, btn.param)
        : false

      if (active) {
        label = btn.tip
        icon = btn.icon
      }

      return h(
        QItem,
        {
          props: { active, link: !disable },
          staticClass: disable ? 'disabled' : '',
          on: {
            click (e) {
              if (disable) { return }
              closeDropdown()
              vm.$refs.content.focus()
              vm.caret.restore()
              run(e, btn, vm)
            }
          }
        },
        [
          noIcons ? '' : h(QItemSide, {props: {icon: btn.icon}}),
          h(QItemMain, {
            props: {
              label: btn.htmlTip || btn.tip
            }
          })
        ]
      )
    })
    Items = [ h(QList, { props: { separator: true } }, [ Items ]) ]
  }

  const Dropdown = h(
    QBtnDropdown,
    {
      props: extend({
        noCaps: true,
        noWrap: true,
        color: btn.highlight && label !== btn.label ? vm.toggleColor : vm.color,
        label: btn.fixedLabel ? btn.label : label,
        icon: btn.fixedIcon ? btn.icon : icon
      }, vm.buttonProps)
    },
    Items
  )
  return Dropdown
}

export function getToolbar (h, vm) {
  if (vm.caret) {
    return vm.buttons.map(group => h(
      QBtnGroup,
      { props: vm.buttonProps, staticClass: 'relative-position' },
      group.map(btn => {
        if (btn.type === 'slot') {
          return vm.$slots[btn.slot]
        }

        if (btn.type === 'dropdown') {
          return getDropdown(h, vm, btn)
        }

        return getBtn(h, vm, btn)
      })
    ))
  }
}

export function getFonts (defaultFont, fonts = {}) {
  const aliases = Object.keys(fonts)
  if (aliases.length === 0) {
    return {}
  }

  const def = {
    default_font: {
      cmd: 'fontName',
      param: defaultFont,
      icon: 'font_download',
      tip: 'Default Font'
    }
  }

  aliases.forEach(alias => {
    const name = fonts[alias]
    def[alias] = {
      cmd: 'fontName',
      param: name,
      icon: 'font_download',
      tip: name,
      htmlTip: `<font face="${name}">${name}</font>`
    }
  })

  return def
}

const camelizeRE = /-(\w)/g
function camelize (str) {
  return str.replace(
    camelizeRE,
    (_, c) => c ? c.toUpperCase() : ''
  )
}

function getStyleObject (el) {
  const output = {}

  el.style.cssText.split(';').forEach(rule => {
    if (rule) {
      const parts = rule.split(':')
      output[ camelize(parts[0].trim()) ] = parts[1].trim()
    }
  })

  return output
}

export function getContentObject (el) {
  if (el.nodeType === Node.TEXT_NODE) {
    return {
      nodeType: Node.TEXT_NODE,
      text: el.textContent
    }
  }

  const node = {
    nodeType: el.nodeType,
    tagName: el.tagName,
    attributes: {}
  }

  Array.from(el.attributes, ({name, value}) => {
    if (name === 'style') {
      node.style = getStyleObject(el)
    }
    else {
      node.attributes[name] = value
    }
  })

  const children = Array.from(el.childNodes, getContentObject)
  if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
    node.text = children[0].text
  }
  else {
    node.children = children
  }

  return node
}

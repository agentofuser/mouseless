import collect from 'collect.js'
import keymap from 'native-keymap'
import Emitter from '@/services/Emitter'

// console.table(keymap.getKeyMap())

export default class Keyboard {

  static blacklist = [
    'NumpadDivide',
    'NumpadMultiply',
    'NumpadSubtract',
    'NumpadAdd',
    'NumpadDecimal',
  ]

  static keymap = Object
    .entries(keymap.getKeyMap())
    .map(([code, data]) => ({
      code,
      ...data,
    }))
    // maybe this will break something
    .filter(key => !this.blacklist.includes(key.code))

  static aliases = {
    shift: 'Shift',
    control: 'Control',
    alt: 'Alt',
    meta: 'Meta',
    up: 'ArrowUp',
    right: 'ArrowRight',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    enter: 'Enter',
    backspace: 'Backspace',
  }

  static formats = {
    Shift: '⇧',
    Control: '⌃',
    Alt: '⌥',
    Meta: '⌘',
    ArrowUp: '↑',
    ArrowRight: '→',
    ArrowDown: '↓',
    ArrowLeft: '←',
    Enter: '↩',
    Backspace: '⌫',
  }

  static formatKeyCode(name) {
    return this.formats[name] ? this.formats[name] : name
  }

  constructor() {
    this.emitter = new Emitter()
    this.specialKeyNames = [
      'Shift',
      'Control',
      'Alt',
      'Meta',
    ]
    this.specialKeys = []
    this.regularKeys = []
    this.keydownHandler = this.handleKeydown.bind(this)
    this.keyupHandler = this.handleKeyup.bind(this)
    window.addEventListener('keydown', this.keydownHandler)
    window.addEventListener('keyup', this.keyupHandler)
  }

  on(...args) {
    this.emitter.on(...args)
  }

  off(...args) {
    this.emitter.off(...args)
  }

  setSpecialKeys(event) {
    const keys = []

    if (event.shiftKey) {
      keys.push('Shift')
    }

    if (event.ctrlKey) {
      keys.push('Control')
    }

    if (event.altKey) {
      keys.push('Alt')
    }

    if (event.metaKey) {
      keys.push('Meta')
    }

    this.specialKeys = keys
  }

  get keys() {
    return [...this.specialKeys, ...this.regularKeys]
  }

  get resolvedKeys() {
    return collect(this.constructor.resolveCodesFromKeys(this.keys))
      .unique()
      .toArray()
  }

  get isOnlyShiftPressed() {
    return this.specialKeys.length === 1 && this.specialKeys.includes('Shift')
  }

  get isOnlyAltPressed() {
    return this.specialKeys.length === 1 && this.specialKeys.includes('Alt')
  }

  get isShiftAndAltPressed() {
    return this.specialKeys.includes('Shift') && this.specialKeys.includes('Alt')
  }

  getKeyValue(event) {
    const key = this.constructor.keymap.find(item => item.code === event.code)

    if (!key) {
      return event.code
    }

    let { value } = key

    if (this.isOnlyShiftPressed) {
      value = key.withShift
    }

    if (this.isOnlyAltPressed) {
      value = key.withAltGr
    }

    if (this.isShiftAndAltPressed) {
      value = key.withShiftAltGr
    }

    if (value === '') {
      return key.code
    }

    return value
  }

  getKeyName(event) {
    return event.code
  }

  static resolveCodesFromKeys(keys = []) {
    return keys
      .map(key => {
        const alias = this.aliases[key.toLowerCase()]

        if (alias) {
          return alias
        }

        let match = null

        match = this.keymap.find(item => item.value === key)

        if (match) {
          return match.value
        }

        match = this.keymap.find(item => item.withShift === key)

        if (match) {
          return ['Shift', match.value]
        }

        match = this.keymap.find(item => item.withAltGr === key)

        if (match) {
          return ['Alt', match.value]
        }

        match = this.keymap.find(item => item.withShiftAltGr === key)

        if (match) {
          return ['Shift', 'Alt', match.value]
        }

        // f1-f20
        match = this.keymap.find(item => item.code.toLowerCase() === key.toLowerCase())

        if (match) {
          return [match.code.toLowerCase()]
        }

        return match
      })
      .flat()
      .filter(key => key)
  }

  handleKeydown(event) {
    this.setSpecialKeys(event)
    const value = this.getKeyValue(event)
    const isSpecialKey = this.specialKeyNames.includes(event.key)
    const isPressed = this.isPressed(value)

    if (isPressed) {
      return
    }

    this.emitter.emit('update', { event, keys: this.keys })

    if (isSpecialKey) {
      return
    }

    this.regularKeys.push(value)
    this.emitter.emit('shortcut', { event, keys: this.keys })
    this.resetKeys()
  }

  handleKeyup(event) {
    this.setSpecialKeys(event)
    this.emitter.emit('update', { event, keys: this.keys })
  }

  is(keys) {
    const checkedKeys = keys.map(key => key.toLowerCase())
    const pressedKeys = this.resolvedKeys.map(key => key.toLowerCase())
    const match1 = checkedKeys.every(key => pressedKeys.includes(key))
    const match2 = pressedKeys.every(key => checkedKeys.includes(key))
    return match1 && match2
  }

  isPressed(name) {
    return !!this.regularKeys.find(key => key.toLowerCase() === name.toLowerCase())
  }

  resetKeys() {
    this.regularKeys = []
    this.specialKeys = []
  }

  destroy() {
    this.emitter.destroy()
    window.removeEventListener('keydown', this.keydownHandler)
  }

}

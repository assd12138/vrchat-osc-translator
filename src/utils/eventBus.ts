/**
 * 事件总线
 */
export enum EventBusEvent {
  ADD_LOG = 'ADD_LOG',
}

type EventBusHandler = ((data: any) => void)

class EventBus {
  events: Record<string | EventBusEvent, EventBusHandler[]>

  constructor() {
    this.events = {}
  } // 订阅事件的方法

  on(eventName: EventBusEvent, callback: EventBusHandler) {
    if (!this.events[eventName]) {
      this.events[eventName] = [callback]
    } else {
      this.events[eventName].push(callback)
    }
  } // 触发事件的方法

  emit(eventName: EventBusEvent, data: any) {
    this.events[eventName] && this.events[eventName].forEach((cb) => cb(data))
  }

  emitLast(eventName: EventBusEvent, data: any) {
    this.events[eventName] &&
      this.events[eventName].length > 0 &&
      this.events[eventName][this.events[eventName].length - 1](data)
  } /** 取消订阅 */

  off(eventName: EventBusEvent, callback: EventBusHandler) {
    if (!this.events[eventName]) return
    this.events[eventName] = this.events[eventName].filter((cb) => cb !== callback)
  }

  once(eventName: EventBusEvent, callback: EventBusHandler) {
    this.events[eventName] = []
    const fn = (data: any) => {
      callback(data)
      this.off(eventName, fn)
    }
    this.on(eventName, fn)
  }
}

export default new EventBus()

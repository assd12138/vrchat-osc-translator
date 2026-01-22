import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import store from '../store/store'
import enUS from './translations/en-US'
import zhCN from './translations/zh-CN'
import jaJP from './translations/ja-JP'
import koKR from './translations/ko-KR'

const resources = {
  en: {
    translation: enUS
  },
  zh: {
    translation: zhCN
  },
  ja: {
    translation: jaJP
  },
  ko: {
    translation: koKR
  }
}

i18next.use(initReactI18next).init({
  debug: true,
  lng: store.getState().settings.language === 'auto' ? navigator.language : store.getState().settings.language,
  resources,
  fallbackLng: {
    default: ['en']
  }
})

export default i18next
export { resources }
/// <reference types="vite/client" />
interface ViteTypeOptions {
  // 添加这行代码，你就可以将 ImportMetaEnv 的类型设为严格模式，
  // 这样就不允许有未知的键值了。
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_DEFAULT_QINIU_ACCESS_KEY: string
  readonly VITE_DEFAULT_QINIU_SECRET_KEY: string
  readonly VITE_DEFAULT_QINIU_BUCKET: string
  readonly VITE_DEFAULT_QINIU_URL: string
  readonly VITE_DEFAULT_TRANSCRIPTION_URL : string
  readonly VITE_DEFAULT_TRANSCRIPTION_MODEL: string
  readonly VITE_DEFAULT_TRANSCRIPTION_TOKEN: string
  readonly VITE_DEFAULT_OPENAI_API_URL: string
  readonly VITE_DEFAULT_OPENAI_MODEL: string
  readonly VITE_DEFAULT_OPENAI_TOKEN: string
  readonly VITE_DEFAULT_OCR_URL: string
  readonly VITE_DEFAULT_OCR_MODEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
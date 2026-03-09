/// <reference types="vite/client" />
type ViteTypeOptions = {};

interface ImportMetaEnv {
	readonly VITE_DEFAULT_QINIU_ACCESS_KEY: string;
	readonly VITE_DEFAULT_QINIU_SECRET_KEY: string;
	readonly VITE_DEFAULT_QINIU_BUCKET: string;
	readonly VITE_DEFAULT_QINIU_URL: string;
	readonly VITE_DEFAULT_TRANSCRIPTION_URL: string;
	readonly VITE_DEFAULT_TRANSCRIPTION_MODEL: string;
	readonly VITE_DEFAULT_TRANSCRIPTION_TOKEN: string;
	readonly VITE_DEFAULT_OPENAI_API_URL: string;
	readonly VITE_DEFAULT_OPENAI_MODEL: string;
	readonly VITE_DEFAULT_OPENAI_TOKEN: string;
	readonly VITE_DEFAULT_OCR_URL: string;
	readonly VITE_DEFAULT_OCR_MODEL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

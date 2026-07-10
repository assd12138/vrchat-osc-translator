/// <reference types="vite/client" />
type ViteTypeOptions = {};

interface ImportMetaEnv {
	/** 默认转写url */
	readonly VITE_DEFAULT_TRANSCRIPTION_URL: string;
	/** 默认转写模型 */
	readonly VITE_DEFAULT_TRANSCRIPTION_MODEL: string;
	/** 默认转写token */
	readonly VITE_DEFAULT_TRANSCRIPTION_TOKEN: string;
	/** 默认openai兼容url */
	readonly VITE_DEFAULT_OPENAI_API_URL: string;
	/** 默认openai兼容模型 */
	readonly VITE_DEFAULT_OPENAI_MODEL: string;
	/** 默认openai兼容鉴权 */
	readonly VITE_DEFAULT_OPENAI_TOKEN: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

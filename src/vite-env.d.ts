/// <reference types="vite/client" />
type ViteTypeOptions = {};

interface ImportMetaEnv {
	/** s3权限key-默认 */
	readonly VITE_DEFAULT_S3_ACCESS_KEY: string;
	/** s3秘钥key-默认 */
	readonly VITE_DEFAULT_S3_SECRET_KEY: string;
	/** s3存储桶-默认 */
	readonly VITE_DEFAULT_S3_BUCKET: string;
	/** s3的url-默认 */
	readonly VITE_DEFAULT_S3_URL: string;
	/** s3的endpoint-默认 */
	readonly VITE_DEFAULT_S3_ENDPOINT: string;
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
	/** 默认ocr模型url */
	readonly VITE_DEFAULT_OCR_URL: string;
	/** 默认ocr模型 */
	readonly VITE_DEFAULT_OCR_MODEL: string;
	/** 默认龙猫秘钥 */
	readonly VITE_DEFAULT_LONGCAT_API_AUTH: string;
	/** 默认openai官方秘钥 */
	readonly VITE_DEFAULT_OPENAI_API_AUTH: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

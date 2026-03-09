import { resources } from "../i18n/index";

declare module "i18next" {
	interface CustomTypeOptions {
		resources: (typeof resources)["zh"];
	}
}

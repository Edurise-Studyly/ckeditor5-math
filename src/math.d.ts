import { Plugin } from '@ckeditor/ckeditor5-core';

declare module "ckeditor5-math" {
	export default class Math extends Plugin {}
}

export interface MathConfig {
	engine?: string;
	lazyLoad?: boolean | (() => Promise<any>);
	outputType?: string;
	forceOutputType?: boolean;
	enablePreview?: boolean;
	previewClassName?: string[];
	popupClassName?: string[];
	katexRenderOptions?: { [key: string]: any };
	keepOpen?: boolean;
}

declare module "@ckeditor/ckeditor5-core/src/editor/editorconfig" {
	interface EditorConfig {
		math?: MathConfig;
	}
}

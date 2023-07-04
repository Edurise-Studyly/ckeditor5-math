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

declare module "@ckeditor/ckeditor5-core" {
	interface EditorConfig {
		math?: MathConfig;
	}
}

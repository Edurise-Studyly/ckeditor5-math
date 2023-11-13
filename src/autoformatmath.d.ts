import { Autoformat } from '@ckeditor/ckeditor5-autoformat';

declare module 'ckeditor5-math/src/autoformatmath' {
    export default class AutoformatMath extends Autoformat {}
}
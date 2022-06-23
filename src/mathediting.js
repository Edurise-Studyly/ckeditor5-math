import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import {toWidget, viewToModelPositionOutsideModelElement} from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import MathCommand from './mathcommand';

import {extractDelimiters, renderEquation} from './utils';

export default class MathEditing extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	static get pluginName() {
		return 'MathEditing';
	}

	init() {
		const editor = this.editor;
		editor.commands.add( 'math', new MathCommand( editor ) );

		this._defineSchema();
		this._defineConverters();

		editor.editing.mapper.on(
			'viewToModelPosition',
			viewToModelPositionOutsideModelElement( editor.model, viewElement => viewElement.hasClass( 'math' ) )
		);
		editor.config.define( 'math', {
			engine: 'mathjax',
			outputType: 'script',
			forceOutputType: false,
			enablePreview: true,
			previewClassName: [],
			popupClassName: []
		} );

/*		editor.model.schema.extend( '$text', {
			allowIn: 'mathtex-inline'
		} );*/
	/*		editor.model.schema.extend( 'mathtex-inline', {
				allowAttributes: 'style'
			} );*/
		editor.model.schema.extend( 'mathtex-inline', {
			allowAttributes: 'fontBackgroundColor'
		} );
		editor.model.schema.extend( 'mathtex-inline', {
			allowAttributes: 'fontColor'
		} );
		editor.model.schema.extend( 'mathtex-display', {
			allowAttributes: 'style'
		} );

		/*editor.conversion.for( 'upcast' ).attributeToAttribute( {
			view: {
				name: 'span',
				key: 'style',
				value: {
					'background-color': /[\s\S]+/
				}
			},
			model: {
				key: 'style',
				value: viewElement => viewElement.getStyle( 'background-color' )
			}
		} );

		editor.conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'attribute:style:mathtex-inline', ( evt, data, conversionApi ) => {
				const mathtexelem = data.item;

				// The table from the model is mapped to the widget element: <figure>.
				const viewFigure = conversionApi.mapper.toViewElement( mathtexelem );

				// A <table> is direct child of a <figure> but there might be other view (including UI) elments inside <figure>.
				const viewTable = [ ...viewFigure.getChildren() ].find( element => element.name === 'mathtex-inline' );

				// it should be consumed...

				// User view writer to change style of a view table.
				if ( data.attributeNewValue ) {
					conversionApi.writer.setStyle( 'background-color', data.attributeNewValue, viewTable );
				} else {
					conversionApi.writer.removeStyle( 'background-color', viewTable );
				}
			} );
		} );
*/
	}

	_defineSchema() {
		const schema = this.editor.model.schema;
		schema.register( 'mathtex-inline', {
			allowWhere: '$text',
			isObject: true,
			//isSelectable: true,
			//isBlock: true,
			allowAttributes: [ 'equation', 'type', 'display' ]
		} );

		schema.register( 'mathtex-display', {
			allowWhere: '$block',
			isObject: true,
			/*isBlock: true,*/
			allowAttributes: [ 'equation', 'type', 'display' ]
		} );
	}

	_defineConverters( attrkeys ) {
		const conversion = this.editor.conversion;
		const mathConfig = this.editor.config.get( 'math' );
		console.log(mathConfig);
		document.aa = mathConfig;
		document.bb = this.editor;

		// View -> Model
		conversion.for( 'upcast' )
			// CKEditor 4 way (e.g. <span class="math-tex">\( \sqrt{\frac{a}{b}} \)</span>)
			.elementToElement( {
				view: {
					name: 'span',
					classes: [ 'math-tex' ]
				},
				model: ( viewElement, { writer } ) => {
					console.log('CKEditor 4 way');
					console.log(viewElement);

					let content = viewElement.getChild( 0 );

					while (content.data === undefined) {
						content = content.getChild( 0 );
					}

					const equation = content.data.trim();
					console.log(equation);

					const params = Object.assign( extractDelimiters( equation ), {
						type: mathConfig.forceOutputType ? mathConfig.outputType : 'span'
					} );

					return writer.createElement( params.display ? 'mathtex-display' : 'mathtex-inline', params );
				}
			} )
			// KaTeX from Quill: https://github.com/quilljs/quill/blob/develop/formats/formula.js
			.elementToElement( {
				view: {
					name: 'span',
					classes: [ 'ql-formula' ]
				},
				model: ( viewElement, { writer } ) => {
					const equation = viewElement.getAttribute( 'data-value' ).trim();
					return writer.createElement( 'mathtex-inline', {
						equation,
						type: mathConfig.forceOutputType ? mathConfig.outputType : 'script',
						display: false
					} );
				}
			} );

		// Model -> View (element)
		conversion.for( 'editingDowncast' )
			.elementToElement( {
				model: 'mathtex-inline',
				view: ( modelItem, { writer } ) => {
					console.log('editingDowncast mathtex-inline');
					const widgetElement = createMathtexEditingView( modelItem, writer, this.editor );
					return toWidget( widgetElement, writer, 'span' );
				}
			} ).elementToElement( {
				model: 'mathtex-display',
				view: ( modelItem, { writer } ) => {
					const widgetElement = createMathtexEditingView( modelItem, writer, this.editor );
					return toWidget( widgetElement, writer, 'div' );
				}
			} );

		// Model -> Data
		conversion.for( 'dataDowncast' )
			.elementToElement( {
				model: 'mathtex-inline',
				view: createMathtexView
			} )
			.elementToElement( {
				model: 'mathtex-display',
				view: createMathtexView
			} );

		this.editor.conversion.for( 'upcast' )
			.attributeToAttribute( {
				view: {
					name: /^(mathtex-display|mathtex-inline)$/,
					styles: {
						'background-color': /[\s\S]+/
					}
				},
				model: {
					key: 'style',
					value: viewElement => {
						const align = viewElement.getStyle( 'background-color' );

						return align === defaultValue ? null : align;
					}
				}
			} );

		this.editor.conversion.for( 'downcast' )
			.attributeToAttribute( {
			model: {
				name: 'mathtex-inline',
				key: 'style'
			},
			view: color => ( {
				key: 'style',
				value : {
					'background-color': color
				}
			} )
		} );

		// Create view for editor
		function createMathtexEditingView( modelItem, writer, editor ) {
			const equation = modelItem.getAttribute( 'equation' );
			const display = modelItem.getAttribute( 'display' );

			const styles = 'user-select: none; ' + ( display ? '' : 'display: inline-block;' );
			const classes = 'ck-math-tex ' + ( display ? 'ck-math-tex-display' : 'ck-math-tex-inline' );

			const mathtexView = writer.createContainerElement( display ? 'div' : 'span', {
				style: styles,
				class: classes
			} );

			const uiElement = writer.createUIElement( 'div', null, function( domDocument ) {
				const domElement = this.toDomElement( domDocument );

				renderEquation( equation, domElement, mathConfig.engine, mathConfig.lazyLoad, display, false );

				return domElement;
			} );
			console.log('writer.insert 1');
			writer.insert( writer.createPositionAt( mathtexView, 0 ), uiElement );

			document.editorr = editor;
			document.mathTexView = mathtexView;
			/*editor.model.change( writer => {
				writer.setSelection(editor.model.document.getRoot(), 'end');
			});

			let wwriter = writer;
			document.editorr = editor;*/
			/*editor.model.change( writer => {
					writer.setSelection(writer.createPositionAt());
				}
			);
*/
			return mathtexView;
		}

		// Create view for data
		function createMathtexView( modelItem, { writer } ) {
			const equation = modelItem.getAttribute( 'equation' );
			const type = modelItem.getAttribute( 'type' );
			const display = modelItem.getAttribute( 'display' );

			if ( type === 'span' ) {
				const mathtexView = writer.createContainerElement( 'span', {
					class: 'math-tex'
				} );

				if ( display ) {
					console.log('writer.insert 2');
					writer.insert( writer.createPositionAt( mathtexView, 0 ), writer.createText( '\\[' + equation + '\\]' ) );
				} else {
					console.log('writer.insert 3');
					writer.insert( writer.createPositionAt( mathtexView, 0 ), writer.createText( '\\(' + equation + '\\)' ) );
				}

				return mathtexView;
			} else {
				const mathtexView = writer.createContainerElement( 'script', {
					type: display ? 'math/tex; mode=display' : 'math/tex'
				} );
				console.log('writer.insert 4');
				writer.insert( writer.createPositionAt( mathtexView, 0 ), writer.createText( equation ) );

				return mathtexView;
			}
		}
	}
}

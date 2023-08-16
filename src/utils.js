import global from '@ckeditor/ckeditor5-utils/src/dom/global';
import BalloonPanelView from '@ckeditor/ckeditor5-ui/src/panel/balloon/balloonpanelview';
import katex from "katex/dist/katex.mjs";
import {indexOf} from "lodash";

export function getSelectedMathModelWidget( selection ) {
	if (selection == null) {
		return null;
	}
	const selectedElement = selection.getSelectedElement();

	if ( selectedElement && ( selectedElement.is( 'element', 'mathtex-inline' ) || selectedElement.is( 'element', 'mathtex-display' ) ) ) {
		return selectedElement;
	}

	return null;
}

// Simple MathJax 3 version check
export function isMathJaxVersion3( version ) {
	return version && typeof version === 'string' && version.split( '.' ).length === 3 && version.split( '.' )[ 0 ] === '3';
}

// Check if equation has delimiters.
export function hasDelimiters( text ) {
	return text.match( /(\\\[|\\\]|\\\(|\\\)|\$\$|\$)/g );
}

// Find delimiters count
export function delimitersCounts( text ) {

	if (!text.match( /(\\\[|\\\]|\\\(|\\\)|\$\$|\$)/g )) {
		return null;
	}

	return text.match( /(\\\[|\\\]|\\\(|\\\)|\$\$|\$)/g ).length;
}

export const openingBrackets = {
	'\\(': 'bracketsInline',
	'\\[': 'bracketsDisplay',
	'$': 'dollarInline',
	'$$': 'dollarDisplay'
}

export const closingBrackets = {
	'\\)': 'bracketsInline',
	'\\]': 'bracketsDisplay',
	'$': 'dollarInline',
	'$$': 'dollarDisplay'
}

export function delimitersAreMatching( mathFormsAndText ) {
	let opening = true;
	let	currentDelim;

	for (let i = 1; i < mathFormsAndText.length; i+=2) {
		if (opening) {
			if (!openingBrackets[mathFormsAndText[i]]) {
				return false;
			}
			currentDelim = openingBrackets[mathFormsAndText[i]];
		} else {
			if (!closingBrackets[mathFormsAndText[i]] || closingBrackets[mathFormsAndText[i]] !== currentDelim) {
				return false;
			}
		}
		opening = !opening;
	}
	return true;
}

export function getMathFormsAndText( text ) {
	if ( text === undefined ) {
		return undefined;
	}
	return text.split(/(\\\[|\\\]|\\\(|\\\)|\$\$|\$)/g);
}

export function makeFormulas( mathFormsAndText ) {
	let a = [];
	let displayMode = false;
	for (let i = 0; i < mathFormsAndText.length; i++) {
		if (i % 4 === 0) {
			a.push(mathFormsAndText[i]);
		} else if (i % 4 === 1) {
			if ( openingBrackets[mathFormsAndText[i]] === 'bracketsDisplay' ||
				openingBrackets[mathFormsAndText[i]] === 'dollarDisplay' ) {
				displayMode = true;
			}
		} else if (i % 2 === 0) {
			let text = mathFormsAndText[i];
			a.push({
				equation: text,
				display: displayMode
			});
			displayMode = false;
		}
	}
	return a;
}

// Extract delimiters and figure display mode for the model
export function extractDelimiters( equation ) {
	equation = equation.trim();
	let hasDelimiters = (equation.includes( '\\[' ) && equation.includes( '\\]' )) || (equation.includes( '\\(' ) && equation.includes( '\\)' ))
		|| equation.includes('$$') || equation.includes('$');
	let hasDisplayDelimiters = (equation.includes( '\\[' ) && equation.includes( '\\]' )) || equation.includes('$$');
	let hasSingleLetterDelim = equation.indexOf('$') !== -1;

	let offset = 0;
	let positionOfDollar = 0;

	//safari can't use lookbehind or lookforward regex, so custom method of finding was implemented
	//looks if there is a '$' in string equation which is not followed or preceded by another '$'
	while ( (positionOfDollar = equation.indexOf('$', offset)) !== -1 ) {
		if (positionOfDollar !== 0 && positionOfDollar + 1 !== equation.length ) {
			if (equation[positionOfDollar+1] === '$' || equation[positionOfDollar-1] === '$' ) {
				hasSingleLetterDelim = false;
			}
		}
		offset += 1;
	}

	// Remove delimiters (e.g. \( \) or \[ \])
	if (hasDelimiters) {
		if (hasSingleLetterDelim) {
			equation = equation.substring(1, equation.length - 1).trim();
		} else {
			equation = equation.substring(2, equation.length - 2).trim();
		}
	}


	// // Remove delimiters (e.g. \( \) or \[ \])
	// const hasDollars = equation.substring(0,1).includes('$')
	// const hasInlineDelimiters = equation.includes( '\\(' ) && equation.includes( '\\)' );
	// const hasDisplayDelimiters = equation.includes( '\\[' ) && equation.includes( '\\]' );
	// if ( hasInlineDelimiters || hasDisplayDelimiters ) {
	// 	equation = equation.substring( 2, equation.length - 2 ).trim();
	// }

	return {
		equation,
		display: hasDisplayDelimiters
	};
}

//returns true if mathformulas at [0] has a blank string, and end too, and has len == 5
//that is only true if it is only a single formula that has no text before or after it
export function delimitersAreAtBeginningAndEnd( mathFormulas ) {
	return !!(mathFormulas.length === 5 && mathFormulas[0].trim().length === 0 && mathFormulas[mathFormulas.length-1].trim().length === 0);
}

export async function renderEquation(
	equation, element, engine = 'katex', lazyLoad, display = false, preview = false, previewUid, previewClassName = [],
	katexRenderOptions = {}
) {
	if ( engine === 'mathjax' && typeof MathJax !== 'undefined' ) {
		if ( isMathJaxVersion3( MathJax.version ) ) {
			selectRenderMode( element, preview, previewUid, previewClassName, el => {
				renderMathJax3( equation, el, display, () => {
					if ( preview ) {
						moveAndScaleElement( element, el );
						el.style.visibility = 'visible';
					}
				} );
			} );
		} else {
			selectRenderMode( element, preview, previewUid, previewClassName, el => {
				// Fixme: MathJax typesetting cause occasionally math processing error without asynchronous call
				global.window.setTimeout( () => {
					renderMathJax2( equation, el, display );

					// Move and scale after rendering
					if ( preview ) {
						// eslint-disable-next-line
						MathJax.Hub.Queue( () => {
							moveAndScaleElement( element, el );
							el.style.visibility = 'visible';
						} );
					}
				} );
			} );
		}
	} else if ( engine === 'katex' && typeof katex !== 'undefined' ) {

		equation = replaceInputPlacehodlers(equation);

		selectRenderMode( element, preview, previewUid, previewClassName, el => {
			katex.render( equation, el, {
				throwOnError: false,
				displayMode: display,
				...katexRenderOptions
			} );
			if ( preview ) {
				moveAndScaleElement( element, el );
				el.style.visibility = 'visible';
			}
		} );
	} else if ( typeof engine === 'function' ) {
		engine( equation, element, display );
	} else {
		if ( typeof lazyLoad !== 'undefined' ) {
			try {
				if ( !global.window.CKEDITOR_MATH_LAZY_LOAD ) {
					global.window.CKEDITOR_MATH_LAZY_LOAD = lazyLoad();
				}
				element.innerHTML = equation;
				await global.window.CKEDITOR_MATH_LAZY_LOAD;
				renderEquation( equation, element, engine, undefined, display, preview, previewUid, previewClassName, katexRenderOptions );
			}
			catch ( err ) {
				element.innerHTML = equation;
				console.error( `math-tex-typesetting-lazy-load-failed: Lazy load failed: ${ err }` );
			}
		} else {
			element.innerHTML = equation;
			console.warn( `math-tex-typesetting-missing: Missing the mathematical typesetting engine (${ engine }) for tex.` );
		}
	}
}

export function getBalloonPositionData( editor ) {
	const view = editor.editing.view;
	const defaultPositions = BalloonPanelView.defaultPositions;

	const selectedElement = view.document.selection.getSelectedElement();
	if ( selectedElement ) {
		return {
			target: view.domConverter.viewToDom( selectedElement ),
			positions: [
				defaultPositions.southArrowNorth,
				defaultPositions.southArrowNorthWest,
				defaultPositions.southArrowNorthEast
			]
		};
	}
	else {
		const viewDocument = view.document;
		return {
			target: view.domConverter.viewRangeToDom( viewDocument.selection.getFirstRange() ),
			positions: [
				defaultPositions.southArrowNorth,
				defaultPositions.southArrowNorthWest,
				defaultPositions.southArrowNorthEast
			]
		};
	}
}

function selectRenderMode( element, preview, previewUid, previewClassName, cb ) {
	if ( preview ) {
		createPreviewElement( element, previewUid, previewClassName, previewEl => {
			cb( previewEl );
		} );
	} else {
		cb( element );
	}
}

function renderMathJax3( equation, element, display, cb ) {
	let promiseFunction = undefined;
	if ( typeof MathJax.tex2chtmlPromise !== 'undefined' ) {
		promiseFunction = MathJax.tex2chtmlPromise;
	} else if ( typeof MathJax.tex2svgPromise !== 'undefined' ) {
		promiseFunction = MathJax.tex2svgPromise;
	}

	if ( typeof promiseFunction !== 'undefined' ) {
		promiseFunction( equation, { display } ).then( node => {
			if ( element.firstChild ) {
				element.removeChild( element.firstChild );
			}
			element.appendChild( node );
			cb();
		} );
	}
}

function renderMathJax2( equation, element, display ) {
	if ( display ) {
		element.innerHTML = '\\[' + equation + '\\]';
	} else {
		element.innerHTML = '\\(' + equation + '\\)';
	}
	// eslint-disable-next-line
	MathJax.Hub.Queue( [ 'Typeset', MathJax.Hub, element ] );
}

function createPreviewElement( element, previewUid, previewClassName, render ) {
	const previewEl = getPreviewElement( element, previewUid, previewClassName );
	render( previewEl );
}

function getPreviewElement( element, previewUid, previewClassName ) {
	let previewEl = global.document.getElementById( previewUid );
	// Create if not found
	if ( !previewEl ) {
		previewEl = global.document.createElement( 'div' );
		previewEl.setAttribute( 'id', previewUid );
		previewEl.classList.add( ...previewClassName );
		previewEl.style.visibility = 'hidden';
		global.document.body.appendChild( previewEl );

		let ticking = false;

		const renderTransformation = () => {
			if ( !ticking ) {
				global.window.requestAnimationFrame( () => {
					moveElement( element, previewEl );
					ticking = false;
				} );

				ticking = true;
			}
		};

		// Create scroll listener for following
		global.window.addEventListener( 'resize', renderTransformation );
		global.window.addEventListener( 'scroll', renderTransformation );
	}
	return previewEl;
}

function moveAndScaleElement( parent, child ) {
	// Move to right place
	moveElement( parent, child );

	// Scale parent element same as preview
	const domRect = child.getBoundingClientRect();
	parent.style.width = domRect.width + 'px';
	parent.style.height = domRect.height + 'px';
}

function moveElement( parent, child ) {
	const domRect = parent.getBoundingClientRect();
	const left = global.window.scrollX + domRect.left;
	const top = global.window.scrollY + domRect.top;
	child.style.position = 'absolute';
	child.style.left = left + 'px';
	child.style.top = top + 'px';
	child.style.zIndex = 'var(--ck-z-modal)';
	child.style.pointerEvents = 'none';
}

/**
 * @description replace input placeholders in math with \htmlClass{<classNames>}{<text>} latex command to render math with some parts wrapped in an HTML element with given classes
 * @param {string} equation math expression
 * @returns math expression with replaced input placeholders
 */
function replaceInputPlacehodlers(equation) {
	return equation.replace(
		/{{(?<type>input|math|text|select)(?:-(?<size>xs|sm|md|lg|xl))?(?:-(?<id>\d+))?}}/g,
		(...args) => {
			const groups = args.pop();
			// remove default input type
			if (groups["type"] === "input") {
				delete groups["type"];
			}
			const classNames = [
				"input-placeholder",
				...Object.entries(groups)
					.filter(([_key, value]) => value !== undefined)
					.map(([key, value]) => `input-placeholder-${key}-${value}`),
			];
			const text = `\\#${groups["id"] ?? "?"}`;
			return `\\htmlClass{${classNames.join(" ")}}{\\text{${text}}}`;
		}
	);
}

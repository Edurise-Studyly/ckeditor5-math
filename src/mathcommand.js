import Command from '@ckeditor/ckeditor5-core/src/command';

import { getSelectedMathModelWidget } from './utils';

export default class MathCommand extends Command {

	//values for old selection when new selection in editor is not on formula
	lastSelectedFormulaSelection = null;
	lastSelectedElement = null;
	rangeLastSelectedFormula = null;
	keepOpen = false;
	afterEsc = false;
	currentlyRealMathSelection = null;
	viewHasBeenOpened = false;

	execute( equation, display, outputType, forceOutputType) {
		const model = this.editor.model;
		const selection = model.document.selection;
		let selectedElement = selection.getSelectedElement();

		model.change( writer => {
			let mathtex;
			if ( selectedElement && ( selectedElement.is( 'element', 'mathtex-inline' ) ||
					selectedElement.is( 'element', 'mathtex-display' ) ) ) {
				// Update selected element
				const typeAttr = selectedElement.getAttribute( 'type' );
				// Use already set type if found and is not forced
				const type = forceOutputType ? outputType : typeAttr || outputType;

				mathtex = writer.createElement( display ? 'mathtex-display' : 'mathtex-inline', { equation, type, display } );

				//readd fontBackgoundColor and fontColor if they were already set
				if (selectedElement.getAttribute('fontBackgroundColor')) {
					let fontBackGroundColor = selectedElement.getAttribute('fontBackgroundColor');
					writer.setAttribute('fontBackgroundColor', fontBackGroundColor, mathtex);
				}
				if (selectedElement.getAttribute('fontColor')) {
					let fontColor = selectedElement.getAttribute('fontColor');
					writer.setAttribute('fontColor', fontColor, mathtex);
				}

				model.insertContent( mathtex );
			//updates formula even though selection in editor is not on formula
			} else if ( this.lastSelectedFormulaSelection ) {
				selectedElement = this.lastSelectedElement;
				// Update selected element
				const typeAttr = selectedElement.getAttribute( 'type' );
				// Use already set type if found and is not forced
				const type = forceOutputType ? outputType : typeAttr || outputType;

				mathtex = writer.createElement( display ? 'mathtex-display' : 'mathtex-inline', { equation, type, display } );

				//readd fontBackgoundColor and fontColor if they were already set
				if (selectedElement.getAttribute('fontBackgroundColor')) {
					let fontBackGroundColor = selectedElement.getAttribute('fontBackgroundColor');
					writer.setAttribute('fontBackgroundColor', fontBackGroundColor, mathtex);
				}
				if (selectedElement.getAttribute('fontColor')) {
					let fontColor = selectedElement.getAttribute('fontColor');
					writer.setAttribute('fontColor', fontColor, mathtex);
				}

				model.insertContent( mathtex , this.rangeLastSelectedFormula );
			} else {
				// Create new model element
				mathtex = writer.createElement( display ? 'mathtex-display' : 'mathtex-inline', { equation, type: outputType, display } );
				model.insertContent( mathtex );
			}
			if ( this.keepOpen ) {
				this.resetMathCommand(false);
			}
		} );
	}

	//Reset values after formula is updated or canceled (after cancel button in mathui is pressed)
	resetMathCommand(setEsc) {
		this.currentlyRealMathSelection = null;
		this.viewHasBeenOpened = false;
		this.display =  null;
		if (!setEsc) {
			this.lastSelectedFormulaSelection = null;
			this.lastSelectedElement = null;
			this.rangeLastSelectedFormula = null;
			this.value = null;
		}
		this.afterEsc = setEsc;
	}

	enableChangesBeforeFormView() {
		this.editor.model.document.on( 'change:data', ( evt, batch ) => {
			if ( batch.isUndo || !batch.isLocal /*|| !plugin.isEnabled*/ ) { //maybe add keepOpen to this
				return;
			}
			this.rangeLastSelectedFormula = this.editor.model.createSelection( this.lastSelectedElement, 'on' );
		} );
	}

	// gets the data of the selected equation (equation, displayMode) if it is a mathElement, and remembers it
	// if keepOpen is true (keep math window open even if clicking out of editor), the last clicked formula (with its position)
	// is used for the input on the window
	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;
		let selectedElement = null;
		this.isEnabled = false;
		if (selection !== null) {
			selectedElement = selection.getSelectedElement();
		}

		//if selected element is null, also remember formula
		this.isEnabled = selectedElement === null || (selectedElement.is('element', 'mathtex-inline') ||
			selectedElement.is('element', 'mathtex-display'));

		//when a formula is clicked, preserve values for when click out of box happens (selection in editor is not on formula)
		if (selectedElement !== null && (selectedElement.is('element', 'mathtex-inline') || selectedElement.is('element', 'mathtex-display'))) {
			this.lastSelectedFormulaSelection = selection;
			this.rangeLastSelectedFormula = model.createSelection(selection);
			this.lastSelectedElement = selection.getSelectedElement();
			this.currentlyRealMathSelection = selectedElement;
		} else {
			this.currentlyRealMathSelection = null;
			if ( !this.viewHasBeenOpened ) { //reset if keepopen false and therefore view not opened
				this.resetMathCommand(false);
				return;
			}
		}

		if (this.keepOpen) {
			//update values of the formula, otherwise keep old values (needed for keeping stuff when clicking out of the box)
			const selectedEquation = getSelectedMathModelWidget(this.isEnabled ? selection : this.lastSelectedFormulaSelection);
			this.value = selectedEquation ? selectedEquation.getAttribute('equation') : this.value;
			this.display = selectedEquation ? selectedEquation.getAttribute('display') : this.display;
		} else {
			const selectedEquation = getSelectedMathModelWidget( selection );
			this.value = selectedEquation ? selectedEquation.getAttribute( 'equation' ) : null;
			this.display = selectedEquation ? selectedEquation.getAttribute( 'display' ) : null;
		}
	}
}

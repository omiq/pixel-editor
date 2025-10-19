
// Create finished document
const oldSaveDocument = () => {
	let row, col;

	document.getElementById("instructions").innerHTML = "<p>";
	document.getElementById("header").innerHTML = "<h1></h1>";

	// initialize colours
	const instructions            = {};
	const directionalInstructions = {
		horizontal: {},
		vertical: {}
	};

	document.getElementById("canvasBitmap").style.border = "2px solid";


	const resizedCanvas = document.getElementById("zoomcanvas");
	const resizedContext = resizedCanvas.getContext("2d");

	resizedCanvas.height = "900";
	resizedCanvas.width = "900";

	resizedContext.drawImage(canvas, 0, 0, parseInt( resizedCanvas.width ), parseInt( resizedCanvas.height ) );

	document.getElementById("canvasBitmap").src = resizedCanvas.toDataURL();
	document.getElementById("canvasBitmap").style.display = "block";

	const addInstructions = (row, col, direction = 'horizontal') => {
		const thisPixel = canvasContext.getImageData(col, row, 1, 1).data;

		const n_match  = ntc.name(rgbHex(thisPixel[0], thisPixel[1], thisPixel[2]));
		const thisColourName = n_match[1];

		if ( 'White' === thisColourName ) {
			return;
		}

		const columnLetter = String.fromCharCode(65+parseInt(col/pixelSize));
		const rowNumber    = String(parseInt(row/pixelSize));
		instructions[thisColourName]+= columnLetter+','+rowNumber+" ";
		directionalInstructions[direction][thisColourName] += columnLetter+','+rowNumber+" ";
	};

	// read the row and column colour values from the drawing
	for (row = 10; row < 400; row += pixelSize) {

		for (col = 10; col < 400; col += pixelSize) {
			addInstructions( row, col );
		}

	}

	for (col = 10; col < 400; col += pixelSize) {

		for (row = 10; row < 400; row += pixelSize) {
			addInstructions( row, col, 'vertical' );
		}

	}


	// Document heading
	document.getElementById("header").innerHTML = "<h1>Instructions</h1>";

	const buildInstructions = () => {
		// Instructions table
		for (let item in instructions) {
			if (item !== "White") {
				const outInstruction = [];
				const horizontalInstruction    = directionalInstructions.horizontal[item].replace("undefined", "").trim();
				const verticalInstruction      = directionalInstructions.vertical[item].replace("undefined", "").trim();
				const horizontalInstructionArr = horizontalInstruction.split(' ');
				const verticalInstructionArr   = verticalInstruction.split(' ');
				const horizontalLines          = [];
				const verticalLines            = [];


				let lineSegmentPixels  = [];
				let singlePixels       = [];

				console.log({ horizontalInstructionArr: horizontalInstructionArr, verticalInstructionArr: verticalInstructionArr });

				let previousLetter = '@';
				let previousNumber = -1;
				let lineSegment   = [];
				let lineStart      = '';
				let lineEnd        = '';
				let count          = 0;
				let firstRow       = true;
				let firstCol       = true;

				const resetVars = ( start = '' ) => {
					lineStart    = start;
					lineEnd      = '';
					lineSegment = [];
				};

				// Store all single pixels.
				horizontalInstructionArr.forEach( (cell) => {
					singlePixels.push( cell.replace(',', '') );
				} );

				horizontalInstructionArr.forEach( (cell) => {
					const cellArray     = cell.split(',');
					const cellFlat      = cell.replace(',', '');
					const currentLetter = cellArray[0];
					const currentNumber = cellArray[1];

					if ( previousNumber !== currentNumber ) {
						if ( lineStart !== '' ) {
							if ( lineStart !== lineEnd && '' !== lineEnd ) {
								horizontalLines.push( lineStart + '-' + lineEnd );
								lineSegmentPixels = lineSegmentPixels.concat( lineSegment );
							}
						}
						previousLetter = '@';

						resetVars();
					}

					if ( lineStart === '' ) {
						lineStart = cellFlat;
					}

					const prevLetAsNum = previousLetter.charCodeAt(0) - 65;
					const currLetAsNum = currentLetter.charCodeAt(0) - 65;

					if ( currLetAsNum - 1 === prevLetAsNum ) {
						lineEnd = cellFlat;
					} else if ( lineStart !== '' && ! firstRow ) {
						if ( lineStart !== lineEnd && lineEnd !== '' ) {
							horizontalLines.push( lineStart + '-' + lineEnd );
							lineSegment.push( lineEnd );
							lineSegmentPixels = lineSegmentPixels.concat( lineSegment );
						}

						resetVars( cellFlat );
					}

					firstRow = false;

					count++;

					if ( count === horizontalInstructionArr.length ) {
						if ( lineStart !== '' ) {
							if ( lineStart !== lineEnd && '' !== lineEnd ) {
								horizontalLines.push( lineStart + '-' + lineEnd );
								lineSegment.push( lineEnd );
								lineSegmentPixels = lineSegmentPixels.concat( lineSegment );
							}
						}

						return;
					}

					previousNumber = currentNumber;
					previousLetter = currentLetter;

					lineSegment.push( cellFlat );

				});

				console.log({
					horizontalLines: horizontalLines,
					verticalLines: verticalLines,
					singlePixels: singlePixels,
					lineSegmentPixels: lineSegmentPixels,
				} );

				resetVars();

				count = 0;

				const removeSinglePixels = () => {
					console.log({
						singlePixels: singlePixels,
						lineSegmentPixels: lineSegmentPixels,
					});
					singlePixels = singlePixels.filter( x => ! lineSegmentPixels.includes(x) );
				};

				const maybeHandleLastItem = () => {
					count++;
					if ( count === verticalInstructionArr.length ) {
						if ( lineStart !== '' ) {
							if ( lineStart !== lineEnd && '' !== lineEnd ) {
								verticalLines.push( lineStart + '-' + lineEnd );
								lineSegment.push( lineEnd );
								lineSegmentPixels = lineSegmentPixels.concat( lineSegment );
							}
						}
					}
				};

				verticalInstructionArr.forEach( (cell) => {
					const cellArray     = cell.split(',');
					const cellFlat      = cell.replace(',', '');
					const currentLetter = cellArray[0];
					const currentNumber = parseInt( cellArray[1] );

					console.log(cellFlat);

					if ( lineSegmentPixels.includes( cellFlat ) ) {
						maybeHandleLastItem();
						return;
					}

					if ( previousLetter !== currentLetter ) {
						firstCol = true;

						if ( lineStart !== '' ) {
							if ( lineStart !== lineEnd && '' !== lineEnd ) {
								verticalLines.push( lineStart + '-' + lineEnd );
								lineSegment.push( lineEnd );
								lineSegmentPixels = lineSegmentPixels.concat( lineSegment );
							}
						}
						previousNumber = -1;

						resetVars();
					}

					if ( lineStart === '' ) {
						lineStart = cellFlat;
					}

					if ( currentNumber - 1 === previousNumber ) {
						lineEnd = cellFlat;
					} else if ( lineStart !== '' && ! firstCol ) {
						if ( lineStart !== lineEnd && lineEnd !== '' ) {
							horizontalLines.push( lineStart + '-' + lineEnd );
							lineSegment.push( lineEnd );
							lineSegmentPixels = lineSegmentPixels.concat( lineSegment );
						}

						resetVars( cellFlat );
					}

					firstCol = false;

					count++;

					maybeHandleLastItem();

					lineSegment.push( cellFlat );

					previousNumber = currentNumber;
					previousLetter = currentLetter;
				});

				removeSinglePixels();

				singlePixels = [... new Set( singlePixels )];

				console.log({
					horizontalLines: horizontalLines,
					verticalLines: verticalLines,
					singlePixels: singlePixels,
					count: count,
					lineSegmentPixels: lineSegmentPixels,
					verticalInstructionArrLength: verticalInstructionArr.length
				} );

				// reverse all the things.
				horizontalLines.reverse();
				verticalLines.reverse();
				singlePixels.reverse();

				outInstruction.push( horizontalLines, verticalLines, singlePixels );
				const htmlInstruction    = [...new Set( outInstruction )].join(', ');
				document.getElementById("instructions").innerHTML += "<h3>" + item + "</h3>" + htmlInstruction + "\n\n";

				console.log( { outInstruction: outInstruction, htmlInstruction: htmlInstruction })
			}
		}
	};

	buildInstructions();
};

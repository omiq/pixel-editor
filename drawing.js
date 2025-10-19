let canvas, canvasContext, w, h;
let mouseX          = 0;
let mouseY          = 0;
let penColour       = "#eeeeee";
let prevColour      = penColour;

const colourPalette = {
	"Red": "#ff0000",
	"DarkRed": "#AA0000",
	"LightPink": "#FFC0CB",
	"Orange": "	#ED9121",
	"Light Orange": "#FFCC00",
	"Orange Yellow": "#FFDD00",
	"Yellow": "#FFFF00",
	"Yellow Green": "#DDFF00",
	"Green": "#00FF00",
	"DarkGreen": "#004620",
	"Turquoise": "#40E0D0",
	"LightBlue": "#AAAAFF",
	"Blue": "#0000FF",
	"DarkBlue": "#0000AA",
	"Indigo": "#4B0082",
	"Purple": "#800080",
	"Magenta": "#FF00FF",
	"LightBrown": "#8B4513",
	"DarkBrown ": "#772211",
	"LightGray": "#AAAAAA",
	"DarkGray": "#DDDDDD",
	"Black": "#000000",
	"LightSkin": "#F5DEB3",
	"MediumSkin": "#DEB887"
};

const intHex = (rgb) => {
	const hex = Number(rgb).toString(16);
	// noinspection Annotator
	return hex.padStart(2, '0');
};

const rgbHex = (r, g, b) => {
	if (r > 255 || g > 255 || b > 255)
		throw "Invalid colour!";
	const hexString = intHex(r)+intHex(g)+intHex(b);
	return "#" + hexString;
};

const changeColour = (obj) => {
	penColour = colourPalette[obj.id] || obj.id;
};

const blank = () => {
	let colourName, colourButton, x, y;

	const palette = document.getElementById("paletteButtons");
	palette.innerHTML="";

	for ( colourName in colourPalette ) {
		colourButton = '<div style="display:inline-block ;width:60px;height:60px;background:' + colourPalette[colourName] +';" id="' + colourName +'" onclick="changeColour(this)"></div>';
		palette.innerHTML+=colourButton;
	}

	penColour = "#eeeeee";

	canvasContext.fillStyle   = "#ffffff";
	canvasContext.strokeStyle = penColour;

	canvasContext.clearRect(0, 0, w, h);

	// document.getElementById("canvasBitmap").style.display = "none";

	canvasContext.fillRect(0, 0, canvas.width, canvas.height);

	for (x = 0; x <= w; x += 20) {
		canvasContext.moveTo(x, 0);
		canvasContext.lineTo(x, h);

		for (y = 0; y <= h; y += 20) {
			canvasContext.moveTo(0, y);
			canvasContext.lineTo(w, y);
		}
	}
	canvasContext.stroke();

	// document.getElementById("instructions").innerHTML = "<p>";
	// document.getElementById("header").innerHTML = "<h1></h1>";
	penColour = "#000000";
};

const newDocument = () => {
	const m = confirm("Delete the whole drawing - Are you sure?");
	if (m) {
		blank();
	}
};

const saveDocument = () => {
	let row, col;
};


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

		const columnLetter = String.fromCharCode(65+parseInt(col/20));
		const rowNumber    = String(parseInt(row/20));
		instructions[thisColourName]+= columnLetter+','+rowNumber+" ";
		directionalInstructions[direction][thisColourName] += columnLetter+','+rowNumber+" ";
	};

	// read the row and column colour values from the drawing
	for (row = 10; row < 400; row += 20) {

		for (col = 10; col < 400; col += 20) {
			addInstructions( row, col );
		}

	}

	for (col = 10; col < 400; col += 20) {

		for (row = 10; row < 400; row += 20) {
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

// mouse drawing routine
const mouseControl = (e, eventType) => {

	var xField = document.getElementById("x");
	var yField = document.getElementById("y");

	xField.value = mouseX;
	yField.value = mouseY;

	// What type of mouse action is being taken?
	switch (eventType) {
		case "down":
			mouseControl.isDrawing = true;
			break;
		case "up":
			mouseControl.isDrawing = false;
			if ( penColour === "white" && prevColour !== penColour) {
				penColour = prevColour;
			}
			break;
		case "out":
			mouseControl.isDrawing = false;
			break;
		case "over":
			mouseControl.isDrawing = false;

			break;
	}


	// Get the mouse coords relative to canvas
	mouseX = parseInt((e.clientX - canvas.offsetLeft) / 20);
	mouseY = parseInt((e.clientY - canvas.offsetTop) / 20);


	if( mouseControl.isDrawing ) {
		// If using eraser then need to reapply the grid lines.
		if ( penColour === "white" || e.button === 2 ) {
			canvasContext.lineWidth = 1;
			canvasContext.strokeStyle = "#eeeeee";
			canvasContext.fillStyle = "white";
			canvasContext.beginPath();
			canvasContext.fillRect((mouseX * 20), (mouseY * 20), 19, 19);
			canvasContext.strokeRect((mouseX * 20), (mouseY * 20), 20, 20);
			canvasContext.closePath();
		} else {
			canvasContext.lineWidth = 1;
			canvasContext.strokeStyle = penColour;
			canvasContext.fillStyle = penColour;
			canvasContext.beginPath();
			canvasContext.fillRect((mouseX * 20), (mouseY * 20), 19, 19);
			canvasContext.closePath();
		}
	}
};




const init = () => {

	mouseControl.isDrawing = false;
	canvas = document.getElementById('drawingCanvas');
	canvas.addEventListener('contextmenu', function(e) {
		if ( parseInt( e.button ) === 2 ) {
			// Block right-click menu thru preventing default action.
			e.preventDefault();
			mouseControl.isDrawing = true;
			prevColour = penColour;
			penColour = "white";
		}
	});
	canvasContext = canvas.getContext("2d");
	canvasContext.globalAlpha = 1;

	canvasContext.fillStyle = "white";
	canvasContext.strokeStyle = penColour;

	w = canvas.width;
	h = canvas.height;
	console.log({ w: w, h: h });


	// Set up the bitmap drawing area with grid
	blank();

	canvas.addEventListener("mousedown", function (e) { mouseControl(e,"down") }, false);
	canvas.addEventListener("mousemove", function (e) { mouseControl(e,"move") }, false);
	canvas.addEventListener("mouseup", function (e) { mouseControl(e,"up") }, false);
	canvas.addEventListener("mouseout", function (e) { mouseControl(e,"out") }, false);
	canvas.addEventListener("mouseover", function (e) { mouseControl(e,"over") }, false);

};

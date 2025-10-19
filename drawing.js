let canvas, canvasContext, w, h;
let mouseX          = 0;
let mouseY          = 0;
let penColour       = "#eeeeee";
let prevColour      = penColour;
let pixelSize       = 10;

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
	// palette.innerHTML="";

	// for ( colourName in colourPalette ) {
	// 	colourButton = '<div style="display:inline-block ;width:60px;height:60px;background:' + colourPalette[colourName] +';" id="' + colourName +'" onclick="changeColour(this)"></div>';
	// 	palette.innerHTML+=colourButton;
	// }

	penColour = "#eeeeee";

	canvasContext.fillStyle   = "#ffffff";
	canvasContext.strokeStyle = penColour;

	canvasContext.clearRect(0, 0, w, h);

	// document.getElementById("canvasBitmap").style.display = "none";

	canvasContext.fillRect(0, 0, canvas.width, canvas.height);

	for (x = 0; x <= w; x += pixelSize) {
		canvasContext.moveTo(x, 0);
		canvasContext.lineTo(x, h);

		for (y = 0; y <= h; y += pixelSize) {
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
	let row, col, charRow;
	let renderedCanvas = document.getElementById("64x64");
	let renderedContext = renderedCanvas.getContext("2d");
	renderedContext.clearRect(0, 0, renderedCanvas.width, renderedCanvas.height);
	renderedContext.drawImage(canvas, 0, 0, renderedCanvas.width, renderedCanvas.height);
	
	let allCharacters = [];
	let dataStatements = [];
	let lineNumber = 1000;
	
	// Loop through each 8x8 character in the 64x64 grid
	for(row=0; row<8; row++) {
		for(col=0; col<8; col++) {
			let charData = [];
			// console.log(`Character at col=${col}, row=${row}`);
			
			// Get 8 rows of 8 pixels for this character
			for(charRow=0; charRow<8; charRow++) {
				// Get one row of 8 pixels for this character
				let imageData = renderedContext.getImageData(col*8, row*8 + charRow, 8, 1);
				
				// Convert 8 pixels to a single byte value (0-255)
				let byteValue = 0;
				for(let pixel = 0; pixel < 8; pixel++) {
					let pixelIndex = pixel * 4; // RGBA, so 4 values per pixel
					let r = imageData.data[pixelIndex];
					let g = imageData.data[pixelIndex + 1];
					let b = imageData.data[pixelIndex + 2];
					
					// Calculate luminance
					let luminance = 0.299 * r + 0.587 * g + 0.114 * b;
					
					// If pixel is dark (below threshold), set the bit
					if (luminance < 128) {
						byteValue |= (1 << (7 - pixel)); // Set bit from left to right
					}
				}
				
				charData.push(byteValue);
			}
			
			allCharacters.push(charData);
			
			// Create DATA statement for C64 BASIC
			let dataLine = `${lineNumber} DATA ${charData.join(',')}`;
			dataStatements.push(dataLine);
			lineNumber += 10;
			
			// console.log(dataLine);
		}
	}
	
	// Output all DATA statements
	console.log('\n=== C64 BASIC DATA Statements ===');
	console.log(dataStatements.join('\n'));
	
	return { characters: allCharacters, dataStatements: dataStatements };
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
	mouseX = parseInt((e.clientX - canvas.offsetLeft) / pixelSize);
	mouseY = parseInt((e.clientY - canvas.offsetTop) / pixelSize);


	if( mouseControl.isDrawing ) {
		// If using eraser then need to reapply the grid lines.
		if ( penColour === "white" || e.button === 2 ) {
			canvasContext.lineWidth = 1;
			canvasContext.strokeStyle = "#eeeeee";
			canvasContext.fillStyle = "white";
			canvasContext.beginPath();
			canvasContext.fillRect((mouseX * pixelSize), (mouseY * pixelSize), pixelSize-1, pixelSize-1);
			canvasContext.strokeRect((mouseX * pixelSize), (mouseY * pixelSize), pixelSize, pixelSize);
			canvasContext.closePath();
		} else {
			canvasContext.lineWidth = 1;
			canvasContext.strokeStyle = penColour;
			canvasContext.fillStyle = penColour;
			canvasContext.beginPath();
			canvasContext.fillRect((mouseX * pixelSize), (mouseY * pixelSize), pixelSize-1, pixelSize-1);
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

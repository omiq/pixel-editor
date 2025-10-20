let canvas, canvasContext, canvasContainer, w, h;
let mouseX          = 0;
let mouseY          = 0;
let penColour       = "#eeeeee";
let prevColour      = penColour;
let pixelSize       = 10;
let isPanning       = false;
let panStartX       = 0;
let panStartY       = 0;
let scrollStartX    = 0;
let scrollStartY    = 0;

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

const changeZoom = (newPixelSize) => {
	// Store the current pixel data before changing zoom (always 64x64 logical pixels)
	const gridSize = 64;
	const pixelData = [];
	
	// Read each logical pixel's color
	for (let py = 0; py < gridSize; py++) {
		pixelData[py] = [];
		for (let px = 0; px < gridSize; px++) {
			// Sample the center of each pixel to get its color
			const imageData = canvasContext.getImageData(
				px * pixelSize + Math.floor(pixelSize / 2),
				py * pixelSize + Math.floor(pixelSize / 2),
				1, 1
			);
			const r = imageData.data[0];
			const g = imageData.data[1];
			const b = imageData.data[2];
			
			// Check if it's a filled pixel (not white/background)
			if (r < 250 || g < 250 || b < 250) {
				pixelData[py][px] = rgbHex(r, g, b);
			} else {
				pixelData[py][px] = null; // Background
			}
		}
	}
	
	// Update pixel size
	pixelSize = parseInt(newPixelSize);
	
	// Resize canvas to fit 64x64 logical pixels at new zoom
	const newSize = 64 * pixelSize;
	canvas.width = newSize;
	canvas.height = newSize;
	w = canvas.width;
	h = canvas.height;
	
	// Redraw grid
	blank();
	
	// Redraw all the pixels at the new size (within grid boundaries)
	for (let py = 0; py < gridSize; py++) {
		for (let px = 0; px < gridSize; px++) {
			if (pixelData[py][px]) {
				canvasContext.fillStyle = pixelData[py][px];
				canvasContext.fillRect(px * pixelSize + 1, py * pixelSize + 1, pixelSize - 1, pixelSize - 1);
			}
		}
	}
};

const blank = () => {
	let colourName, colourButton, x, y,darkPenColour;

	canvasContext.fillStyle   = "#ffffff";
	canvasContext.strokeStyle = penColour;
	canvasContext.clearRect(0, 0, w, h);
	canvasContext.fillRect(0, 0, canvas.width, canvas.height);
	penColour = "#eeeeee";
	canvasContext.strokeStyle = penColour;

	for (x = 0; x <= w; x += pixelSize) {
		canvasContext.moveTo(x, 0);
		canvasContext.lineTo(x, h);

		for (y = 0; y <= h; y += pixelSize) {
			canvasContext.moveTo(0, y);
			canvasContext.lineTo(w, y);
		}
	}

	var unit = pixelSize*8;
	canvasContext.stroke();
	darkPenColour = "#AAAAAA";
	canvasContext.strokeStyle = darkPenColour;
	canvasContext.lineWidth = 1;

	for (x = 0; x <= w; x +=unit) {
		canvasContext.beginPath();
		canvasContext.moveTo(x, 0);
		canvasContext.lineTo(x, h);	
		canvasContext.closePath();
		canvasContext.stroke();
	}

	for (y = 0; y <= h; y +=unit) {
		canvasContext.beginPath();
		canvasContext.moveTo(0, y);
		canvasContext.lineTo(w, y);	
		canvasContext.closePath();
		canvasContext.stroke();
	}




	canvasContext.stroke();
	penColour = "#000000";
};

const newDocument = () => {
	const m = confirm("Delete the whole drawing - Are you sure?");
	if (m) {
		blank();
	}
};

const importImage = () => {
	// Trigger the hidden file input
	const fileInput = document.getElementById('imageFileInput');
	fileInput.click();
};

const handleFileSelect = (event) => {
	const file = event.target.files[0];
	
	if (!file) {
		return;
	}
	
	// Check if it's an image
	if (!file.type.startsWith('image/')) {
		alert('Please select an image file');
		return;
	}
	
	// Create object URL from the file
	const imageUrl = URL.createObjectURL(file);
	
	// Create image and wait for it to load
	const image = new Image();
	
	image.onload = () => {
		// Draw the image scaled to the canvas
		canvasContext.drawImage(image, 0, 0, canvas.width, canvas.height);
		
		// Clean up the object URL
		URL.revokeObjectURL(imageUrl);
		
		console.log('Image imported successfully');
		
		// Reset the file input so the same file can be selected again
		event.target.value = '';
	};
	
	image.onerror = () => {
		console.error('Failed to load image');
		URL.revokeObjectURL(imageUrl);
		alert('Failed to load image');
		event.target.value = '';
	};
	
	// Set the source to trigger loading
	image.src = imageUrl;
};

const saveDocument = () => {
	let row, col, charRow;
	let renderedCanvas = document.getElementById("64x64");
	let renderedContext = renderedCanvas.getContext("2d", { willReadFrequently: true });
	renderedContext.clearRect(0, 0, renderedCanvas.width, renderedCanvas.height);
	
	// Fill with white background
	renderedContext.fillStyle = "white";
	renderedContext.fillRect(0, 0, renderedCanvas.width, renderedCanvas.height);
	
	// Read logical pixels and render them cleanly to 64x64 canvas (without grid lines)
	const gridSize = 64; // Always 64x64 logical pixels
	
	for (let py = 0; py < gridSize; py++) {
		for (let px = 0; px < gridSize; px++) {
			// Sample the center of each logical pixel to get its color
			const imageData = canvasContext.getImageData(
				px * pixelSize + Math.floor(pixelSize / 2),
				py * pixelSize + Math.floor(pixelSize / 2),
				1, 1
			);
			const r = imageData.data[0];
			const g = imageData.data[1];
			const b = imageData.data[2];
			
			// Draw the pixel to the rendered canvas
			renderedContext.fillStyle = rgbHex(r, g, b);
			renderedContext.fillRect(px, py, 1, 1);
		}
	}
	
	
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
	
	// Handle middle mouse button panning
	if (e.button === 1 || isPanning) {
		if (eventType === "down") {
			isPanning = true;
			panStartX = e.clientX;
			panStartY = e.clientY;
			scrollStartX = canvasContainer.scrollLeft;
			scrollStartY = canvasContainer.scrollTop;
			canvas.style.cursor = "grabbing";
			e.preventDefault();
			return;
		} else if (eventType === "move" && isPanning) {
			const deltaX = panStartX - e.clientX;
			const deltaY = panStartY - e.clientY;
			canvasContainer.scrollLeft = scrollStartX + deltaX;
			canvasContainer.scrollTop = scrollStartY + deltaY;
			e.preventDefault();
			return;
		} else if (eventType === "up") {
			isPanning = false;
			canvas.style.cursor = "crosshair";
			e.preventDefault();
			return;
		}
	}

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


	// Get the mouse coords relative to canvas (accounting for scroll position)
	const rect = canvas.getBoundingClientRect();
	mouseX = parseInt((e.clientX - rect.left) / pixelSize);
	mouseY = parseInt((e.clientY - rect.top) / pixelSize);


	if( mouseControl.isDrawing ) {
		// Draw within the grid lines so they are never overwritten
		if ( penColour === "white" || e.button === 2 ) {
			// Erase - fill with white within the grid boundaries
			canvasContext.fillStyle = "white";
			canvasContext.fillRect((mouseX * pixelSize) + 1, (mouseY * pixelSize) + 1, pixelSize - 1, pixelSize - 1);
		} else {
			// Draw - fill with color within the grid boundaries
			canvasContext.fillStyle = penColour;
			canvasContext.fillRect((mouseX * pixelSize) + 1, (mouseY * pixelSize) + 1, pixelSize - 1, pixelSize - 1);
		}
	}
};




const init = () => {

	mouseControl.isDrawing = false;
	canvas = document.getElementById('drawingCanvas');
	canvasContainer = document.getElementById('canvasContainer');
	
	canvas.addEventListener('contextmenu', function(e) {
		if ( parseInt( e.button ) === 2 ) {
			// Block right-click menu thru preventing default action.
			e.preventDefault();
			mouseControl.isDrawing = true;
			prevColour = penColour;
			penColour = "white";
		}
	});
	
	// Prevent default middle mouse button behavior
	canvas.addEventListener('mousedown', function(e) {
		if (e.button === 1) {
			e.preventDefault();
		}
	});
	
	canvasContext = canvas.getContext("2d", { willReadFrequently: true });
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

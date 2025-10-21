let canvas, canvasContext, canvasContainer, previewCanvas, previewContext, w, h;
let mouseX          = 0;
let mouseY          = 0;
let penColour       = "#eeeeee";
let prevColour      = penColour;
let pixelSize       = 10;
let gridSize        = 64; // Default 8x8 characters (64x64 pixels)
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

const updatePreview = () => {
	// Clear preview canvas
	previewContext.fillStyle = "white";
	previewContext.fillRect(0, 0, gridSize, gridSize);
	
	// Read logical pixels and render them to preview canvas
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
			
			// Draw the pixel to the preview canvas
			previewContext.fillStyle = rgbHex(r, g, b);
			previewContext.fillRect(px, py, 1, 1);
		}
	}
};

const syncPreviewToMainCanvas = () => {
	// Read each pixel from preview canvas and update main canvas
	for (let py = 0; py < gridSize; py++) {
		for (let px = 0; px < gridSize; px++) {
			const imageData = previewContext.getImageData(px, py, 1, 1);
			const r = imageData.data[0];
			const g = imageData.data[1];
			const b = imageData.data[2];
			
			// Draw to main canvas with grid spacing
			canvasContext.fillStyle = rgbHex(r, g, b);
			canvasContext.fillRect(
				px * pixelSize + 1, 
				py * pixelSize + 1, 
				pixelSize - 2, 
				pixelSize - 2
			);
		}
	}
};

const invertColors = () => {
	// Get image data from preview canvas
	const imageData = previewContext.getImageData(0, 0, gridSize, gridSize);
	const data = imageData.data;
	
	// Invert each pixel
	for (let i = 0; i < data.length; i += 4) {
		data[i] = 255 - data[i];         // Invert R
		data[i + 1] = 255 - data[i + 1]; // Invert G
		data[i + 2] = 255 - data[i + 2]; // Invert B
		// Alpha (i+3) stays the same
	}
	
	// Put the inverted data back to preview
	previewContext.putImageData(imageData, 0, 0);
	
	// Sync preview to main canvas
	syncPreviewToMainCanvas();
	
	console.log('Colors inverted');
};

const changeCanvasSize = (newGridSize) => {
	// Store current pixel data
	const oldGridSize = gridSize;
	const pixelData = [];
	
	// Read each logical pixel's color from current canvas
	for (let py = 0; py < oldGridSize; py++) {
		pixelData[py] = [];
		for (let px = 0; px < oldGridSize; px++) {
			const imageData = canvasContext.getImageData(
				px * pixelSize + Math.floor(pixelSize / 2),
				py * pixelSize + Math.floor(pixelSize / 2),
				1, 1
			);
			const r = imageData.data[0];
			const g = imageData.data[1];
			const b = imageData.data[2];
			
			if (r < 250 || g < 250 || b < 250) {
				pixelData[py][px] = rgbHex(r, g, b);
			} else {
				pixelData[py][px] = null;
			}
		}
	}
	
	// Update grid size
	gridSize = parseInt(newGridSize);
	
	// Resize canvas
	const newSize = gridSize * pixelSize;
	canvas.width = newSize;
	canvas.height = newSize;
	w = canvas.width;
	h = canvas.height;
	
	// Redraw grid
	blank();
	
	// Redraw pixels (only those that fit in new size)
	const copySize = Math.min(oldGridSize, gridSize);
	for (let py = 0; py < copySize; py++) {
		for (let px = 0; px < copySize; px++) {
			if (pixelData[py] && pixelData[py][px]) {
				canvasContext.fillStyle = pixelData[py][px];
				canvasContext.fillRect(px * pixelSize + 1, py * pixelSize + 1, pixelSize - 2, pixelSize - 2);
			}
		}
	}
	
	// Update preview canvas size and refresh it
	previewCanvas.width = gridSize;
	previewCanvas.height = gridSize;
	updatePreview();
};

const changeZoom = (newPixelSize) => {
	// Store the current pixel data before changing zoom
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
	
	// Resize canvas to fit current grid size at new zoom
	const newSize = gridSize * pixelSize;
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
				canvasContext.fillRect(px * pixelSize + 1, py * pixelSize + 1, pixelSize - 2, pixelSize - 2);
			}
		}
	}
	
	// Update preview
	updatePreview();
};

const blank = () => {
	let colourName, colourButton, x, y,darkPenColour;

	canvasContext.fillStyle   = "#ffffff";
	canvasContext.strokeStyle = penColour;
	canvasContext.clearRect(0, 0, w, h);
	canvasContext.fillRect(0, 0, canvas.width, canvas.height);
	
	// Clear preview
	previewContext.fillStyle = "white";
	previewContext.fillRect(0, 0, gridSize, gridSize);
	
	// Draw light grid lines (every pixel)
	penColour = "#eeeeee";
	canvasContext.strokeStyle = penColour;
	canvasContext.lineWidth = 1;
	canvasContext.beginPath();
	
	for (x = 0; x <= w; x += pixelSize) {
		canvasContext.moveTo(x, 0);
		canvasContext.lineTo(x, h);
	}
	
	for (y = 0; y <= h; y += pixelSize) {
		canvasContext.moveTo(0, y);
		canvasContext.lineTo(w, y);
	}
	
	canvasContext.stroke();

	// Draw darker grid lines (every 8 pixels)
	var unit = pixelSize*8;
	darkPenColour = "#AAAAAA";
	canvasContext.strokeStyle = darkPenColour;
	canvasContext.lineWidth = 1;
	canvasContext.beginPath();

	for (x = 0; x <= w; x += unit) {
		canvasContext.moveTo(x, 0);
		canvasContext.lineTo(x, h);	
	}

	for (y = 0; y <= h; y += unit) {
		canvasContext.moveTo(0, y);
		canvasContext.lineTo(w, y);	
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
		// Create a temporary canvas to process the image
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = canvas.width;
		tempCanvas.height = canvas.height;
		const tempContext = tempCanvas.getContext('2d');
		
		// Draw the image scaled to temp canvas
		tempContext.drawImage(image, 0, 0, canvas.width, canvas.height);
		
		// Get image data
		const imageData = tempContext.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;
		
		// Convert to monochrome (black and white) based on luminance
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			
			// Calculate luminance
			const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
			
			// Threshold at 128 - below is black, above is white
			const value = luminance < 128 ? 0 : 255;
			
			data[i] = value;     // R
			data[i + 1] = value; // G
			data[i + 2] = value; // B
			// Alpha (i+3) stays the same
		}
		
	// Put the processed image data back
	tempContext.putImageData(imageData, 0, 0);
	
	// Clear canvas and redraw grid
	blank();
	
	// Draw the monochrome image pixel-by-pixel to main canvas, respecting grid lines
	for (let py = 0; py < gridSize; py++) {
		for (let px = 0; px < gridSize; px++) {
			// Sample the center of each logical pixel area from temp canvas
			const sampleX = px * pixelSize + Math.floor(pixelSize / 2);
			const sampleY = py * pixelSize + Math.floor(pixelSize / 2);
			const pixelData = tempContext.getImageData(sampleX, sampleY, 1, 1);
			const r = pixelData.data[0];
			const g = pixelData.data[1];
			const b = pixelData.data[2];
			
			// Only draw if it's not white (background)
			if (r < 250 || g < 250 || b < 250) {
				canvasContext.fillStyle = rgbHex(r, g, b);
				canvasContext.fillRect(px * pixelSize + 1, py * pixelSize + 1, pixelSize - 2, pixelSize - 2);
			}
		}
	}
	
	// Update preview
	updatePreview();
	
	// Clean up the object URL
	URL.revokeObjectURL(imageUrl);
	
	console.log('Image imported and converted to monochrome');
	
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

const downloadDrawing = () => {
	// Use the preview canvas which is already rendering the clean output
	const createEl = document.createElement('a');
	createEl.href = previewCanvas.toDataURL('image/png');
	createEl.download = "drawing_" + Date.now() + ".png";
	createEl.click();
	createEl.remove();
};

const saveDocument = () => {


	let name = 'drawing_' + Date.now();
	let row, col, charRow;
	
	// Use the preview canvas which is already rendering the clean output
	let renderedCanvas = previewCanvas;
	let renderedContext = previewContext;
	
	
	let allCharacters = [];
	let dataStatements = [];
	let lineNumber = 1000;
	
	// Calculate number of 8x8 characters (each char is 8x8 pixels)
	const numCharsWide = gridSize / 8;
	const numCharsHigh = gridSize / 8;
	
	// Loop through each 8x8 character in the grid
	for(row=0; row<numCharsHigh; row++) {
		for(col=0; col<numCharsWide; col++) {
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
	
	var exportData = dataStatements.join('\n');
	console.log(exportData);
	  
	// Download the data statements as a text file
	var tempLink = document.createElement("a");
	var taBlob = new Blob([exportData], {type: 'text/plain'});
	tempLink.setAttribute('href', URL.createObjectURL(taBlob));
	tempLink.setAttribute('download', `${name.toLowerCase()}.txt`);
	tempLink.click();
	URL.revokeObjectURL(tempLink.href);

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
			canvasContext.fillRect((mouseX * pixelSize) + 1, (mouseY * pixelSize) + 1, pixelSize - 2, pixelSize - 2);
		} else {
			// Draw - fill with color within the grid boundaries
			canvasContext.fillStyle = penColour;
			canvasContext.fillRect((mouseX * pixelSize) + 1, (mouseY * pixelSize) + 1, pixelSize - 2, pixelSize - 2);
		}
		
		// Update preview in real-time
		updatePreview();
	}
};




const init = () => {

	mouseControl.isDrawing = false;
	canvas = document.getElementById('drawingCanvas');
	canvasContainer = document.getElementById('canvasContainer');
	previewCanvas = document.getElementById('previewCanvas');
	previewContext = previewCanvas.getContext('2d', { willReadFrequently: true });
	
	// Initialize canvas size
	const newSize = gridSize * pixelSize;
	canvas.width = newSize;
	canvas.height = newSize;
	
	// Initialize preview canvas size
	previewCanvas.width = gridSize;
	previewCanvas.height = gridSize;
	
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
	
	// Initial preview update
	updatePreview();

	canvas.addEventListener("mousedown", function (e) { mouseControl(e,"down") }, false);
	canvas.addEventListener("mousemove", function (e) { mouseControl(e,"move") }, false);
	canvas.addEventListener("mouseup", function (e) { mouseControl(e,"up") }, false);
	canvas.addEventListener("mouseout", function (e) { mouseControl(e,"out") }, false);
	canvas.addEventListener("mouseover", function (e) { mouseControl(e,"over") }, false);

};

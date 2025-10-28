let canvas, canvasContext, canvasContainer, overlayCanvas, overlayContext, previewCanvas, previewContext, w, h;
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

// Drawing tool state
let currentTool     = "pencil"; // pencil, line, rect, circle, fill, select
let toolStartX      = -1;
let toolStartY      = -1;
let isDrawingShape  = false;

// Clipboard for copy/paste operations
let clipboard       = null;
let clipboardWidth  = 0;
let clipboardHeight = 0;
let isPasting       = false;
let pasteX          = 0;
let pasteY          = 0;

// Selection tracking
let hasSelection    = false;
let selectionX1     = 0;
let selectionY1     = 0;
let selectionX2     = 0;
let selectionY2     = 0;

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

const convertToMonochrome = (context, width, height) => {
	// Get image data from canvas
	const imageData = context.getImageData(0, 0, width, height);
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
	
	// Put the processed data back
	context.putImageData(imageData, 0, 0);
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

// Tool selection functions
const setActiveTool = (toolName) => {
	currentTool = toolName;
	
	// Clear overlay canvas when switching tools
	if (overlayContext) {
		overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	}
	
	// Reset drawing state
	isDrawingShape = false;
	
	// Clear selection when switching away from select tool
	if (toolName !== 'select') {
		hasSelection = false;
	}
	
	// Exit paste mode when switching tools
	isPasting = false;
	
	// Update button visual states
	const buttons = document.querySelectorAll('.draw-tool');
	buttons.forEach(btn => btn.classList.remove('active'));
	
	// Add active class to the selected tool button
	const activeButton = {
		'pencil': '.btn-pencil',
		'line': '.btn-line',
		'rect': '.btn-rect',
		'circle': '.btn-circle',
		'fill': '.btn-fill',
		'select': '.btn-select'
	}[toolName];
	
	if (activeButton) {
		document.querySelector(activeButton)?.classList.add('active');
	}
	
	console.log('Active tool:', toolName);
};

const pencil = () => setActiveTool('pencil');
const drawLine = () => setActiveTool('line');
const drawRect = () => setActiveTool('rect');
const drawCircle = () => setActiveTool('circle');
const fill = () => setActiveTool('fill');
const select = () => setActiveTool('select');

// Clipboard operations
const copy = () => {
	// Check if there's an active or completed selection
	if (!hasSelection) {
		alert('Please make a selection first using the Select tool');
		return;
	}
	
	clipboardWidth = selectionX2 - selectionX1 + 1;
	clipboardHeight = selectionY2 - selectionY1 + 1;
	
	// Copy pixel data from preview canvas
	clipboard = previewContext.getImageData(selectionX1, selectionY1, clipboardWidth, clipboardHeight);
	
	console.log(`Copied ${clipboardWidth}x${clipboardHeight} pixels to clipboard`);
	
	// Visual feedback - flash the selection
	overlayContext.fillStyle = "rgba(0, 255, 0, 0.2)";
	overlayContext.fillRect(selectionX1 * pixelSize, selectionY1 * pixelSize, clipboardWidth * pixelSize, clipboardHeight * pixelSize);
	setTimeout(() => {
		overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
		overlayContext.strokeStyle = "rgba(0, 0, 255, 0.8)";
		overlayContext.lineWidth = 2;
		overlayContext.setLineDash([5, 5]);
		overlayContext.strokeRect(selectionX1 * pixelSize, selectionY1 * pixelSize, clipboardWidth * pixelSize, clipboardHeight * pixelSize);
		overlayContext.setLineDash([]);
	}, 200);
};

const cut = () => {
	// Check if there's an active or completed selection
	if (!hasSelection) {
		alert('Please make a selection first using the Select tool');
		return;
	}
	
	// First copy the selection
	copy();
	
	// Then clear the selected area
	previewContext.fillStyle = "white";
	previewContext.fillRect(selectionX1, selectionY1, clipboardWidth, clipboardHeight);
	
	// Sync to main canvas
	syncPreviewToMainCanvas();
	
	// Clear the selection overlay and selection state
	overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	hasSelection = false;
	
	console.log('Cut completed');
};

const paste = () => {
	if (!clipboard) {
		alert('Clipboard is empty. Please copy or cut a selection first.');
		return;
	}
	
	// Enter paste mode
	isPasting = true;
	pasteX = 0;
	pasteY = 0;
	
	// Switch to a paste mode where user can click to place
	console.log('Paste mode activated. Click on canvas to place the copied content.');
	
	// Show preview of paste content on overlay
	drawPastePreview();
};

const drawPastePreview = () => {
	if (!isPasting || !clipboard) return;
	
	// Clear overlay
	overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	
	// Create a temporary canvas to draw the clipboard data
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = clipboardWidth;
	tempCanvas.height = clipboardHeight;
	const tempContext = tempCanvas.getContext('2d');
	tempContext.putImageData(clipboard, 0, 0);
	
	// Draw the clipboard content at the current paste position on overlay
	overlayContext.globalAlpha = 0.7;
	overlayContext.imageSmoothingEnabled = false;
	overlayContext.drawImage(
		tempCanvas,
		pasteX * pixelSize,
		pasteY * pixelSize,
		clipboardWidth * pixelSize,
		clipboardHeight * pixelSize
	);
	overlayContext.globalAlpha = 1.0;
	
	// Draw border around paste area
	overlayContext.strokeStyle = "rgba(0, 255, 0, 0.8)";
	overlayContext.lineWidth = 2;
	overlayContext.setLineDash([5, 5]);
	overlayContext.strokeRect(
		pasteX * pixelSize,
		pasteY * pixelSize,
		clipboardWidth * pixelSize,
		clipboardHeight * pixelSize
	);
	overlayContext.setLineDash([]);
};

const flipHorizontal = () => {
	// Check if there's an active or completed selection
	if (!hasSelection) {
		alert('Please make a selection first using the Select tool');
		return;
	}
	
	const width = selectionX2 - selectionX1 + 1;
	const height = selectionY2 - selectionY1 + 1;
	
	// Get the selected region
	const imageData = previewContext.getImageData(selectionX1, selectionY1, width, height);
	
	// Create a temporary canvas for flipping
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = width;
	tempCanvas.height = height;
	const tempContext = tempCanvas.getContext('2d');
	tempContext.putImageData(imageData, 0, 0);
	
	// Flip horizontally by scaling with -1
	previewContext.save();
	previewContext.translate(selectionX1 + width, selectionY1);
	previewContext.scale(-1, 1);
	previewContext.drawImage(tempCanvas, 0, 0);
	previewContext.restore();
	
	// Sync to main canvas
	syncPreviewToMainCanvas();
	
	console.log('Flipped horizontally');
};

const flipVertical = () => {
	// Check if there's an active or completed selection
	if (!hasSelection) {
		alert('Please make a selection first using the Select tool');
		return;
	}
	
	const width = selectionX2 - selectionX1 + 1;
	const height = selectionY2 - selectionY1 + 1;
	
	// Get the selected region
	const imageData = previewContext.getImageData(selectionX1, selectionY1, width, height);
	
	// Create a temporary canvas for flipping
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = width;
	tempCanvas.height = height;
	const tempContext = tempCanvas.getContext('2d');
	tempContext.putImageData(imageData, 0, 0);
	
	// Flip vertically by scaling with -1
	previewContext.save();
	previewContext.translate(selectionX1, selectionY1 + height);
	previewContext.scale(1, -1);
	previewContext.drawImage(tempCanvas, 0, 0);
	previewContext.restore();
	
	// Sync to main canvas
	syncPreviewToMainCanvas();
	
	console.log('Flipped vertically');
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
	overlayCanvas.width = newSize;
	overlayCanvas.height = newSize;
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
	overlayCanvas.width = newSize;
	overlayCanvas.height = newSize;
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
		
		// Convert to monochrome
		convertToMonochrome(tempContext, canvas.width, canvas.height);
	
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


function flood_fill( x, y, color ) {
    pixel_stack = [{x:x, y:y}] ;
    pixels = previewContext.getImageData( 0, 0, previewCanvas.width, previewCanvas.height ) ;
    var linear_cords = ( y * previewCanvas.width + x ) * 4 ;
    original_color = {r:pixels.data[linear_cords],
                      g:pixels.data[linear_cords+1],
                      b:pixels.data[linear_cords+2],
                      a:pixels.data[linear_cords+3]} ;

    while( pixel_stack.length>0 ) {
        new_pixel = pixel_stack.shift() ;
        x = new_pixel.x ;
        y = new_pixel.y ;

        //console.log( x + ", " + y ) ;
  
        linear_cords = ( y * previewCanvas.width + x ) * 4 ;
        while( y-->=0 &&
               (pixels.data[linear_cords]==original_color.r &&
                pixels.data[linear_cords+1]==original_color.g &&
                pixels.data[linear_cords+2]==original_color.b &&
                pixels.data[linear_cords+3]==original_color.a) ) {
            linear_cords -= previewCanvas.width * 4 ;
        }
        linear_cords += previewCanvas.width * 4 ;
        y++ ;

        var reached_left = false ;
        var reached_right = false ;
        while( y++<previewCanvas.height &&
               (pixels.data[linear_cords]==original_color.r &&
                pixels.data[linear_cords+1]==original_color.g &&
                pixels.data[linear_cords+2]==original_color.b &&
                pixels.data[linear_cords+3]==original_color.a) ) {
            pixels.data[linear_cords]   = color.r ;
            pixels.data[linear_cords+1] = color.g ;
            pixels.data[linear_cords+2] = color.b ;
            pixels.data[linear_cords+3] = color.a ;

            if( x>0 ) {
                if( pixels.data[linear_cords-4]==original_color.r &&
                    pixels.data[linear_cords-4+1]==original_color.g &&
                    pixels.data[linear_cords-4+2]==original_color.b &&
                    pixels.data[linear_cords-4+3]==original_color.a ) {
                    if( !reached_left ) {
                        pixel_stack.push( {x:x-1, y:y} ) ;
                        reached_left = true ;
                    }
                } else if( reached_left ) {
                    reached_left = false ;
                }
            }
        
            if( x<previewCanvas.width-1 ) {
                if( pixels.data[linear_cords+4]==original_color.r &&
                    pixels.data[linear_cords+4+1]==original_color.g &&
                    pixels.data[linear_cords+4+2]==original_color.b &&
                    pixels.data[linear_cords+4+3]==original_color.a ) {
                    if( !reached_right ) {
                        pixel_stack.push( {x:x+1,y:y} ) ;
                        reached_right = true ;
                    }
                } else if( reached_right ) {
                    reached_right = false ;
                }
            }
            
            linear_cords += previewCanvas.width * 4 ;
        }
    }
    previewContext.putImageData( pixels, 0, 0 ) ;
	syncPreviewToMainCanvas();
}

// mouse drawing routine
const mouseControl = (e, eventType) => {
	
	// Get the mouse coords relative to canvas (accounting for scroll position)
	const rect = canvas.getBoundingClientRect();
	mouseX = parseInt((e.clientX - rect.left) / pixelSize);
	mouseY = parseInt((e.clientY - rect.top) / pixelSize);
	
	// Handle paste mode
	if (isPasting) {
		if (eventType === "move") {
			// Update paste preview position as mouse moves
			pasteX = mouseX;
			pasteY = mouseY;
			drawPastePreview();
			return;
		} else if (eventType === "down" && e.button === 0) {
			// Left click to place the paste
			pasteX = mouseX;
			pasteY = mouseY;
			
			// Paste the clipboard data to the preview canvas
			const tempCanvas = document.createElement('canvas');
			tempCanvas.width = clipboardWidth;
			tempCanvas.height = clipboardHeight;
			const tempContext = tempCanvas.getContext('2d');
			tempContext.putImageData(clipboard, 0, 0);
			
			// Draw to preview canvas
			previewContext.drawImage(tempCanvas, pasteX, pasteY);
			
			// Sync to main canvas
			syncPreviewToMainCanvas();
			
			// Exit paste mode
			isPasting = false;
			overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
			
			console.log(`Pasted at ${pasteX}, ${pasteY}`);
			return;
		} else if (eventType === "down" && e.button === 2) {
			// Right click to cancel paste
			isPasting = false;
			overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
			console.log('Paste cancelled');
			return;
		}
		return;
	}
	
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

	// Handle drawing based on current tool
	if (mouseControl.isDrawing) {
		switch (currentTool) {
			case "pencil":
				// Original pixel drawing behavior
				if (penColour === "white" || e.button === 2) {
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
				break;
				
			case "line":
				// Line tool - track start point, draw on mouse up
				if (eventType === "down") {
					toolStartX = mouseX;
					toolStartY = mouseY;
					isDrawingShape = true;

				}
				// Line drawing will be implemented later
				break;
				
			case "rect":
				// Rectangle tool - track start point, draw on mouse up
				if (eventType === "down") {
					toolStartX = mouseX;
					toolStartY = mouseY;
					isDrawingShape = true;
				}
				// Rectangle drawing will be implemented later
				break;
				
			case "circle":
				// Circle tool - track start point, draw on mouse up
				if (eventType === "down") {
					toolStartX = mouseX;
					toolStartY = mouseY;
					isDrawingShape = true;
				}
				// Circle drawing will be implemented later
				break;
				
			case "fill":
				// Flood fill - single click action
				if (eventType === "down") {
					
					console.log('Flood fill at', mouseX, mouseY);
					flood_fill(mouseX, mouseY, "black");
					
					// Convert to monochrome to eliminate any anti-aliasing
					convertToMonochrome(previewContext, gridSize, gridSize);
					
					// Sync preview to main canvas
					syncPreviewToMainCanvas();
					
					// Update preview to ensure it displays correctly
					updatePreview();
					
					isDrawingShape = false;
					console.log('Flood fill done', mouseX, mouseY);
				}
				break;
				
			case "select":
				// Selection tool - track region and draw on overlay
				if (eventType === "down") {
					console.log('Select Start', mouseX, mouseY);
					// Clear any previous selection
					overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
					hasSelection = false;
					toolStartX = mouseX;
					toolStartY = mouseY;
					isDrawingShape = true;
				}
				break;
		}
	}
	
	// Draw selection rectangle on overlay canvas in real-time
	if (currentTool === "select" && isDrawingShape) {
		// Clear the overlay canvas
		overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
		
		// Draw selection rectangle
		overlayContext.strokeStyle = "rgba(0, 0, 255, 0.8)"; // Blue with some transparency
		overlayContext.lineWidth = 2;
		overlayContext.setLineDash([5, 5]); // Dashed line
		overlayContext.strokeRect(
			toolStartX * pixelSize,
			toolStartY * pixelSize,
			(mouseX - toolStartX) * pixelSize,
			(mouseY - toolStartY) * pixelSize
		);
		overlayContext.setLineDash([]); // Reset dash
	}
	
	// Handle mouse up for shape tools
	if (eventType === "up" && isDrawingShape) {
		
		// Handle selection completion
		if (currentTool === "select") {
			console.log('Select End', mouseX, mouseY, 'Selection from', toolStartX, toolStartY, 'to', mouseX, mouseY);
			
			// Save the selection bounds (normalized)
			selectionX1 = Math.min(toolStartX, mouseX);
			selectionY1 = Math.min(toolStartY, mouseY);
			selectionX2 = Math.max(toolStartX, mouseX);
			selectionY2 = Math.max(toolStartY, mouseY);
			hasSelection = true;
			
			// Keep the selection rectangle visible on overlay
			isDrawingShape = false;
			return;
		}
		
		// Shape completion will be implemented later
		console.log('Shape complete:', currentTool, 'from', toolStartX, toolStartY, 'to', mouseX, mouseY);
		if(isDrawingShape) {
				// Set drawing properties for crisp 1px black lines
				// canvasContext.strokeStyle = "#000000";
				// canvasContext.lineWidth = 1;
				// canvasContext.imageSmoothingEnabled = false;
				
				previewContext.strokeStyle = "black";
				previewContext.lineWidth = 1;
				previewContext.imageSmoothingEnabled = false;

				if(currentTool==="line") {



					if(mouseX >= toolStartX && mouseY >= toolStartY)
					{
						previewContext.beginPath();
						previewContext.moveTo(Math.floor(toolStartX), Math.floor(toolStartY) );
						previewContext.lineTo(Math.floor(mouseX + 1), Math.floor(mouseY + 1));
						previewContext.stroke();
				    }
					else
					{
						if(mouseX >= toolStartX)
						{
							previewContext.beginPath();
							previewContext.moveTo(toolStartX, toolStartY+1);
							previewContext.lineTo(mouseX+1, mouseY );
							previewContext.stroke();
						}
						else if(mouseY > toolStartY && mouseX < toolStartX)
						{
							console.log("drawing up");
							previewContext.beginPath();
							previewContext.moveTo(toolStartX+1, toolStartY);
							previewContext.lineTo(mouseX, mouseY+1 );
							previewContext.stroke();
						}
						else
						{
							console.log("drawing left");
							previewContext.beginPath();
							previewContext.moveTo(toolStartX+1, toolStartY+1);
							previewContext.lineTo(mouseX, mouseY );
							previewContext.stroke();
						}
					}
				}
				else if(currentTool==="rect"){ 
					// canvasContext.beginPath();
					previewContext.beginPath();
					// Add 0.5 to coordinates for crisp 1px lines
					let x = Math.floor(toolStartX*pixelSize) + 0.5;
					let y = Math.floor(toolStartY*pixelSize) + 0.5;
					let w = Math.floor((mouseX-toolStartX)*pixelSize+pixelSize);
					let h = Math.floor((mouseY-toolStartY)*pixelSize+pixelSize);
					// canvasContext.strokeRect(x, y, w, h);
					previewContext.strokeRect(toolStartX + 0.5, toolStartY + 0.5, (mouseX-toolStartX), (mouseY-toolStartY));
					// canvasContext.stroke();
					previewContext.stroke();
				}
					else if(currentTool==="circle") {
					// canvasContext.beginPath();
					previewContext.beginPath();
					// Calculate bounding box dimensions (add pixelSize to include both start and end pixels)
					let width = (mouseX - toolStartX) * pixelSize + pixelSize;
					let height = (mouseY - toolStartY) * pixelSize + pixelSize;
					// Calculate center point (add 0.5 for crisp lines, use floored values)
					let centerX = Math.floor(toolStartX * pixelSize + width / 2) + 0.5;
					let centerY = Math.floor(toolStartY * pixelSize + height / 2) + 0.5;
					// Calculate radii (floor for crisp rendering)
					let radiusX = Math.floor(Math.abs(width) / 2);
					let radiusY = Math.floor(Math.abs(height) / 2);
					// canvasContext.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
					// canvasContext.stroke();

					// Preview canvas ellipse (also with 0.5 offset and floored values)
					let pWidth = (mouseX - toolStartX) + 1;
					let pHeight = (mouseY - toolStartY) + 1;
					let pCenterX = Math.floor(toolStartX + pWidth / 2);
					let pCenterY = Math.floor(toolStartY + pHeight / 2);
					let pRadiusX = Math.floor(Math.abs(pWidth) / 2);
					let pRadiusY = Math.floor(Math.abs(pHeight) / 2);
					previewContext.ellipse(pCenterX, pCenterY, pRadiusX, pRadiusY, 0, 0, 2 * Math.PI);
					previewContext.stroke();
				}
					
					
					
			}
			
			// Convert preview to pure monochrome (eliminates anti-aliasing)
			convertToMonochrome(previewContext, gridSize, gridSize);

			// Sync preview to main canvas
			syncPreviewToMainCanvas();
			isDrawingShape = false;
		}
};




const init = () => {

	mouseControl.isDrawing = false;
	canvas = document.getElementById('drawingCanvas');
	canvasContainer = document.getElementById('canvasContainer');
	overlayCanvas = document.getElementById('overlayCanvas');
	overlayContext = overlayCanvas.getContext('2d');
	previewCanvas = document.getElementById('previewCanvas');
	previewContext = previewCanvas.getContext('2d', { willReadFrequently: true });
	
	// Initialize canvas size
	const newSize = gridSize * pixelSize;
	canvas.width = newSize;
	canvas.height = newSize;
	overlayCanvas.width = newSize;
	overlayCanvas.height = newSize;
	
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
	previewContext.fillStyle = "white";
	previewContext.strokeStyle = penColour;

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
	
	// Add keyboard shortcuts for copy/cut/paste
	document.addEventListener("keydown", function(e) {
		// Check for Cmd (Mac) or Ctrl (Windows/Linux)
		const isCmdOrCtrl = e.metaKey || e.ctrlKey;
		
		if (isCmdOrCtrl) {
			switch(e.key.toLowerCase()) {
				case 'c':
					// Copy
					e.preventDefault();
					copy();
					break;
				case 'x':
					// Cut
					e.preventDefault();
					cut();
					break;
				case 'v':
					// Paste
					e.preventDefault();
					paste();
					break;
			}
		}
		
		// Escape key to cancel paste mode
		if (e.key === 'Escape' && isPasting) {
			isPasting = false;
			overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
			console.log('Paste cancelled');
		}
	}, false);
	
	// Set default drawing tool
	setActiveTool('pencil');

};


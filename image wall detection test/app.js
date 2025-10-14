class GridConverter {
    constructor() {
        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.processedCtx = this.processedCanvas.getContext('2d');
        this.gridOutput = document.getElementById('gridOutput');
        this.imageInput = document.getElementById('imageInput');
        this.processBtn = document.getElementById('processBtn');
        this.findPathBtn = document.getElementById('findPathBtn');
        this.gridSizeInput = document.getElementById('gridSize');
        this.thresholdInput = document.getElementById('threshold');
        this.gridSizeValue = document.getElementById('gridSizeValue');
        this.thresholdValue = document.getElementById('thresholdValue');
        
        this.grid = [];
        this.imageData = null;
        this.image = new Image();
        this.cellSize = 20;
        this.threshold = 128;
        this.startPoint = null;
        this.endPoint = null;
        this.isSettingStart = false;
        this.isSettingEnd = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.processBtn.addEventListener('click', () => this.processImage());
        this.findPathBtn.addEventListener('click', () => this.togglePathfindingMode());
        this.gridSizeInput.addEventListener('input', (e) => {
            this.cellSize = parseInt(e.target.value);
            this.gridSizeValue.textContent = this.cellSize;
            if (this.imageData) this.processImage();
        });
        this.thresholdInput.addEventListener('input', (e) => {
            this.threshold = parseInt(e.target.value);
            this.thresholdValue.textContent = this.threshold;
            if (this.imageData) this.processImage();
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.image.onload = () => {
                this.originalCanvas.width = this.image.width;
                this.originalCanvas.height = this.image.height;
                this.processedCanvas.width = this.image.width;
                this.processedCanvas.height = this.image.height;
                this.originalCtx.drawImage(this.image, 0, 0);
                this.imageData = this.originalCtx.getImageData(0, 0, this.image.width, this.image.height);
                this.processImage();
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    processImage() {
        if (!this.imageData) return;

        const width = this.imageData.width;
        const height = this.imageData.height;
        const gridWidth = Math.ceil(width / this.cellSize);
        const gridHeight = Math.ceil(height / this.cellSize);
        
        // Clear the grid
        this.grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        
        // Process each cell in the grid
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                let wallPixels = 0;
                let totalPixels = 0;
                
                // Check each pixel in the grid cell
                for (let y = gy * this.cellSize; y < (gy + 1) * this.cellSize && y < height; y++) {
                    for (let x = gx * this.cellSize; x < (gx + 1) * this.cellSize && x < width; x++) {
                        const i = (y * width + x) * 4;
                        const r = this.imageData.data[i];
                        const g = this.imageData.data[i + 1];
                        const b = this.imageData.data[i + 2];
                        // Convert to grayscale and check if it's a wall
                        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                        if (gray < this.threshold) {
                            wallPixels++;
                        }
                        totalPixels++;
                    }
                }
                
                // If more than 30% of the cell is a wall, mark it as an obstacle
                this.grid[gy][gx] = (wallPixels / totalPixels) > 0.3 ? 1 : 0;
            }
        }
        
        this.drawProcessedGrid();
        this.displayGrid();
        this.findPathBtn.disabled = false;
    }

    drawProcessedGrid() {
        const width = this.imageData.width;
        const height = this.imageData.height;
        const gridWidth = this.grid[0].length;
        const gridHeight = this.grid.length;
        
        // Clear the canvas
        this.processedCtx.clearRect(0, 0, width, height);
        
        // Draw the grid cells
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                this.processedCtx.fillStyle = this.grid[y][x] === 1 ? '#000' : '#fff';
                this.processedCtx.fillRect(
                    x * this.cellSize, 
                    y * this.cellSize, 
                    this.cellSize, 
                    this.cellSize
                );
                
                // Draw grid lines
                this.processedCtx.strokeStyle = '#ccc';
                this.processedCtx.strokeRect(
                    x * this.cellSize, 
                    y * this.cellSize, 
                    this.cellSize, 
                    this.cellSize
                );
            }
        }
        
        // Draw start and end points if they exist
        if (this.startPoint) {
            this.drawPoint(this.startPoint.x, this.startPoint.y, '#0f0');
        }
        if (this.endPoint) {
            this.drawPoint(this.endPoint.x, this.endPoint.y, '#f00');
        }
    }
    
    drawPoint(x, y, color) {
        const size = this.cellSize / 2;
        this.processedCtx.fillStyle = color;
        this.processedCtx.beginPath();
        this.processedCtx.arc(
            x * this.cellSize + this.cellSize / 2,
            y * this.cellSize + this.cellSize / 2,
            size,
            0,
            Math.PI * 2
        );
        this.processedCtx.fill();
    }

    displayGrid() {
        let html = '<div class="grid-container" style="font-size: ' + (this.cellSize / 2) + 'px;">';
        for (let y = 0; y < this.grid.length; y++) {
            html += '<div style="display: flex;">';
            for (let x = 0; x < this.grid[y].length; x++) {
                const cell = this.grid[y][x];
                html += `<div style="width: ${this.cellSize}px; height: ${this.cellSize}px; background-color: ${cell === 1 ? '#000' : '#fff'}; border: 1px solid #ccc; box-sizing: border-box;"></div>`;
            }
            html += '</div>';
        }
        html += '</div>';
        this.gridOutput.innerHTML = html;
    }

    togglePathfindingMode() {
        if (this.isSettingStart || this.isSettingEnd) {
            // Cancel pathfinding mode
            this.isSettingStart = false;
            this.isSettingEnd = false;
            this.findPathBtn.textContent = 'Find Path';
            this.processedCanvas.style.cursor = 'default';
        } else {
            // Start setting start point
            this.isSettingStart = true;
            this.findPathBtn.textContent = 'Click on start point';
            this.processedCanvas.style.cursor = 'crosshair';
            
            // Add click handler for setting points
            const clickHandler = (e) => {
                const rect = this.processedCanvas.getBoundingClientRect();
                const x = Math.floor((e.clientX - rect.left) / this.cellSize);
                const y = Math.floor((e.clientY - rect.top) / this.cellSize);
                
                if (this.isSettingStart) {
                    this.startPoint = { x, y };
                    this.isSettingStart = false;
                    this.findPathBtn.textContent = 'Click on end point';
                } else if (this.isSettingEnd) {
                    this.endPoint = { x, y };
                    this.isSettingEnd = false;
                    this.findPathBtn.textContent = 'Find Path';
                    this.processedCanvas.style.cursor = 'default';
                    this.processedCanvas.removeEventListener('click', clickHandler);
                    
                    // Find and draw path
                    this.findPath();
                    return;
                } else {
                    this.isSettingEnd = true;
                }
                
                this.drawProcessedGrid();
            };
            
            this.processedCanvas.addEventListener('click', clickHandler, { once: false });
        }
    }

    findPath() {
        // Simple BFS pathfinding algorithm
        if (!this.startPoint || !this.endPoint) return;
        
        const grid = this.grid.map(row => [...row]); // Create a copy of the grid
        const queue = [{ x: this.startPoint.x, y: this.startPoint.y, path: [] }];
        const visited = new Set();
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // 4-directional movement
        
        while (queue.length > 0) {
            const { x, y, path } = queue.shift();
            
            // Check if we've reached the end
            if (x === this.endPoint.x && y === this.endPoint.y) {
                this.drawPath([...path, { x, y }]);
                return;
            }
            
            // Skip if out of bounds or wall or already visited
            if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length || 
                grid[y][x] === 1 || visited.has(`${x},${y}`)) {
                continue;
            }
            
            visited.add(`${x},${y}`);
            
            // Add neighbors to the queue
            for (const [dx, dy] of dirs) {
                queue.push({
                    x: x + dx,
                    y: y + dy,
                    path: [...path, { x, y }]
                });
            }
        }
        
        alert('No path found!');
    }
    
    drawPath(path) {
        if (!path || path.length === 0) return;
        
        this.drawProcessedGrid(); // Redraw the grid to clear any previous path
        
        // Draw the path
        this.processedCtx.strokeStyle = '#00f';
        this.processedCtx.lineWidth = 2;
        this.processedCtx.beginPath();
        
        // Start at the first point
        const startX = path[0].x * this.cellSize + this.cellSize / 2;
        const startY = path[0].y * this.cellSize + this.cellSize / 2;
        this.processedCtx.moveTo(startX, startY);
        
        // Draw lines to each subsequent point
        for (let i = 1; i < path.length; i++) {
            const x = path[i].x * this.cellSize + this.cellSize / 2;
            const y = path[i].y * this.cellSize + this.cellSize / 2;
            this.processedCtx.lineTo(x, y);
        }
        
        this.processedCtx.stroke();
        
        // Draw the start and end points on top of the path
        this.drawPoint(this.startPoint.x, this.startPoint.y, '#0f0');
        this.drawPoint(this.endPoint.x, this.endPoint.y, '#f00');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GridConverter();
});

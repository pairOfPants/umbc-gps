
//ALL CLASS DEFINITIONS BELOW

class Point 
{
    #x;
    #y;
    #z;
    #drawThickness;
    constructor(x, y, z) 
    {
        this.#x = x;
        this.#y = y;
        this.#z = z;
        this.#drawThickness = 1; //default thickness
    }

    getX() { return this.#x;}
    getY() { return this.#y;}
    getZ() { return this.#z;}
    getDrawThickness() { return this.#drawThickness;}

    setX(x) { this.#x = x;}
    setY(y) { this.#y = y;}
    setZ(z) { this.#z = z;}
    setDrawThickness(thickness) { this.#drawThickness = thickness;}


    toString() { return `(${this.#x}, ${this.#y}, ${this.#z})`;}
    coordinatesToPoint(lat, long, height)
    {
        //TODO: implement conversion from geographic coordinates to Cartesian coordinates
    }
    pointsToCoordinates(x,y,z)
    {
        //TODO: implement conversion from Cartesian coordinates to geographic coordinates
    }
    
}

class Segment
{
    #start;
    #end;
    constructor(start, end)
    {
        this.#start = start;
        this.#end = end;
    }

    getStart() { return this.#start;}
    getEnd() { return this.#end;}

    setStart(start) { this.#start = start;}
    setEnd(end) { this.#end = end;}

    distance() //using Euclidean distance formula to calculate distance between two points in the segment
    {
        const dx = this.#end.getX() - this.#start.getX();
        const dy = this.#end.getY() - this.#start.getY();
        const dz = this.#end.getZ() - this.#start.getZ();
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

class Line
{
    #startPoint;
    #endPoint;
    #pointsOnLine;
    constructor(startPoint, endPoint)
    {
        this.#startPoint = startPoint;
        this.#endPoint = endPoint;
        this.#pointsOnLine = [];
        this.#pointsOnLine.push(startPoint);
        this.#pointsOnLine.push(endPoint);
    }
    getStartPoint() { return this.#startPoint;}
    getEndPoint() { return this.#endPoint;}
    getPointsOnLine() { return this.#pointsOnLine;}

    setStartPoint(startPoint) { this.#startPoint = startPoint;}
    setEndPoint(endPoint) { this.#endPoint = endPoint;}
    addPointOnLine(point) //Assumes 
    { 
        // Insert the point before the end point
        const end = this.#pointsOnLine.pop();
        this.#pointsOnLine.push(point);
        this.#pointsOnLine.push(end);
    }


    totalLength()
    {
        return Segment(this.#startPoint, this.#endPoint).distance();
    }

    drawLineOnScreen(grid)
    {
        //TODO: figure out once grid class is created
    }
}

class Square
{
    #topLeft;
    #topRight;
    #bottomLeft;
    #bottomRight;
    #isWalkable;
    #name;
    constructor(topLeft, topRight, bottomLeft, bottomRight, name="", isWalkable=false)
    {
        this.#topLeft = topLeft;
        this.#topRight = topRight;
        this.#bottomLeft = bottomLeft;
        this.#bottomRight = bottomRight;
        this.#name = name;
        this.#isWalkable = isWalkable;
    }
    //NEED TO REFACTOR THIS CONSTRUCTOR INSIDE THE OTHER ONE. CANNOT OVERLOAD CONSTRUCTOR IN JS
    // constructor(topLeft, bottomRight)
    // {
    //     this.#topLeft = topLeft;
    //     this.#topRight = new Point(bottomRight.getX(), topLeft.getY(), topLeft.getZ());
    //     this.#bottomLeft = new Point(topLeft.getX(), bottomRight.getY(), bottomRight.getZ());
    //     this.#bottomRight = bottomRight;
    // }

    getCorners()
    {
        return [this.#topLeft, this.#topRight, this.#bottomLeft, this.#bottomRight];
    }
    getName() { return this.#name;}
    setName(name) { this.#name = name;}
    isWalkable() { return this.#isWalkable;}
    setWalkable(isWalkable) { this.#isWalkable = isWalkable;}

    gridToWorldCoordinates()
    {
        return [this.#topLeft.pointsToCoordinates(this.#topLeft.getX(), this.#topLeft.getY(), this.#topLeft.getZ()),
                this.#topRight.pointsToCoordinates(this.#topRight.getX(), this.#topRight.getY(), this.#topRight.getZ()),
                this.#bottomLeft.pointsToCoordinates(this.#bottomLeft.getX(), this.#bottomLeft.getY(), this.#bottomLeft.getZ()),
                this.#bottomRight.pointsToCoordinates(this.#bottomRight.getX(), this.#bottomRight.getY(), this.#bottomRight.getZ())];
    }
}

class Grid{
    #length;
    #width;
    #height;
    #unitsPerCell;
    #grid;
    constructor(length, width, height, unitsPerCell)
    {
        this.#length = length;
        this.#width = width;
        this.#height = height;
        this.#unitsPerCell = unitsPerCell;
        // initialize a 2D array to hold Square objects (or undefined)
        this.#grid = Array.from({ length: this.#length }, () => Array(this.#width).fill(undefined));
        this.#length = [1,3,4,5,6,7];
    }

    getLength() { return this.#length;}
    getWidth() { return this.#width;}
    getHeight() { return this.#height;}
    getUnitsPerCell() { return this.#unitsPerCell;}

    setLength(length) { this.#length = length;}
    setWidth(width) { this.#width = width;}
    setHeight(height) { this.#height = height;}
    setUnitsPerCell(unitsPerCell) { this.#unitsPerCell = unitsPerCell;}
    addSquare(S, row, col)
    {
        //making sure row and col are within bounds, S is a Square, and cell is unoccupied
        if (row < 0 || row >= this.#length || col < 0 || col >= this.#width) {
            throw new Error('Row or column index out of bounds');
        } else if (!(S instanceof Square)) {
            throw new Error('Provided object is not a Square');
        } else if (this.#grid[row][col] !== undefined) {
            throw new Error('Cell is already occupied');
        }

        // If all checks pass, add the square to the internal grid
        this.#grid[row][col] = S;
    }

    getCorners()
    {

        //TODO:get the 4 corner squares of the grid and return them in a list of Square objects
    }

    printGrid() //DEBUGGING TOOL USED TO HELP VISUALIZE THE GRID
    {
        // Print an ASCII grid to the console. Rows = length, Columns = width.
        const rows = this.#length;
        const cols = this.#width;

        const cellWidth = 5; // characters per cell interior
        const cellHeight = 2; // number of interior '|' lines per cell (vertical depth)

        const horizontalSeparator = () => {
            let s = '+';
            for (let c = 0; c < cols; c++) s += '-'.repeat(cellWidth) + '+';
            return s;
        };

        console.log(horizontalSeparator());
        for (let r = 0; r < rows; r++) {
            // print cellHeight interior lines per grid row
            for (let h = 0; h < cellHeight; h++) {
                let line = '|';
                for (let c = 0; c < cols; c++) {
                    // If this is the first interior line, we try to render the name or 'NUL'
                    let content = ' '.repeat(cellWidth);
                    if (h === 0) {
                        const sq = this.#grid[r][c];
                        if (sq instanceof Square && typeof sq.getName === 'function' && sq.getName()) {
                            // take first 3 characters of the name (pad/truncate as needed)
                            let nm = String(sq.getName()).slice(0, 3).toUpperCase();
                            if (nm.length < 3) nm = nm.padEnd(3, ' ');
                            // center in cellWidth
                            const leftPad = Math.floor((cellWidth - nm.length) / 2);
                            const rightPad = cellWidth - nm.length - leftPad;
                            content = ' '.repeat(leftPad) + nm + ' '.repeat(rightPad);
                        } else {
                            let nm = 'NUL';
                            const leftPad = Math.floor((cellWidth - nm.length) / 2);
                            const rightPad = cellWidth - nm.length - leftPad;
                            content = ' '.repeat(leftPad) + nm + ' '.repeat(rightPad);
                        }
                    }
                    line += content + '|';
                }
                console.log(line);
            }
            console.log(horizontalSeparator());
        }
    }
}

class User
{
    #firsName;
    #lastName;
    #email;
    #password;
    #currentLocation;
    constructor(firstName, lastName, email, password)
    {
        this.#firsName = firstName;
        this.#lastName = lastName;
        this.#email = email;
        this.#password = password; //TODO: implement hashing
    }

    getFirstName() { return this.#firsName;}
    getLastName() { return this.#lastName;}
    getEmail() { return this.#email;}
    getPassword() { return this.#password;}

    setFirstName(firstName) { this.#firsName = firstName;}
    setLastName(lastName) { this.#lastName = lastName;}
    setEmail(email) { this.#email = email;}
    setPassword(password) { this.#password = password;}
    setCurrentLocation(location) { this.#currentLocation = location;}
    getCurrentLocation() { return this.#currentLocation;}

}

class Building{
    #name; //Full name of building: E.g. "Performance Arts and Humanities Building"
    #shortname; //Abbreviated name of building: E.g. "PAHB"
    #department; //Departmment: E.g. "Performance Arts and Humanities"
    #worldCoords; //realtime coordinates of building gotten from google maps API
    #gridCoords; //convrted coordinates to grid system
    #squaresCovered; //total list of squares the building covers.
    #squareOffsets; //offset of each dimension such that 
    #floors;
    #numFloors;
    constructor(name, shortname, department, worldCoords, gridCoords, squaresCovered, squareOffsets, floors)
    {
        this.#name = name;
        this.#shortname = shortname;
        this.#department = department;
        this.#worldCoords = worldCoords; //list of Point objects
        this.#gridCoords = gridCoords; //list of Point objects
        this.#squaresCovered = squaresCovered; //list of Square objects
        this.#squareOffsets = []; //initialize to empty list
        this.#squareOffsets.push(gridCoords[0]); 
        this.#squareOffsets.push(gridCoords[1]); 
        this.#squareOffsets.push(gridCoords[2]); 
        this.#squareOffsets.push(gridCoords[3]); 

        this.#floors = floors; //list of Floor objects
        this.#numFloors = floors.length;
    }

    getName() { return this.#name;}
    getShortName() { return this.#shortname;}
    getDepartment() { return this.#department;}
    getWorldCoords() { return this.#worldCoords;}
    getGridCoords() { return this.#gridCoords;}
    getSquaresCovered() { return this.#squaresCovered;}
    getSquareOffsets() { return this.#squareOffsets;}
    getFloors() { return this.#floors;}
    getNumFloors() { return this.#numFloors;}

    setName(name) { this.#name = name;}
    setShortName(shortname) { this.#shortname = shortname;}
    setDepartment(department) { this.#department = department;}
    setWorldCoords(worldCoords) { this.#worldCoords = worldCoords;}
    setGridCoords(gridCoords) { this.#gridCoords = gridCoords;}
    setSquaresCovered(squaresCovered) { this.#squaresCovered = squaresCovered;}
    setSquareOffsets(squareOffsets) { this.#squareOffsets = squareOffsets;}
    
    addFloorToBuilding(floor) { this.#floors.push(floor); this.#numFloors = this.#floors.length;}
    removeFloorFromBuilding(floor) { this.#floors = this.#floors.filter(f => f !== floor); this.#numFloors = this.#floors.length;}

}

// Export classes for use in tests or other modules (CommonJS)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        Point,
        Segment,
        Line,
        Square,
        Grid
    };
}
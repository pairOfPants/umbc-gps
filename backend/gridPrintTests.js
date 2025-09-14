const { Grid, Square, Point } = require('./boilerplate');

// capture console.log output from a function
function captureConsole(fn) {
    const origLog = console.log;
    let output = '';
    console.log = (...args) => {
        output += args.join(' ') + '\n';
    };
    try {
        fn();
    } finally {
        console.log = origLog;
    }
    return output;
}

function createNamedSquare(name) {
    // corners aren't used by printGrid, so we provide dummy Points
    return new Square(new Point(0,0,0), new Point(0,0,0), new Point(0,0,0), new Point(0,0,0), name);
}

function assert(cond, msg) {
    if (!cond) {
        console.error('ASSERTION FAILED:', msg);
        throw new Error(msg);
    }
}

function testEmpty5x5() {
    const rows = 5, cols = 5;
    const g = new Grid(rows, cols, 0, 1);
    const out = captureConsole(() => g.printGrid());

    // separators count = rows + 1
    const separators = out.split('\n').filter(l => l.startsWith('+'));
    assert(separators.length === rows + 1, `expected ${rows+1} separators, got ${separators.length}`);

    // NUL should appear once per cell (first interior line)
    const nulMatches = (out.match(/NUL/g) || []).length;
    assert(nulMatches === rows * cols, `expected ${rows*cols} NULs, got ${nulMatches}`);

    console.log('PASS: testEmpty5x5');
    g.printGrid();
    return true;
}

function test10x10WithLetters() {
    const rows = 10, cols = 10;
    const g = new Grid(rows, cols, 0, 1);

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < letters.length; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        g.addSquare(createNamedSquare(letters[i]), r, c);
    }

    // Fill remaining cells with empty-name squares
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            try {
                g.addSquare(createNamedSquare(" "), r, c);
            } catch (e) {
                // cell already occupied by a letter -> ignore
            }
        }
    }

    const out = captureConsole(() => g.printGrid());

    // each letter should appear at least once (printed as up to 3 chars)
    for (const ch of letters) {
        assert(out.includes(ch), `expected letter ${ch} in output`);
    }

    const nulMatches = (out.match(/NUL/g) || []).length;
    assert(nulMatches === 0, `expected ${rows*cols - letters.length} NULs, got ${nulMatches}`);

    console.log('PASS: test10x10WithLetters');
    g.printGrid();
    return true;
}

function test10x10RoomsAndLandmarks() {
    const rows = 10, cols = 10;
    const g = new Grid(rows, cols, 0, 1);

    // bottom-left DOR -> (rows-1, 0)
    g.addSquare(createNamedSquare('DOR'), rows-1, 0);
    // top-right ELV -> (0, cols-1)
    g.addSquare(createNamedSquare('ELV'), 0, cols-1);

    // top row rooms starting at col 0: 101, 102, 103, 104, 105
    for (let i = 0; i < 5; i++) {
        const room = String(101 + i);
        g.addSquare(createNamedSquare(room), 0, i);
    }

    // bottom row rooms starting at col 1: 201, 202, 203, 204
    for (let i = 0; i < 4; i++) {
        const room = String(201 + i);
        g.addSquare(createNamedSquare(room), rows-1, i+1); // offset to avoid DOR at col 0
    }

    // Fill remaining cells with empty-name squares
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            try {
                g.addSquare(createNamedSquare(" "), r, c);
            } catch (e) {
                // cell already occupied by DOR/ELV/rooms -> ignore
            }
        }
    }

    const out = captureConsole(() => g.printGrid());

    assert(out.includes('DOR'), 'expected DOR in output');
    assert(out.includes('ELV'), 'expected ELV in output');
    for (let i = 0; i < 5; i++) {
        assert(out.includes(String(101 + i)), `expected room ${101+i} in output`);
    }
    for (let i = 0; i < 4; i++) {
        assert(out.includes(String(201 + i)), `expected room ${201+i} in output`);
    }

    console.log('PASS: test10x10RoomsAndLandmarks');
    g.printGrid();
    return true;
}

function runAll() {
    try {
        testEmpty5x5();
        test10x10WithLetters();
        test10x10RoomsAndLandmarks();
        console.log('\nALL TESTS PASSED');
    } catch (err) {
        console.error('\nSOME TEST(S) FAILED:', err.message);
        process.exitCode = 1;
    }
}

if (require.main === module) runAll();

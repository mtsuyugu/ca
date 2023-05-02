const DEBUG = 0;
const NUM_OF_BOIDS = 200;
const FRAME_RATE = 60;

function debug() { if (DEBUG) {
        print.apply(null, arguments);
    }
}


const CELL_SIZE = 4;


class Cell {
    constructor(c) {
        this.c = c;
    }
    toString() {
        return c;
    }
}

WallCell = new Cell(0);

class CellAutomaton {

    constructor(w, h, s) {
        CellAutomaton.COLOR = [color(0), color(0,0,255), color(255,0,0), color(0,255,0), color(255,255,0), color(255,0,255), color(255), color(0, 255,255)];
        this.width = w;
        this.height = h;
        this.cellSize = s;
        this.cells = []
        this.count = 0;
        for(var i = 0; i < this.height; i++ ){
            for(var j = 0; j < this.width; j++ ){
                this.cells.push(new Cell(0));
            }
        }
        this.dirty = [];
        this.rules = [];
        this.nStates = 0;
        this.neighborhood = '';
        this.symmetries = '';
    }

    drawAll() {
        for(var h = 0; h < this.height; h++ ){
            for(var w = 0; w < this.width; w++ ){
                this.drawCell(w, h);
            }
        }
    }

    drawCell(w, h) {
        var idx = h * this.width + w;
        var c = this.cells[idx].c;
        push();
        fill(CellAutomaton.COLOR[c]);
        square(w * this.cellSize, h * this.cellSize, this.cellSize);
        pop();
    }

    setRules(text) {
        var lines = text.split("\n");
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var idxSharp = line.indexOf("#");
            if (idxSharp != -1) {
                line = line.substring(0, idxSharp);
            }
            if (line.length == 0) {
                continue;
            }
            if (line.indexOf(":") != -1) {
                var kv = line.split(":");
                if (kv[0] == "n_states") {
                    this.nStates = kv[1];
                }
                else if (kv[0] == "neighborhood") {
                    this.neighborhood = kv[1];
                }
                else if (kv[0] == "symmetries") {
                    this.symmetries = kv[1];
                }
                continue;
            }
            var a = line.split("");
            if (this.neighborhood == "vonNeumann") { 
                var state = this.createStateString(a[0], a[1], a[2], a[3], a[4]);
                this.rules[state] = a[5];
                if(this.symmetries == "rotate4") {
                    state = this.createStateString(a[0], a[4], a[1], a[2], a[3]);
                    this.rules[state] = a[5];
                    state = this.createStateString(a[0], a[3], a[4], a[1], a[2]);
                    this.rules[state] = a[5];
                    state = this.createStateString(a[0], a[2], a[3], a[4], a[1]);
                    this.rules[state] = a[5];
                }
            }
        }
    }

    colorToText(c) {
        if (c == '0') {
            c = '<span style="color:gray">' + c + '</span>';
        }
        else {
            try {
                c = '<span style="color:rgb(' + red(CellAutomaton.COLOR[c]) + "," + green(CellAutomaton.COLOR[c]) + ","+ blue(CellAutomaton.COLOR[c]) +')">' + c + '</span>';
            } catch (error) {
                print(c);
            }
        }
        return c;
    }

    createStateString() {
        var color = false;
        if ( typeof arguments[arguments.length - 1] == "boolean") {
            color = arguments[arguments.length - 1];
        }
        var result = "r";
        var length = color ? arguments.length - 1 : arguments.length;
        for(var i = 0; i < length; i++) {
            var text = arguments[i];
            if (color) {
                text = this.colorToText(text);
            }
            result += text;
        }
        if (color) {
            result = "<b>"+result+"</b>";
        }
        return result;
    }

    getCell(x, y) {
        if ( x < 0 || x >= this.width
            || y < 0 || y >= this.height ) {
            return WallCell;            
        }
        return this.cells[int(y) * this.width + int(x)];
    }

    getNeighbour(x, y) {
        if (this.neighborhood == "vonNeumann") {
            return { n : this.getCell(x, y-1),
                e : this.getCell(x+1, y),
                s : this.getCell(x, y+1),
                w : this.getCell(x-1, y)
            };
        }
    }

    getNext(x, y) {
        if( this.neighborhood == "vonNeumann") {
            var nb = this.getNeighbour(x, y);
            var state = this.createStateString(this.getCell(x, y).c, nb.n.c, nb.e.c, nb.s.c, nb.w.c);
            return this.rules[state]; 
        }
    }
    
    tick() {
        var dirty = this.dirty;
        var len = dirty.length;
        var changed = [];
        var nextDirty = [];
        if (Object.keys(dirty).length === 0){
            noLoop();
            return;
        }
        for (var key in this.dirty) {
            var xy = key.split(":");
            var x = int(xy[0]);
            var y = int(xy[1]);
            var cell = this.getCell(x, y);
            var nextC = this.getNext(x, y);
            if (!nextC || cell.c == nextC) {
                continue;
            }
            changed.push({ x: x, y: y, c: nextC });
            nextDirty[[x,y].join(":")] = 1;
            if (this.neighborhood == "vonNeumann") {
                if ( y - 1 > 0 ) { nextDirty[[x, y-1].join(":")] = 1; }
                if ( x + 1 < this.width ) { nextDirty[[x+1,y].join(":")] = 1; }
                if ( y + 1 < this.height ) { nextDirty[[x,y+1].join(":")] = 1; }
                if ( x - 1 > 0 ) { nextDirty[[x-1,y].join(":")] = 1; }
            }
        }
        for (var i = 0; i < changed.length; i++) {
            this.getCell(changed[i].x, changed[i].y).c = changed[i].c;
            this.drawCell(changed[i].x, changed[i].y);
        }
        this.dirty = nextDirty;
        this.count += 1;
    }

}

function createCA() {
    var ca = new CellAutomaton(Math.ceil(width / CELL_SIZE), Math.ceil(height / CELL_SIZE), CELL_SIZE);
    var text = document.getElementById("rules").innerText;
    ca.setRules(text);
    return ca;
}


var ca;

function setup() {
    createCanvas(window.innerWidth-10, window.innerHeight-10);
    ca = createCA();
    var initial = [ // x, y, color
        [1,0,2], [2,0,2], [3,0,2], [4,0,2], [5,0,2], [6,0,2], [7,0,2], [8,0,2],
        [0,1,2], [1,1,1], [2,1,7], [3,1,0], [4,1,1], [5,1,4], [6,1,0], [7,1,1], [8,1,4], [9,1,2],
        [0,2,2], [1,2,0], [2,2,2], [3,2,2], [4,2,2], [5,2,2], [6,2,2], [7,2,2], [8,2,0], [9,2,2],
        [0,3,2], [1,3,7], [2,3,2], [3,3,0], [4,3,0], [5,3,0], [6,3,0], [7,3,2], [8,3,1], [9,3,2],
        [0,4,2], [1,4,1], [2,4,2], [3,4,0], [4,4,0], [5,4,0], [6,4,0], [7,4,2], [8,4,1], [9,4,2],
        [0,5,2], [1,5,0], [2,5,2], [4,5,0], [4,5,0], [5,5,0], [6,5,0], [7,5,2], [8,5,1], [9,5,2],
        [0,6,2], [1,6,7], [2,6,2], [3,6,0], [4,6,0], [5,6,0], [6,6,0], [7,6,2], [8,6,1], [9,6,2],
        [0,7,2], [1,7,1], [2,7,2], [3,7,2], [4,7,2], [5,7,2], [6,7,2], [7,7,2], [8,7,1], [9,7,2], [10,7,2],[11,7,2],[12,7,2],[13,7,2],
        [0,8,2], [1,8,0], [2,8,7], [3,8,1], [4,8,0], [5,8,7], [6,8,1], [7,8,0], [8,8,7], [9,8,1], [10,8,1],[11,8,1],[12,8,1],[13,8,1],[14,8,2],
                 [1,9,2], [2,9,2], [3,9,2], [4,9,2], [5,9,2], [6,9,2], [7,9,2], [8,9,2], [9,9,2], [10,9,2],[11,9,2],[12,9,2],[13,9,2],
    ]

    var offsetX = Math.ceil(ca.width/2) - 5;
    var offsetY = Math.ceil(ca.height/2) + 10;
    for( var i = 0; i < initial.length; i++) {
        var x = initial[i][0] + offsetX;
        var y = initial[i][1] + offsetY;
        var c = initial[i][2];
        ca.getCell(x, y).c = c;
        ca.dirty[""+x+":"+y] = 1;
        ca.dirty[""+x+":"+(y-1)] = 1;
        ca.dirty[""+(x-1)+":"+y] = 1;
        ca.dirty[""+x+":"+(y+1)] = 1;
        ca.dirty[""+(x+1)+":"+y] = 1;
    }

    setupUI();

    background(150);
    ca.drawAll();
    frameRate(FRAME_RATE);
}


var debugLabel;
function setupUI() {
    debugLabel = createSpan("");
    debugLabel.position(10, 10);
    debugLabel.style("color", "white");
}

function updateUI(count) {
    var x = Math.ceil(mouseX / CELL_SIZE) - 1;
    var y = Math.ceil(mouseY / CELL_SIZE) - 1;
    var cell = ca.getCell(x, y);
    if (!cell) {
        return;
    }
    var nb = ca.getNeighbour(x, y);
    var colorState = ca.createStateString(ca.getCell(x, y).c, nb.n.c, nb.e.c, nb.s.c, nb.w.c, true);
    var state = ca.createStateString(ca.getCell(x, y).c, nb.n.c, nb.e.c, nb.s.c, nb.w.c);
    var nextC = ca.rules[state];
    if (!nextC) {
        return;
    }
    nextC = ca.colorToText(nextC);
    debugLabel.html("" + ca.count + " x:"+x+", y:"+y + ", " + colorState + " -> <b>" + nextC + "</b>");
}

var tickByStep = false;
var toggleLoop = true;

function draw() {
    updateUI(ca.count);
    if (!tickByStep && !toggleLoop) {
        return;
    }
    ca.tick();
    tickByStep = false;
}

function keyPressed() {
    if (key == 'f') {
        tickByStep = true;
    }
    else if (key == ' ') { // space
        toggleLoop = !toggleLoop;
    }
}

function mousePressed() {
    toggleLoop = !toggleLoop;
}



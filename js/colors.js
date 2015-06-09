Array.prototype.delete = function(element) {
  var i = this.indexOf(element);
  this.splice(i, 1);
}

var shuffle = function(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i]
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function Color(r, g, b) {
  this.r = r;
  this.g = g;
  this.b = b;
}

Color.prototype.max = function() {
  return Math.max(this.r, this.g, this.b);
}

Color.prototype.min = function() {
  return Math.min(this.r, this.g, this.b);
}


Color.prototype.distance = function(otherColor) {
  var dr = this.r - otherColor.r;
  var dg = this.g - otherColor.g;
  var db = this.b - otherColor.b;
  return Math.pow(dr, 2) + Math.pow(dg, 2) + Math.pow(db, 2);
}

Color.prototype.toString = function() {
  return "rgb(" + this.r + "," + this.g + "," + this.b + ")";
}

Color.prototype.hue = function() {
  var hue = 0;
  var c = this.max - this.min;

  if (c === 0) {
    hue = 0;
  } else if (this.max === this.r) {
    hue = (this.g - this.b)/c % 6;
  } else if (this.max === this.g) {
    hue = (this.b - this.r)/c + 2;
  } else if (this.max === this.b) {
    hue = (this.r - this.g)/c + 4;
  }

  return hue;
}

function Cell(x, y) {
  this.x = x;
  this.y = y;
  this.color = Color(0, 0, 0);
  this.empty = true;
}

Cell.prototype.changeColor = function(newColor) {
  this.color = newColor;
  this.empty = false;
}

Cell.prototype.toString = function() {
  return this.x + "-" + this.y;
}

function Grid(height, width) {
  this.grid = [];
  this.boundary = [];
  this.height = height;
  this.width = width;
}

Grid.prototype.populate = function() {
  for (var y = 0; y < this.height; y++) {
    var row = [];
    for (var x = 0; x < this.width; x++) {
      row.push(new Cell(x, y));
    }
    this.grid.push(row);
  }
}

Grid.prototype.getCell = function(x, y) {
  return this.grid[y][x];
}

Grid.prototype.cells = function() {
  var cells = [];
  this.grid.forEach(function(row) { cells += row; });
  return cells;
}

Grid.prototype.inGrid = function(x, y) {
  var xInGrid = x >= 0 && x < this.width,
      yInGrid = y >= 0 && y < this.height;
  return xInGrid && yInGrid;
}

Grid.prototype.getNeighbors = function(cell, isEmpty) {
  var x = cell.x;
      y = cell.y;
  var neighbors = [];
  for (var j = y - 1; j <= y + 1; j++) {
    for (var i = x - 1; i <= x + 1; i++) {
      if (this.inGrid(i,j) && this.getCell(i,j) != cell && this.getCell(i, j).empty === isEmpty) {
        neighbors.push(this.getCell(i, j));
      }
    }
  }
  return neighbors;
}

Grid.prototype.emptyNeighbors = function(cell) {
  return this.getNeighbors(cell, true);
}

Grid.prototype.occupiedNeighbors = function(cell) {
  return this.getNeighbors(cell, false);
}

Grid.prototype.hasNeighbors = function(cell, isEmpty) {
  var x = cell.x,
      y = cell.y;
  for (var j = y - 1; j <= y + 1; j++) {
    for (var i = x - 1; i <= x + 1; i++) {
      if (this.inGrid(i, j) && this.getCell(i, j).empty === isEmpty) {
        return true;
      }
    }
  }
  return false;
}

Grid.prototype.hasEmptyNeighbors = function(cell) {
  return this.hasNeighbors(cell, true);
}

Grid.prototype.hasOccupiedNeighbors = function(cell) {
  return this.hasNeighbors(cell, false);
}

Grid.prototype.boundary = function() {
  var boundary = [];
  this.cells().forEach(function(cell) {
    if (cell.empty && this.hasOccupiedNeighbors(cell)) {
      boundary.push(cell);
    }
  });
  return boundary;
}

Grid.prototype.updateBoundary = function(newCell) {

  this.boundary.delete(newCell);

  //add new boundary cells
  var emptyNeighbors = this.emptyNeighbors(newCell)
  for (var k = 0; k < emptyNeighbors.length; k++) {
    var cell = emptyNeighbors[k];
    var newBoundary = true,
        x           = cell.x,
        y           = cell.y;
    for (var j = y - 1; j <= y + 1; j++) {
      for (var i = x - 1; i <= x + 1; i++) {
        if (this.inGrid(i, j)) {
          var neighbor = this.getCell(i, j);
          if (!neighbor.empty && neighbor != newCell) {
            newBoundary = false;
            j = y + 2; i = x + 2;
          }
        }
      }
    }
    if (newBoundary) { this.boundary.push(cell); }
  }
}

function ColorMapper(height, width, ctx) {
  this.grid = new Grid(height, width);
  this.palette = [];
  this.n = 32;
  this.L = parseInt(256/this.n);
  this.coloredCells = [];
  this.ctx = ctx;
}

ColorMapper.prototype.setUp = function() {
  this.generatePalette();
  this.grid.populate();
}

ColorMapper.prototype.generatePalette = function() {
  var orderedColors = [];
  for (var i = 0; i < this.n; i++) {
    for (var j = 0; j < this.n; j++) {
      for (var k = 0; k < this.n; k++) {
        orderedColors.push(new Color(i*this.L, j*this.L, k*this.L))
      }
    }
  }
  this.palette = shuffle(orderedColors);
  // this.palette.sort(function(color1, color2) {
  //   return color1.hue > color2.hue;
  // });
  // console.log('done sorting by hue');
}

ColorMapper.prototype.sortByHue = function() {
  this.palette.sort(function(color1, color2) {
    return color1.hue > color2.hue;
  });
  console.log('done sorting by hue');
}

ColorMapper.prototype.chooseColor = function() {
  return this.palette.splice(0, 1)[0];
}

ColorMapper.prototype.averageColorDist = function(color, neighborCells) {
  var numCells = neighborCells.length;
  var distSum = 0;
  neighborCells.forEach(function(neighborCell) { distSum += color.distance(neighborCell.color); });
  return distSum/numCells;
}

ColorMapper.prototype.colorCell = function(cell, color) {
  cell.changeColor(color);
}

ColorMapper.prototype.bestCell = function(color) {
  var boundary = this.grid.boundary;
  var bestCell = boundary[0],
      minDist  = this.averageColorDist(color, this.grid.occupiedNeighbors(boundary[0]));

  for (var i = 0; i < boundary.length; i++) {
    var cell = boundary[i];
    var dist = this.averageColorDist(color, this.grid.occupiedNeighbors(cell));
    if (dist < minDist) {
      minDist = dist;
      bestCell = cell;
    }
  }

  return bestCell;
}

ColorMapper.prototype.colorNextCell = function() {
  var color = this.chooseColor()
  var bestCell = this.bestCell(color)
  this.colorCell(bestCell, color);
  // bestCell.paint();
  this.coloredCells.push(bestCell);
  this.grid.updateBoundary(bestCell);
}

$(function() {
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  //setup
  // $("#painting").html(generateGrid(128, 128));
  Cell.prototype.paint = function() {
    // $("#" + this.toString()).css("background-color", this.color.toString());
    ctx.fillStyle = this.color.toString();
    ctx.fillRect(4*this.x, 4*this.y, 4, 4);
  }
  var paintDisShit  = function() {
    var artist = new ColorMapper(128, 64, ctx);
    artist.setUp();

    // sort colors by hue
    // artist.sortByHue();

    var startCell = artist.grid.getCell(32, 64);
    artist.colorCell(startCell, artist.chooseColor());
    startCell.paint();
    artist.grid.boundary = artist.grid.emptyNeighbors(startCell);

    var j = 0;
    while (j < 128*63 + 125) {
      artist.colorNextCell();
      j += 1;
    }
    console.log('ready');

    // setInterval(function() {
    //   artist.colorNextCell();
    // }, 1);

    var i = 0;
    var id = setInterval(function() {
      if ( i + 4 < artist.coloredCells.length) {
        artist.coloredCells[i].paint();
        artist.coloredCells[i+1].paint();
        artist.coloredCells[i+2].paint();
        artist.coloredCells[i+3].paint();
        artist.coloredCells[i+4].paint();
        i += 5;
      } else {
        clearInterval(id);
        console.log('done')
        return 'done';
      }
    }, 1);

  }

  $("#start").click(function() {paintDisShit();});


});





var generateGrid = function(height, width) {
  var grid = "<table>";
  for (var y = 0; y < height; y++) {
    var row = "<tr>";
    for (var x = 0; x < width; x++) {
      row += "<td id='" + x + "-" + y + "' class='cell'></td>";
    }
    row += "</tr>";
    grid += row;
  }
  grid += "</table>";
  return grid;
}

var coords = function(id) {
  var splitId = id.split(",");
  return {
    x: parseInt(splitId[0]),
    y: parseInt(splitId[1])
  };
}

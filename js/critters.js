function Vector(x, y) {
  this.x = x;
  this.y = y;
}

Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y);
}

function Grid(width, height) {
  this.space = new Array(width * height);
  this.width = width;
  this.height = height;
}

Grid.prototype.isInside = function(vector) {
  return vector.x >= 0 && vector.x < this.width &&
         vector.y >= 0 && vector.y < this.height;
}

Grid.prototype.get = function(vector) {
  return this.space[vector.x + this.width * vector.y];
}

Grid.prototype.set = function(vector, value) {
  this.space[vector.x + this.width * vector.y] = value;
}

Grid.prototype.forEach = function(f, context) {
  for (var y = 0; y < this.height; y++) {
    for (var x = 0; x < this.width; x++) {
      var value = this.space[x + y * this.width];
      if (value != null)
        f.call(context, value, new Vector(x, y));
    }
  }
}

var directions = {
  "n":  new Vector( 0, -1),
  "ne": new Vector( 1, -1),
  "e":  new Vector( 1,  0),
  "se": new Vector( 1,  1),
  "s":  new Vector( 0,  1),
  "sw": new Vector(-1,  1),
  "w":  new Vector(-1,  0),
  "nw": new Vector(-1, -1)
};

function randomElement(array) {
  return array[Math.floor(Math.random()*array.length)];
}

var directionNames = "n ne e se s sw w nw".split(" ");

function BouncingCritter() {
  this.direction = randomElement(directionNames);
}

BouncingCritter.prototype.act = function(view) {
  if (view.look(this.direction) != " ") {
    this.direction = view.find(" ") || "s"; }
  return {type: "move", direction: this.direction};
}

function dirPlus(dir, n) {
  var index = directionNames.indexOf(dir);
  return directionNames[(index + n + 8) % 8];
}

function WallFollower() {
  this.dir = "s";
}

WallFollower.prototype.act = function(view) {
  var start = this.dir;
  if (view.look(dirPlus(this.dir, -3)) != " ")
    start = this.dir = dirPlus(this.dir, -2);
  while (view.look(this.dir) != " ") {
    this.dir = dirPlus(this.dir, 1);
    if (this.dir == start) break;
  }
  return {type: "move", direction: this.dir};
}

function elementFromChar(legend, ch) {
  if (ch == " ")
    return null;
  var element = new legend[ch]();
  element.originChar = ch;
  return element;
}

function World(map, legend) {
  var grid = new Grid(map[0].length, map.length);
  this.grid = grid;
  this.legend = legend;

  map.forEach(function(line, y) {
    for (var x = 0; x < line.length; x++)
      grid.set(new Vector(x, y), elementFromChar(legend, line[x]));
  });
}

function charFromElement(element) {
  if (element == null)
    return " ";
  else
    return element.originChar;
}

// World v1

World.prototype.toString = function() {
  var output = "";
  for (var y = 0; y < this.grid.height; y++) {
    for (var x = 0; x < this.grid.width; x++) {
      var element = this.grid.get(new Vector(x, y));
      output += charFromElement(element);
    }
    output += "\n";
  }
  return output;
}

World.prototype.turn = function() {
  var acted = [];
  this.grid.forEach(function(critter, vector) {
    if (critter.act && acted.indexOf(critter) == -1) {
      acted.push(critter);
      this.letAct(critter, vector);
    }
  }, this);
}

World.prototype.letAct = function(critter, vector) {
  var action = critter.act(new View(this, vector));
  if (action && action.type == "move") {
    var dest = this.checkDestination(action, vector);
    if (dest && this.grid.get(dest) == null) {
      this.grid.set(vector, null);
      this.grid.set(dest, critter);
    }
  }
}

World.prototype.checkDestination = function(action, vector) {
  if (directions.hasOwnProperty(action.direction)) {
    var dest = vector.plus(directions[action.direction]);
    if (this.grid.isInside(dest))
      return dest;
  }
}

function View(world, vector) {
  this.world = world;
  this.vector = vector;
}

View.prototype.look = function(dir) {
  var target = this.vector.plus(directions[dir]);
  if (this.world.grid.isInside(target))
    return charFromElement(this.world.grid.get(target));
  else
    return "#";
}

View.prototype.findAll = function(ch) {
  var found = []
  for (var dir in directions) {
    if (this.look(dir) == ch)
      found.push(dir);
  }
  return found;
}

View.prototype.find = function(ch) {
  var found = this.findAll(ch);
  if (found.length == 0) return null;
  return randomElement(found);
}

function Wall() {}

// World v2
function LifelikeWorld(map, legend) {
  World.call(this, map, legend);
}

LifelikeWorld.prototype = Object.create(World.prototype);

var actionTypes = Object.create(null);

LifelikeWorld.prototype.letAct = function(critter, vector) {
  var action = critter.act(new View(this, vector));
  var handled = action &&
    action.type in actionTypes &&
    actionTypes[action.type].call(this, critter, vector, action);

  if (!handled)
    critter.energy -= 0.2;
    if (critter.energy <= 0)
      this.grid.set(vector, null);
}

// action handlers

actionTypes.grow = function(critter) {
  critter.energy += 0.5;
  return true;
}

actionTypes.move = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 1 ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 1;
  this.grid.set(vector, null);
  this.grid.set(dest, critter);
  return true;
}

actionTypes.eat = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  var atDest = dest != null && this.grid.get(dest);
  if (!atDest || atDest.energy == null)
    return false;
  critter.energy += atDest.energy;
  this.grid.set(dest, null);
  return true;
}

actionTypes.reproduce = function(critter, vector, action) {
  var baby = elementFromChar(this.legend, critter.originChar);
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 2 * baby.energy ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 2 * baby.energy;
  baby.species = critter.species;
  this.grid.set(dest, baby);
  return true;
}

// new critters
function Plant(species) {
  this.energy = 3 + Math.random() * 4;
  this.species = Math.random() < 0.5 ? "green" : "blue";
}

Plant.prototype.act = function(view) {
  if (this.energy > 15) {
    var space = view.find(" ");
    if (space)
      return {type: "reproduce", direction: space};
  }
  if (this.energy < 20)
    return {type: "grow"};
}

function PlantEater(species) {
  this.energy = 20;
  this.species = Math.random() < 0.5 ? "orange" : "red"
}

PlantEater.prototype.act = function(view) {
  var space = view.find(" ");
  if (this.energy > 60 && space)
    return {type: "reproduce", direction: space};
  var plant = view.find("*");
  if (plant)
    return {type: "eat", direction: plant};
  if (space)
    return {type: "move", direction: space};
}

var plan1 = ["############################",
            "#      #    #      o      ##",
            "#                          #",
            "#          #####           #",
            "##         #   #    ##     #",
            "###           ##     #     #",
            "#           ###      #     #",
            "#   ####                   #",
            "#   ##       o             #",
            "# o  #         o       ### #",
            "#    #                     #",
            "############################"];

var plan2 = ["############",
            "#     #    #",
            "#   ~    ~ #",
            "#  ##      #",
            "#  ##  o####",
            "#          #",
            "############"];

var plan3 = ["############################",
             "#####                 ######",
             "##   ***                **##",
             "#   *##**         **  o  *##",
             "#    ***     o    ##**    *#",
             "#       o         ##***    #",
             "#                 ##**     #",
             "#   o       #*             #",
             "#*          #**       o    #",
             "#***        ##**    o    **#",
             "##****     ###***       *###",
             "############################"];

var legend1 = {"#": Wall,
               "~": WallFollower,
               "o": BouncingCritter};

var legend2 = {"#": Wall,
               "o": PlantEater,
               "*": Plant};

var plan   = plan3,
    legend = legend2;

var world = new LifelikeWorld(plan, legend);

$(function() {
  var width = world.grid.width;
  var height = world.grid.height;
  var worldId;

  $("body").append(generateGrid(height, width));
  updateGrid(height, width);

  $("#start").click(function() {
    worldId = startWorld(height, width);
    $("#start, #stop").toggle();
  });

  $("#stop").click(function() {
    stopWorld(worldId);
    $("#start, #stop").toggle();
  });

  $("#reset").click(function() {
    stopWorld(worldId);
    $("#start").show();
    $("#stop").hide();
    world = new LifelikeWorld(plan, legend);
    updateGrid(height, width);
  });
})

function generateGrid(height, width) {
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

function updateGrid(height, width) {
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var element = world.grid.get(new Vector(x, y))
      if (element && element.species)
        $("#" + x + "-" + y).html("<span style='color:" + element.species + ";'>" +
                                      charFromElement(element) + "</span>");
      else
        $("#" + x + "-" + y).text(charFromElement(element));
    }
  }
}

function startWorld(height, width) {
  return setInterval(function() {
    world.turn();
    updateGrid(height, width);
  }, 200);
}

function stopWorld(id) {
  clearInterval(id);
}

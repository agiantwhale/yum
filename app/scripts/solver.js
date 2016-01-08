/* jshint ignore:start */

function randomNumber(max) {
  return parseInt(Math.random() * max);
}

function shuffle(array) {
  for(var j, x, i = array.length-1; i; j = randomNumber(i), x = array[--i], array[i] = array[j], array[j] = x){}
  return array;
}

function indexOf(array, value) {
  for(var i=0; i<array.length; i++) {
    if(array[i] === value) {
      return i;
    }
  }
}

function deleteByValue(array, value) {
  var pos = indexOf(array, value);
  return array.splice(pos, 1);
}

function normalize(array, index, value) {
  return (2 * array.length + index + value) % array.length;
}

function swap(array, x, y) {
  if(x>array.length || y>array.length || x === y) {return array;}
    var tem = array[x];
    array[x] = array[y];
    array[y] = tem;
    return array;
}

function Solver(nodes, populationSize) {
  // Pure copy of the nodes
  this.nodes = nodes;
  this.best = null; // Best individual
  this.currentBest = null; // Best individual in this generation
  this.bestValue = undefined; // Fitness of best individual
  this.currentGeneration = 0;
  this.populationSize = populationSize;
  this.crossoverProbability = 0.9;
  this.mutationProbability = 0.01;
  this.population = []; // Individual collection
  this.values = new Array(populationSize); // Individual distance
  this.fitnesses = new Array(populationSize); // Individual fitness
  this.distances = new Array(populationSize); // Distances between nodes
  this.roulette = new Array(populationSize);
  this.unchangedCount = 0;
  this.mutationCount = 0;
}

Solver.prototype.setBestValue = function() {
  for (var i = this.population.length - 1; i >= 0; i--) {
    this.values[i] = this.evaluate(this.population[i]);
  }
  this.currentBest = this.getCurrentBest();
  if(this.bestValue === undefined || this.bestValue > this.currentBest.bestValue) {
    this.best = this.population[this.currentBest.bestIndex].slice(0);
    this.bestValue = this.currentBest.bestValue;
    this.unchangedCount = 0;
  } else {
    this.unchangedCount++;
  }
};

Solver.prototype.getCurrentBest = function() {
  var bestIndex = 0,
      currentBestValue = this.values[0];

  for(var i=1; i<this.population.length; i++) {
    if(this.values[i] < currentBestValue) {
      currentBestValue = this.values[i];
      bestIndex = i;
    }
  }
  return {
    bestIndex: bestIndex,
    bestValue: currentBestValue
  };
};

Solver.prototype.evaluate = function(individual) {
  var sum = this.distances[individual[0]][individual[individual.length - 1]];
  for(var i=1; i<individual.length; i++) {
    sum += this.distances[individual[i]][individual[i-1]];
  }
  return sum;
};

Solver.prototype.randomIndividual = function(chromosomeLength) {
  var a = [];
  for(var i=0; i<chromosomeLength; i++) {
    a.push(i);
  }
  return shuffle(a);
};

Solver.prototype.initialize = function() {
  var length = this.nodes.length;
  this.distances = new Array(this.nodes.length);
  for(var i=0;i<length;i++) {
    this.distances[i] = new Array(this.nodes.length);
    for(var j=0;j<length;j++) {
      this.distances[i][j] = google.maps.geometry.spherical.computeDistanceBetween(this.nodes[i].geometry.location,
                                                                                   this.nodes[j].geometry.location);
    }
  }

  for(var k=0; k<this.populationSize; k++) {
    this.population.push(this.randomIndividual(this.nodes.length));
  }

  this.setBestValue();
};

Solver.prototype.nextGeneration = function() {
  this.currentGeneration++;
  this.selection();
  this.crossover();
  this.mutation();

  this.setBestValue();
};

Solver.prototype.selection = function() {
  var parents = [];
  var initnum = 4;
  parents.push(this.population[this.currentBest.bestIndex]);
  parents.push(this.doMutate(this.best.slice(0)));
  parents.push(this.pushMutate(this.best.slice(0)));
  parents.push(this.best.slice(0));

  this.setRoulette();
  for(var i=initnum; i<this.populationSize; i++) {
    parents.push(this.population[this.wheelOut(Math.random())]);
  }
  this.population = parents;
};

Solver.prototype.crossover = function() {
  var queue = [];
  for(var i=0; i<this.populationSize; i++) {
    if( Math.random() < this.crossoverProbability) {
      queue.push(i);
    }
  }
  queue = shuffle(queue);
  for(var i=0, j=queue.length-1; i<j; i+=2) {
    this.doCrossover(queue[i], queue[i+1]);
  }
};

Solver.prototype.doCrossover = function(x, y) {
  var child1 = this.getChild(1, x, y);
  var child2 = this.getChild(-1, x, y);
  this.population[x] = child1;
  this.population[y] = child2;
};

Solver.prototype.getChild = function(mult, x, y) {
  var solution = [];
  var px = this.population[x].slice(0);
  var py = this.population[y].slice(0);
  var dx,dy;
  var c = px[randomNumber(px.length)];
  solution.push(c);
  while(px.length > 1) {
    dx = px[normalize(px, px.indexOf(c), mult)];
    dy = py[normalize(py, py.indexOf(c), mult)];
    deleteByValue(px, c);
    deleteByValue(py, c);
    c = this.distances[c][dx] < this.distances[c][dy] ? dx : dy;
    solution.push(c);
  }
  return solution;
};

Solver.prototype.mutation = function() {
  for(var i=0; i<this.populationSize; i++) {
    if(Math.random() < this.mutationProbability) {
      if(Math.random() > 0.5) {
        this.population[i] = this.pushMutate(this.population[i]);
      } else {
        this.population[i] = this.doMutate(this.population[i]);
      }
      mutationCount++;
      i--;
    }
  }
};

Solver.prototype.doMutate = function(individual) {
  var m = 0,
      n = 0;

  do {
    m = randomNumber(individual.length - 2);
    n = randomNumber(individual.length);
  } while (m>=n);

  for(var i=0, j=(n-m+1)>>1; i<j; i++) {
    swap(individual, m+i, n-i);
  }
  return individual;
};

Solver.prototype.pushMutate = function(individual) {
  var m = 0,
      n = 0;
  do {
    m = randomNumber(individual.length>>1);
    n = randomNumber(individual.length);
  } while (m>=n);

  var s1 = individual.slice(0,m);
  var s2 = individual.slice(m,n);
  var s3 = individual.slice(n,individual.length);
  return s2.concat(s1).concat(s3).slice(0);
};

Solver.prototype.setRoulette = function() {
  //calculate all the fitness
  for(var i=0; i<this.values.length; i++) { this.fitnesses[i] = 1.0/this.values[i]; }
  //set the roulette
  var sum = 0;
  for(var i=0; i<this.fitnesses.length; i++) { sum += this.fitnesses[i]; }
  for(var i=0; i<this.roulette.length; i++) { this.roulette[i] = this.fitnesses[i]/sum; }
  for(var i=1; i<this.roulette.length; i++) { this.roulette[i] += this.roulette[i-1]; }
};

Solver.prototype.wheelOut = function(rand) {
  var i;
  for(i=0; i<this.roulette.length; i++) {
    if( rand <= this.roulette[i] ) {
      return i;
    }
  }
};

/* jshint ignore:end */

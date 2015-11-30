
var GameState = function(game) {};

// set size of screen - iPhone5 resolution(1136x640), landscape
var stageSize = {
	width: 1136,
	height: 640
};
// set center of screen, important for knowing when we're on R or L side of screen when using controls
var centerPoint = {
	x: stageSize.width/2,
	y: stageSize.height/2
};

// preload images, audio, spritesheets here
// preloading avoids any potential load-lag later
// preload all assets for game
GameState.prototype.preload = function() {
	// load loads all external asset types (images, audio, json, xml, txt) and adds them to Cache
	// load automatically invoked by a state
	this.game.load.image('player', 'cape.png');
	this.game.load.image('blimp', 'blimp.png');
};

// this function is called immediately after preloading
GameState.prototype.create = function() {
	// adds background color as a number
	this.game.stage.backgroundColor = 0x360000
	this.game.add.existing(
		this.player = new Player(this.game, 150, centerPoint.y, this.game.input)
		);
	// add frames per second timer
	this.game.time.advancedTiming = true;
	// add timer as text on the screen
	this.fpsText = this.game.add.text(20, 20, '', {font: '16px optima', fill: '#eecccc'});

	// make blimps show up on screen and appear at intervals
	this.blimpGroup = game.add.group();
	this.blimpTimer = game.time.events.loop(Phaser.Timer.SECOND*2.5, function(){
		var blimp = this.game.add.existing(
			new Blimp(this, this.player)
		);
		this.blimpGroup.add(blimp);
	}, this);
};

// this method is called every frame
GameState.prototype.update = function() {
	// update the fpsText
	if (this.game.time.fps !== 0) {
		this.fpsText.setText(this.game.time.fps + ' FPS');
	}

	// gameover screen if player gets below 0 health
	if (this.player.health <= 0) {
		// pass in the player, blimpgroup, and blimptimer to remove them
		gameOver(this.player, this.blimpGroup, this.blimpTimer);
	}
};

// this function is called from gamestate update
function gameOver(player, blimpGroup, blimpTimer) {
	// destroy group of blimps
	blimpGroup.destroy();
	// kill the player
	player.kill();
	// remove the timer
	game.time.events.remove(blimpTimer);

	// create game over text using text style
	// set anchor to 0.5, 0.5 to center it
	var textStyle = {font: "28px Arial", fill: "#FFFFFF", align: "center"};
	game.add.text(game.world.centerX, game.world.centerY, 'YOU DIED. GAME OVER.\nCLICK TO PLAY AGAIN', textStyle)
		.anchor.setTo(0.5, 0.5);

	// player should be able to restart
	// add click event
	game.input.onDown.addOnce(newGame, this);
}

// this function is called from gameover function
function newGame() {
	// sets state of game to a fresh version of gamestate, starting all over again
	game.state.add('game', GameState, true);
}

// create player class
var Player = function(game, x, y, target) {
	// based on phaser's sprite class
	Phaser.Sprite.call(this, game, x, y, 'player');
	// set game input as target
	this.target = target;
	// centerpoint allows us to rotate/pivot character based on its centerpoint
	this.anchor.setTo(0.5,0.5);
	// enable physics to move player around
	this.game.physics.enable(this, Phaser.Physics.ARCADE);
	// set target position for player to head to
	this.targetPos = {x: this.x, y: this.y};
	// easing constant to smooth the movement
	this.easer = .5;
	// set health
	this.health = 100;
};

// give our player a type of Phaser
Player.prototype = Object.create(Phaser.Sprite.prototype);
Player.prototype.constructor = Player;

Player.prototype.update = function() {
	// if the target's active pointer is down (we assigned target as this.game.input)
	if (this.target.activePointer.isDown) {
		// make new target position to pointer's potition
		this.targetPos = {x: this.target.x, y: this.target.y};
	}
	// work out velocities by working out the difference between target and current position; use easer to smooth it
	var velX = (this.targetPos.x - this.x)/this.easer;
	var velY = (this.targetPos.y - this.y)/this.easer;

	// set player's physics body's velocity
	this.body.velocity.setTo(velX, velY);
};


// instantiate a new phaser game with iPhone5 resolution(1136x640) - this example uses landscape
var game = new Phaser.Game(1136, 640, Phaser.AUTO, 'game');

// add GameState to the game we just instantiated as the default state
// extends base game state with the GameState we created above
game.state.add('game', GameState, true);

// create enemy blimps
var Blimp = function(game, player) {
	// give the blimp an x offscreen, random y, speed between -150 and -250
	var x = stageSize.width + 200;
	var y = Math.random()*stageSize.height;
	this.speed = -250-Math.random()*150;
	this.player = player;

	// create a sprite with the blimp graphic
	Phaser.Sprite.call(this, game, x, y, 'blimp');

	// enable physics, set velocity
	this.game.physics.enable(this, Phaser.Physics.ARCADE);
	this.body.velocity.setTo(this.speed, 0);

	// set scale between 1 and 1.5 for random sizes
	this.scale.setTo(1+Math.random()*.5);
	this.anchor.setTo(0.5, 0.5);

	// check if the blimp is off screen
	// if blimp is off screen, call blimpOutOfBounds and eliminate it
	this.checkWorldBounds = true;
	this.events.onOutOfBounds.add(blimpOutOfBounds, this);

	// whether the blimp has been hit by the player yet
	this.hit = false;
}

// this function called from blimp constructor
function blimpOutOfBounds(blimp) {
	blimp.kill();
};

Blimp.prototype = Object.create(Phaser.Sprite.prototype);
Blimp.prototype.constructor = Blimp;

Blimp.prototype.update = function(){
	// for collision detection, detect bounds and see if they intersect
	var boundsA = this.player.getBounds();
	var boundsB = this.getBounds();

	// if bounds intersect and it's not already a hit
	if (Phaser.Rectangle.intersects(boundsA, boundsB) && !this.hit){
		this.hit = true;

		// subtract 20 from player's health and set alpha to represent it
		this.player.health -= 20;
		this.player.alpha = this.player.health/100;
		console.log(this.player.health);

		// change velocity to a downward fall
		this.body.velocity.setTo(this.body.velocity.x/2, 100);

		// use Tweens to smooth movement
		// this smoothly rotates downwards to give impression of falling
		game.add.tween(this)
		.to({rotation: -Math.PI/8}, 300, Phaser.Easing.Linear.In)
		.start();
	}
}












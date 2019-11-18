import { getBody } from "./index";
import { Scene } from "phaser";

const MaxParticleVelocity = 100;
const MaxParticleAcceleration = 30;

class Config { 
  x:number 
  y:number
  emitZone: {
    type: string
    source: Phaser.Geom.Circle

    quantity: number
    stepRate: number
    yoyo: boolean
    seamless: boolean
  }

  moveToX: number
  moveToY: number

  deathZone: {
    type: string
    source: Phaser.Geom.Circle
  }

  radial: boolean
  angle: { 
    min: number
    max: number
  }

  scale: number
  scaleX: number 
  scaleY: number

  frame: string
  alpha: number
  visible: boolean
  tint: number
  blendMode: string

  delay: number
  lifespan: number

  speed: { 
    min: number
    max: number
  }
  speedX: { 
    min: number
    max: number
  }
  speedY: { 
    min: number
    max: number
  }
  gravityX: number
  gravityY: number
  accelerationX: { 
    min: number
    max: number
  }
  accelerationY: { 
    min: number
    max: number
  }
  maxVelocityX: number
  maxVelocityY: number

  bounce: number
  bounds: Phaser.GameObjects.Rectangle
  collideBottom: boolean
  collideTop: boolean
  collideLeft: boolean
  collideRight: boolean

  particleClass: Phaser.GameObjects.Particles.Particle

  emitCallback
  emitCallbackScope
  deathCallback
  deathCallbackScope

  name: string
  on: boolean
  active: boolean
  frequency: number
  quantity: number
  maxParticles: number
  rotate: number
  timeScale: number

  constructor(
    x: number,
    y: number,
    ) {
    this.x = x;
    this.y = y;
    this.visible = true;
    this.frequency = 0.005;
    this.lifespan = 50000;
    this.bounce = 1000;
    this.active = true;
    this.accelerationX = { min: -MaxParticleAcceleration, max: MaxParticleAcceleration };
    this.accelerationY = { min: -MaxParticleAcceleration, max: MaxParticleAcceleration };
    this.quantity = 1;
    this.scaleX = 0.1;
    this.scaleY = 0.1;
    this.alpha = 0.8;
    }
}

class FireOld {
  x: number;
  y: number;
  emmiter: Phaser.GameObjects.Particles.ParticleEmitter;
  particle: Phaser.GameObjects.Particles.ParticleEmitterManager;
  config: Config;

  constructor(
    name: string,
    scene: Phaser.Scene,
    x: number,
    y: number,
    amount: number

  ) {
    this.config = new Config(x, y);
    this.particle = scene.add.particles(name);
    this.emmiter = this.particle.createEmitter(this.config);
    this.emmiter.maxParticles = amount;

    let well : Phaser.GameObjects.Particles.GravityWell;
    well = {
      active: true,
      update: function(particle) {
        let sign1 = Math.random() > 0.5 ? -1 : 1;
        let sign2 = Math.random() > 0.5 ? -1 : 1;
        let sign3 = Math.random() > 0.5 ? -1 : 1;
        let sign4 = Math.random() > 0.5 ? -1 : 1;
        particle.accelerationX = sign1 * Math.random() * MaxParticleAcceleration;
        particle.accelerationY = sign2 * Math.random() * MaxParticleAcceleration;
      },
      x: 0,
      y: 0,
      power: 0,
      epsilon: 0
    }
    this.particle.addGravityWell(well);
  }
}

export default FireOld;


// **basic properties of particles**
// **initial position**
// x: 0,             // { min, max }, or { min, max, steps }
// y: 0,             // { min, max }, or { min, max, steps }
// follow: null,
// followOffset: {
//    x: 0,
//    y: 0
// },
// **emit zone**
// emitZone: {
// type: 'random',    // 'random', or 'edge'
// source: geom,      // Geom like Circle, or a Path or Curve

// **type = edge**
// quantity: 1,
// stepRate: 0,
// yoyo: false,
// seamless: true
// },

// **target position**
// moveToX:          // { min, max }, or { min, max, steps }
// moveToY:          // { min, max }, or { min, max, steps }
// **death zone**
// deathZone: {
// type: 'onEnter',  // 'onEnter', or 'onLeave'
// source: geom      // Geom like Circle or Rect that supports a 'contains' function
// }

// **angle**
// radial: true,
// angle: { min: 0, max: 360 },  // { start, end, steps }

// **scale**
// scale: 1,             // { start, end },
// scaleX: 1,
// scaleY: 1,

// **render**
// frame:                // one or more texture frames, or a configuration object.
// alpha: 1,             // { min, max }
// visible: true,
// tint: 0xffffffff,     // a number 0xfffffff, or an array [ 0xffff00, 0xff0000, 0x00ff00, 0x0000ff ]
// blendMode: 'NORMAL',  // Phaser.BlendModes

// delay: 0,
// lifespan: 1000,       // { min, max }, or { min, max, steps }


// **physics**
// speed:                // { min, max }, or { min, max, steps }
// speedX:               // { min, max }, or { min, max, steps }
// speedY:               // { min, max }, or { min, max, steps }
// gravityX:
// gravityY:
// accelerationX:
// accelerationY:
// maxVelocityX: 10000,
// maxVelocityY: 10000,

// **bounce**
// bounce: 0,
// bounds: nul,           // Phaser.Geom.Rectangle, or { x, y, width, height }
// collideBottom: true,
// collideTop: true,
// collideLeft: true,
// collideRight : true,

// **callback**
// emitCallback: null,
// emitCallbackScope: null,
// deathCallback: null,
// deathCallbackScope: null,

// **custom particle**
// particleClass: Phaser.GameObjects.Particles.Particle

// **emitter**
// name: '',
// on: true,          // set false to stop emitter
// active: true,      // set false to pause emitter and particles
// frequency: 0,      // -1 for exploding emitter
// quantity: 1,       // { min, max }
// maxParticles: 0,
// rotate: 0,         // { start, end }, or { start, end, ease },
// timeScale: 1,
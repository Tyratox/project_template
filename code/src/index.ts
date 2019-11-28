import * as Phaser from "phaser";
import PhaserNavMeshPlugin from "phaser-navmesh";

import { CONSTANTS } from "./controls";
import Dude from "./Dude";
import map from "./map";
import { isLeftOfLine, distanceToLineSegment, dist2 } from "./utilities/math";
import { onDOMReadyControlSetup } from "./controls";
import Fire from "./Fire";
import AttractiveTarget from "./AttractiveTarget";

interface Traceable {
  position: {
    x: number;
    y: number;
  };
  type: string;
}

type ScenePreloadCallback = Phaser.Types.Scenes.ScenePreloadCallback;
type SceneCreateCallback = Phaser.Types.Scenes.SceneCreateCallback;
type CreateSceneFromObjectConfig = Phaser.Types.Scenes.CreateSceneFromObjectConfig;
type GameConfig = Phaser.Types.Core.GameConfig;

export const getBody = (
  obj: Phaser.GameObjects.GameObject
): Phaser.Physics.Arcade.Body =>
  //@ts-ignore
  obj.body;

// ----- Declaring Constants -----

interface TraceableAttractiveTarget extends Traceable {
  type: string;
  index: number;
  position: {
    x: number;
    y: number;
  };
  orientation: {
    x: number;
    y: number;
  };
}

interface TraceableRepulsiveTarget extends Traceable {
  type: string;
  position: {
    x: number;
    y: number;
  };
}

const attractiveTargets: TraceableAttractiveTarget[] = [];
const repulsiveTargets: TraceableRepulsiveTarget[] = [];

const wallShape: Phaser.Geom.Rectangle[] = [];

const ACCELERATION_THRESHOLD = 0;
const ACCELERATION_VALUE = 500;
const FIRE_REPULSION = 5000;

const DUDE_WALKING_FRICTION = 0.98;

const SPEED_THRESHOLD = 7;

let totalNumberOfDudes = 0;
let numberOfDeadDudes = 0;
let numberOfSurvivorDudes = 0;

let currentStartTime: number = 0;
let previousElapsedTime: number = 0;
let currentElapsedTime: number = 0;
let timeLabel: Phaser.GameObjects.Text;

export const setCurrentStartTime = (time: number) => {
  currentStartTime = time;
};
export const setPreviousElapsedTime = (time: number) => {
  previousElapsedTime += (time - currentStartTime) / 1000;
};

//globals
let dudeGroup: Phaser.GameObjects.Group;
let navmesh: any;

// ----- Phaser initialization functions -----

const preload: ScenePreloadCallback = function(this: Phaser.Scene) {
  //load images if needed
  this.load.image("dungeon-tiles", "/assets/map/dungeon-tileset.png");
  this.load.image("skull", "/assets/skull.png");
  this.load.image("fire", "/assets/fire.png");
  this.load.tilemapTiledJSON("map", "/assets/map/default.json");
};

const create: SceneCreateCallback = function(this: Phaser.Scene) {
  //generate map, yehei
  //https://stackabuse.com/phaser-3-and-tiled-building-a-platformer/
  const tilemap = this.make.tilemap({ key: "map" });
  const tileset = tilemap.addTilesetImage("Dungeon_Tileset", "dungeon-tiles");
  const floorLayer = tilemap.createStaticLayer("floor", tileset, 0, 0);
  const wallLayer = tilemap.createStaticLayer("walls", tileset, 0, 0);

  //@ts-ignore
  navmesh = this.navMeshPlugin.buildMeshFromTiled(
    "mesh",
    tilemap.getObjectLayer("navmesh"),
    16
  );
  // navmesh.enableDebug();
  // navmesh.debugDrawMesh({
  //   drawCentroid: true,
  //   drawBounds: true,
  //   drawNeighbors: true,
  //   drawPortals: false
  // });

  //walls.setCollisionBetween(1, walls.tilesTotal);

  //additional layer for raytracing
  const walls = this.physics.add.staticGroup();
  tilemap.getObjectLayer("physical-walls")["objects"].forEach(rect => {
    wallShape.push(
      new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height)
    );
    walls.add(
      this.add.rectangle(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height,
        0x00ff00,
        0
      )
    );
  });

  // ----- Create Physiscs Group -----

  dudeGroup = this.add.group();
  tilemap
    .getObjectLayer("dudes")
    ["objects"].forEach(dude =>
      dudeGroup.add(new Dude(dude.x, dude.y, "Peter", this))
    );

  const somkeGroup = this.add.group();
  const fireGroup = this.add.group();

  const tables = this.physics.add.staticGroup();
  /*map.tables.forEach(([from, to]) => {
    const rect = this.add.rectangle(
      from.x + (to.x - from.x) / 2,
      from.y + (to.y - from.y) / 2,
      to.x - from.x + halfThickness,
      to.y - from.y + halfThickness,
      0x000000
    );

    tables.add(rect);
  });*/

  const despawnZones = this.physics.add.staticGroup();
  tilemap.getObjectLayer("despawn-zones")["objects"].forEach(zone => {
    const rect = this.add.rectangle(
      zone.x + zone.width / 2,
      zone.y + zone.height / 2,
      zone.width,
      zone.height,
      0xffeaa7
    );

    despawnZones.add(rect);
  });

  const attractiveTargetGroup = this.physics.add.staticGroup();

  const signCount = tilemap.getObjectLayer("signs")["objects"].length;

  tilemap.getObjectLayer("signs")["objects"].forEach((sign, index) => {
    const orientationX: number = sign.properties.find(
      p => p.name === "orientationX"
    ).value;
    const orientationY: number = sign.properties.find(
      p => p.name === "orientationY"
    ).value;

    const triangle = this.add.isotriangle(
      sign.x,
      sign.y,
      CONSTANTS.TRIANGLE_SIZE,
      CONSTANTS.TRIANGLE_HEIGHT,
      false,
      0x237f52,
      0x2ecc71,
      0x27ae60
    );
    const orientationNorm = Math.sqrt(
      orientationX * orientationX + orientationY * orientationY
    );

    triangle.rotation =
      (orientationX < 0 ? 1 : -1) * Math.acos(orientationY / orientationNorm);

    attractiveTargets.push({
      type: "sign",
      index,
      position: { x: sign.x, y: sign.y },
      orientation: { x: orientationX, y: orientationY }
    });

    attractiveTargetGroup.add(
      new AttractiveTarget(index, sign.x, sign.y, this)
    );
  });

  tilemap.getObjectLayer("doors")["objects"].forEach((door, index) => {
    const orientationX: number = door.properties.find(
      p => p.name === "orientationX"
    ).value;
    const orientationY: number = door.properties.find(
      p => p.name === "orientationY"
    ).value;

    const triangle = this.add.isotriangle(
      door.x,
      door.y,
      CONSTANTS.TRIANGLE_SIZE,
      CONSTANTS.TRIANGLE_HEIGHT,
      false,
      0x3498db,
      0x3498db,
      0x2980b9
    );
    const directionNorm = Math.sqrt(
      orientationX * orientationX + orientationY * orientationY
    );

    triangle.rotation =
      (orientationX < 0 ? 1 : -1) * Math.acos(orientationY / directionNorm);

    attractiveTargets.push({
      type: "door",
      index: signCount + index,
      position: { x: door.x, y: door.y },
      orientation: { x: orientationX, y: orientationY }
    });

    attractiveTargetGroup.add(
      new AttractiveTarget(signCount + index, door.x, door.y, this)
    );
  });

  totalNumberOfDudes = map.spawnPoints.length;

  // Create Fire class instances
  map.fires.forEach(point =>
    fireGroup.add(
      new Fire(this, point.position.x, point.position.y, somkeGroup)
    )
  );

  // ----- Adding Groups to the Physics Collider Engine -----

  this.physics.add.collider(dudeGroup, fireGroup, (dude: Dude, fire) => {
    console.log("Dude " + dude.name + " unfortunately perished in the fire!");
    this.add.sprite(dude.x, dude.y, "skull");
    numberOfDeadDudes++;
    dude.destroy();
  });

  this.physics.add.collider(somkeGroup, walls);
  this.physics.add.overlap(
    dudeGroup,
    somkeGroup,
    (dude: Dude, smoke: Phaser.GameObjects.Arc) => {
      dude.health -= smoke.alpha;
      if (dude.health <= 0) {
        console.log(
          "Dude " + dude.name + " unfortunately perished in the fire!"
        );
        this.add.sprite(dude.x, dude.y, "skull");
        numberOfDeadDudes++;
        dude.destroy();
      }
    }
  );
  this.physics.add.collider(dudeGroup, dudeGroup);
  this.physics.add.collider(dudeGroup, walls);
  this.physics.add.collider(dudeGroup, tables);
  this.physics.add.collider(dudeGroup, despawnZones, (dude: Dude, zone) => {
    console.log("Dude " + dude.name + " is a survivor!");
    numberOfSurvivorDudes++;
    dude.destroy();
  });

  this.physics.add.overlap(
    dudeGroup,
    attractiveTargetGroup,
    (dude: Dude, target: AttractiveTarget) => {
      dude.visitedTargets.push(target.index);
      dude.path = null;
    }
  );
  // ----- Initialize Timer -----
  timeLabel = this.add.text(map.width / 2, 100, "00:00", {
    font: "100px Arial",
    fill: "#000"
  });
  timeLabel.setOrigin(0.5);
  timeLabel.setAlign("center");
  timeLabel.setShadow(0, 0, "#000", 0, true, true);

  //this.scene.pause();
};

// ----- Orientation and Force Algorithms -----

const rayTrace = <T extends Traceable>(
  dude: Dude,
  traceables: T[],
  scene: Phaser.Scene
) => {
  const { x: dudeX, y: dudeY } = dude.getBody();

  const visible = traceables.filter(element => {
    const { position } = element;

    const currentDist = Math.sqrt(
      (position.x - dudeX) * (position.x - dudeX) +
        (position.y - dudeY) * (position.y - dudeY)
    );

    //always remember the door
    if (element.type !== "door" && currentDist > dude.visualRange) {
      return false;
    }

    const ray = new Phaser.Geom.Line(dudeX, dudeY, position.x, position.y);

    const intersect = wallShape.find(wall =>
      Phaser.Geom.Intersects.LineToRectangle(ray, wall)
    );

    //if the sight isn't intersected and the distance is shorter return the new one
    return intersect === undefined;
  });

  return visible;
};

const findClosestAttractiveTarget = (dude: Dude, scene: Phaser.Scene) => {
  const { x: dudeX, y: dudeY } = dude.getBody();

  // feedback when stuck. potential field
  const visible = rayTrace(dude, attractiveTargets, scene);

  //find the closest door/sign thats oriented in a way such that it's visible to the dude
  const closestOriented = visible.reduce(
    (best, element) => {
      const { position, orientation } = element;

      //check orientation
      if (
        orientation.x * (position.x - dudeX) +
          orientation.y * (position.y - dudeY) <
        0
      ) {
        const currentDist = Math.sqrt(
          (position.x - dudeX) * (position.x - dudeX) +
            (position.y - dudeY) * (position.y - dudeY)
        );

        //if the sight isn't intersected, the distance is shorter and it wasn't visited before return the new one
        return !dude.visitedTargets.includes(element.index) &&
          best.distance > currentDist
          ? { distance: currentDist, position }
          : best;
      }

      return best;
    },
    { distance: Number.MAX_VALUE, position: { x: -1, y: -1 } }
  ).position;

  const offset = dude.radius;

  if (closestOriented.x > 0) {
    const ray = scene.add
      .line(
        0,
        0,
        dudeX + offset,
        dudeY + offset,
        closestOriented.x,
        closestOriented.y,
        0xff0000,
        0.1
      )
      .setOrigin(0, 0);

    scene.tweens.add({
      targets: ray,
      alpha: { from: 1, to: 0 },
      ease: "Linear",
      duration: 100,
      repeat: 0,
      yoyo: false,
      onComplete: () => ray.destroy()
    });
  }

  return new Phaser.Math.Vector2({
    x: closestOriented.x,
    y: closestOriented.y
  });
};

const calculateForces = (scene: Phaser.Scene) => {
  //@ts-ignore
  const dudes: Dude[] = dudeGroup.children.getArray();
  const now = Date.now();

  const accelerations = new Array(dudes.length)
    .fill(null)
    .map(_ => new Phaser.Math.Vector2({ x: 0, y: 0 }));

  for (let i = 0; i < dudes.length; i++) {
    //calculate push force on every agent from the nearest piece of wall

    const dudeBody = dudes[i].getBody();
    //const wallDebuggingLines = scene.add.group();

    /*const {
      distance: closestWallDistance,
      wall: closestWall
    } = wallShape.reduce(
      (bestResult, wall) => {
        const distance = distanceToLineSegment(
          { x: dudeBody.x, y: dudeBody.y },
          wall,
          wall[1]
        );

        if (distance < bestResult.distance) {
          return { distance, wall };
        }

        return bestResult;
      },
      {
        distance: Number.MAX_VALUE,
        wall: [
          { x: 0, y: 0 },
          { x: 0, y: 0 }
        ]
      }
    );

    //if the wall is far away, that's okay. ALSO CHECK WHETHER THE DUDE IS IN FRONT OF THE WALL (easy for rectangular walls)
    if (
      closestWallDistance < CONSTANTS.ACCEPTABLE_WALL_DISTANCE &&
      ((closestWall[0].x <= dudeBody.x && closestWall[1].x >= dudeBody.x) ||
        (closestWall[0].y <= dudeBody.y && closestWall[1].y >= dudeBody.y))
    ) {
      //vector perpendicular to the wall
      const wallRepulsion = new Phaser.Math.Vector2({
        y: closestWall[1].x - closestWall[0].x,
        x: -(closestWall[1].y - closestWall[0].y)
      }).normalize();

      if (!isLeftOfLine(dudeBody.position, closestWall[0], closestWall[1])) {
        wallRepulsion.negate();
      }
      accelerations[i].add(
        wallRepulsion.scale(
          CONSTANTS.WALL_REPULSION_FORCE / closestWallDistance
        )
      );
    }*/

    //calculate directioncorrecting force
    const desiredVelocity = dudes[i].maxVelocity;
    const dudePosition = { x: dudes[i].x, y: dudes[i].y };

    //check if the dude isn't already tracking a path or hasn't recalculated it's path for half a second
    if (dudes[i].path === null || now - dudes[i].pathTimestamp > 500) {
      //check if he see's a sign
      const sign = findClosestAttractiveTarget(dudes[i], scene);

      //calculate here the desired velocity from the target value only if we have a target
      if (sign.x > 0) {
        const path = navmesh.findPath({ x: dudes[i].x, y: dudes[i].y }, sign);
        dudes[i].path = path;
        dudes[i].pathTimestamp = now;
      } else {
        //do random stuff / generate a random path
      }
    }

    if (dudes[i].path !== null) {
      //follow the path that is just an array of points, find the two closest and take the one with the higher index
      let closestPoint: { x: number; y: number } = dudes[i].path[0];
      let closestPointDistance = dist2(closestPoint, dudePosition);
      let closestPointIndex = 0;

      let secondClosestPoint = { x: 0, y: 0 };
      let secondClosestPointDistance = Number.MAX_VALUE;
      let secondClosestPointIndex = -1;

      for (let j = 1; j < dudes[i].path.length; j++) {
        const p: { x: number; y: number } = dudes[i].path[j];
        const d = dist2(p, dudePosition);
        if (d < closestPointDistance) {
          secondClosestPoint = closestPoint;
          secondClosestPointDistance = closestPointDistance;
          secondClosestPointIndex = closestPointIndex;

          closestPoint = p;
          closestPointDistance = d;
          closestPointIndex = j;
        } else if (d < secondClosestPointDistance) {
          secondClosestPoint = p;
          secondClosestPointDistance = d;
          secondClosestPointIndex = j;
        }
      }
      const nextPoint =
        closestPointIndex > secondClosestPointIndex
          ? closestPoint
          : secondClosestPoint;

      const ray = scene.add
        .line(
          0,
          0,
          dudePosition.x,
          dudePosition.y,
          nextPoint.x,
          nextPoint.y,
          0x00ff00,
          0.1
        )
        .setOrigin(0, 0);

      scene.tweens.add({
        targets: ray,
        alpha: { from: 1, to: 0 },
        ease: "Linear",
        duration: 100,
        repeat: 0,
        yoyo: false,
        onComplete: () => ray.destroy()
      });

      accelerations[i].add(
        new Phaser.Math.Vector2(nextPoint.x, nextPoint.y)
          .subtract(dudes[i].getBody().position)
          .normalize()
          .scale(desiredVelocity)
          .subtract(dudes[i].getBody().velocity) // subtract current velocity
          .scale(dudes[i].normalizedFitness / dudes[i].normalizedWeight) //reaction time
      );
    }

    //calculate repulison between dudes and all visible fires
    let visibleFires = rayTrace(dudes[i], repulsiveTargets, scene);
    let repulsionSum = new Phaser.Math.Vector2(0, 0);
    let repulsion = new Phaser.Math.Vector2(0, 0);

    visibleFires.forEach(fire => {
      repulsion.x = dudeBody.x - fire.position.x;
      repulsion.y = dudeBody.y - fire.position.y;
      let len = repulsion.length();
      repulsion.normalize().scale(FIRE_REPULSION * (Math.exp(1 / len) - 1));
      repulsionSum.add(repulsion);
    });
    accelerations[i].add(repulsionSum);

    dudeBody.velocity.scale(DUDE_WALKING_FRICTION);

    //calculate repulsion and attraction between dudes, start at j=i+1 to prevent doing it twice
    for (let j = i + 1; j < dudes.length; j++) {
      const dude1 = dudes[i],
        dude2 = dudes[j];

      const distance = dude1
        .getBody()
        .position.distance(dude2.getBody().position);

      //the smaller the distance the bigger the force
      //the bigger the distance the smaller the force
      //force ~ e^{-distance} = 1/(e^{distance}) (exponentially falling with distance)
      //OR => force ~ e^{1/distance} => exponentially increasing with small distances

      const pushingForce =
        distance > 50
          ? 0
          : CONSTANTS.DUDE_REPULSION_LINEAR *
            Math.exp(CONSTANTS.DUDE_REPULSION_EXPONENTIAL / distance);

      //the bigger the distance the smaller the pulling force
      const pullingForce = CONSTANTS.DUDE_GROUP_ATTRACTION / distance;

      const force = pushingForce - pullingForce;

      const directionForDude1 = dude1
        .getBody()
        .position.clone()
        .subtract(dude2.getBody().position)
        .normalize();

      accelerations[i].add(
        directionForDude1.clone().scale(force / dude1.normalizedWeight)
      );
      accelerations[j].add(
        directionForDude1.negate().scale(force / dude2.normalizedWeight)
      );
    }
  }

  accelerations.forEach((acceleration, index) =>
    dudes[index].getBody().setAcceleration(acceleration.x, acceleration.y)
  );
};

/*// If a dude gets stuck this function helps out
const unstuckDudes = () => {
  dudeGroup.children.getArray().forEach((dude: Dude) => {
    const curr = dude.getBody();
    const sign = dude.getSign();
    let accelerationVector = curr.acceleration;
    // Check if dude is currently too slow and he observes a force, e.g. she/he/it is stuck
    if (
      curr.speed < SPEED_THRESHOLD &&
      accelerationVector.length() > ACCELERATION_THRESHOLD
    ) {
      const changeDirection = new Phaser.Math.Vector2(
        accelerationVector.y,
        -accelerationVector.x
      ).normalize();
      // Check for the direction of the acceleration vector
      if (Math.abs(accelerationVector.x) < Math.abs(accelerationVector.y)) {
        // Negate the acceleration vector if it is in the 1. or 3. quadrant of the coordinate system
        if (
          (curr.x < sign.x && curr.y < sign.y) ||
          (curr.x > sign.x && curr.y > sign.y)
        ) {
          changeDirection.negate();
        }
      } else {
        // Negate the acceleration vector if it is in the 2. or 4. quadrant of the coordinate system
        if (
          (curr.x > sign.x && curr.y < sign.y) ||
          (curr.x > sign.x && curr.y < sign.y)
        ) {
          changeDirection.negate();
        }
      }
      changeDirection.scale(ACCELERATION_VALUE);
      // Help dude out of stuckness
      //curr.velocity.add(changeDirection);
      curr.acceleration.add(changeDirection);
    }
  });
};*/

const updateTimer = function() {
  currentElapsedTime = (game.getTime() - currentStartTime) / 1000;
  let totalElapsedTime = previousElapsedTime + currentElapsedTime;

  let minutes = Math.floor(totalElapsedTime / 60);
  let seconds = Math.floor(totalElapsedTime) - 60 * minutes;
  //Display minutes, add a 0 to the start if less than 10
  let result = minutes < 10 ? "0" + minutes : minutes;

  //Display seconds, add a 0 to the start if less than 10
  result += seconds < 10 ? ":0" + seconds : ":" + seconds;

  timeLabel.text = result.toString();
};

// ----- Phaser initialization functions -----

const update = function(this: Phaser.Scene) {
  if (totalNumberOfDudes == numberOfDeadDudes + numberOfSurvivorDudes) {
    this.scene.pause();
  }
  calculateForces(this);
  //unstuckDudes();
  updateTimer();
};

const scene: CreateSceneFromObjectConfig = {
  preload: preload,
  create: create,
  update: update
};

const config: GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: map.width,
  height: map.height,
  scene,
  plugins: {
    scene: [
      {
        key: "NavMeshPlugin",
        plugin: PhaserNavMeshPlugin,
        mapping: "navMeshPlugin",
        start: true
      }
    ]
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      fps: 30
    }
  },
  backgroundColor: 0xffffff
};

export let game: Phaser.Game = null;

export const initGame = () => {
  game = new Phaser.Game(config);
};

document.addEventListener("DOMContentLoaded", onDOMReadyControlSetup);

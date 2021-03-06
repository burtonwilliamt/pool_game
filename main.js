//Aliases
const Application = PIXI.Application,
  loader = PIXI.Loader.shared,
  resources = PIXI.Loader.shared.resources,
  Graphics = PIXI.Graphics,
  Container = PIXI.Container,
  Sprite = PIXI.Sprite,
  Text = PIXI.Text,
  TextStyle = PIXI.TextStyle;

const app = new Application({
  width: 960,
  height: 512,
  antialias: true,
  transparent: false,
  resolution: 1
}
);
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoDensity = true;
app.resizeTo = window;

document.body.appendChild(app.view);

// Main game state.
const state = {
  currentMode: aim,
  tink: null,
  pointer: null,
  cueBall: null,
  cue: null,
  cueLine: null,
}

// ***************Utility functions******************
function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

function setupObjPhysics(obj) {
  obj.vAngle = 0;
  obj.v = 0;
  obj.dv = 0;
  obj.tableDrag = 0;
}

function updateObjPhysics(obj) {
  // drag equation:
  // F_d = 1/2 * p * u^2 * c_d * A
  // F_d = Drag force
  // p = mass density
  // u = flow velocity
  // c_d = drag coefficient
  // A = reference area

  // We're just going to combine all those constants
  // 0.5 * p * c_d * A = tableDrag

  // Our simplified equation:
  // F_d = tableDrag * u^2

  // actually, it seems to handle better when it's just proportional to speed
  // F_d = tableDrag * u
  const drag = obj.tableDrag * obj.v;

  obj.v += obj.dv - drag;
  if (obj.dv === 0 && Math.abs(obj.v) < 0.1) {
    obj.v = 0;
  }
  obj.x += obj.v * Math.cos(obj.vAngle);
  obj.y += obj.v * Math.sin(obj.vAngle);
}

function stopMoving(obj) {
  obj.v = 0;
  obj.dv = 0;
}

function isMoving(obj) {
  return (obj.v !== 0 || obj.dv !== 0);
}



// ***************Graphics functions******************
function graphicsSetup() {
  state.targetContainer = new Container();
  app.stage.addChild(state.targetContainer);
}

function drawRectangle(x, y, width, height, color) {
  const rect = new Graphics();
  rect.beginFill(color);
  rect.drawRect(0, 0, width, height);
  rect.endFill();
  rect.x = x;
  rect.y = y;
  return rect;
}

function drawCircle(x, y, radius, color) {
  const circ = new Graphics();
  circ.beginFill(color);
  circ.drawCircle(0, 0, radius);
  circ.endFill();
  circ.x = x;
  circ.y = y;
  return circ;
}

function drawText(x, y, content) {
  txt = new Text(content, new TextStyle({ fill: "#ffffff" }));
  txt.position.set(x, y);
  return txt;
}

function drawSprite(x, y, width, height, imagePath) {
  sprt = new Sprite(resources[imagePath].texture);
  sprt.width = width;
  sprt.height = height;
  sprt.x = x;
  sprt.y = y;
  return sprt;
}

function createBall(x, y, color) {
  const ball = drawCircle(x, y, 16, color);
  setupObjPhysics(ball);
  ball.tableDrag = 0.02;
  return ball;
}


// ***************Game logic functions******************

function tableSetup() {
  state.cueBall = createBall(480, 256, "0xffffff");
  state.cueBall;
  app.stage.addChild(state.cueBall);
}

function createCue() {
  state.cue = drawRectangle(0, 0, 400, 10, "0xBA8C63");
  state.cue.pivot.set(0, state.cue.height / 2);
  setupObjPhysics(state.cue);
  app.stage.addChild(state.cue);
}

function cueBallCueAngle() {
  const relx = state.cueBall.x - state.cue.x,
    rely = state.cueBall.y - state.cue.y;
  return Math.atan2(rely, relx) + Math.PI;
}

function aimCue() {
  state.cue.position.set(state.pointer.x, state.pointer.y);
  const angle = cueBallCueAngle()
  state.cue.rotation = angle;
  state.cue.vAngle = angle - Math.PI;
}

function startCuePush() {
  const distanceFromBall = distance(state.cueBall.x, state.cueBall.y, state.cue.x, state.cue.y),
    acceleration = distanceFromBall/100;
  state.cue.dv = acceleration;
  state.cue.v = 0;
}

function updateCuePhysics() {
  if (state.cue === null) {
    return;
  }
  const angle = cueBallCueAngle(),
    contactX = Math.cos(angle) * (state.cueBall.width / 2) + state.cueBall.x,
    contactY = Math.sin(angle) * (state.cueBall.width / 2) + state.cueBall.y,
    distanceToContact = distance(state.cue.x, state.cue.y, contactX, contactY);

  if (state.cue.v >= distanceToContact) {
    state.cueBall.v = state.cue.v;
    state.cueBall.vAngle = state.cue.vAngle;
    state.cue.x = contactX;
    state.cue.y = contactY;
    stopMoving(state.cue);
    return;
  }
  updateObjPhysics(state.cue);
}

function updatePhysics() {
  updateCuePhysics();
  updateObjPhysics(state.cueBall);
}

// ***************Game Loop functions******************
function hit(delta) {
  updatePhysics();
  if (!isMoving(state.cueBall) && !isMoving(state.cue)) {
    state.currentMode = aim;
    state.cue.destroy();
    state.cue = null;
  }
}

function aim(delta) {
  if (state.pointer.isDown) {
    if (state.cue === null) {
      createCue();
    }
    aimCue();
  } else if (state.pointer.isUp && state.cue !== null) {
    startCuePush();
    state.currentMode = hit;
  }
}

function gameLoop(delta) {
  // Execute a step for whatever mode we're in.
  state.currentMode(delta);
  state.tink.update();
}

function pointerSetup() {
  state.tink = new Tink(PIXI, app.renderer.view);
  state.pointer = state.tink.makePointer();
  state.pointer.visible = true;
}

function dustSetup() {
  state.dust = new Dust(PIXI);
}

function setup() {
  graphicsSetup();
  pointerSetup();
  dustSetup();
  tableSetup();
  app.ticker.add((delta) => gameLoop(delta));
}

//load an image and run the `setup` function when it's done
loader
  .load(setup);

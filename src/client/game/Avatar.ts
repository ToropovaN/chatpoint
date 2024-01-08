import {
  ActionManager,
  AnimationGroup,
  ExecuteCodeAction,
  Mesh,
  Quaternion,
  Ray,
  TransformNode,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import { Player, ServerPlayer } from "./Player";
import { AvatarInput } from "./AvatarInput";
import { Environment } from "./Environment";
import { sendPosition } from "../client";

export class Avatar extends Player {
  private _tick;

  public camera;
  private _camRoot: TransformNode;

  private _input;

  // animation trackers
  private _isFalling: boolean = false;
  private _jumped: boolean = false;

  //const values
  private static readonly PLAYER_SPEED: number = 13;
  private static readonly JUMP_FORCE: number = 1.3;
  private static readonly GRAVITY: number = -3;

  //player movement vars
  private _deltaTime: number = 0;
  private _h: number;
  private _v: number;

  private _moveDirection: Vector3 = new Vector3();
  private _inputAmt: number;

  private _currMapSector = 0;
  private _fadeScreen;

  //gravity, ground detection, jumping
  private _gravity: Vector3 = new Vector3();
  private _lastGroundPos: Vector3 = Vector3.Zero(); // keep track of the last grounded position
  private _grounded: boolean;
  private _jumpCount: number = 1;

  private _environment = null;

  public currentEmotion = null;

  constructor(player: ServerPlayer | Player, environment) {
    super(player);
    this._environment = environment;
    this._setUpAvatarCamera();
    this._fadeScreen = document.querySelector(".fadeScreen");
    this.mesh.rotationQuaternion = new Quaternion(0, 0, 0, 1);

    this.mesh.checkCollisions = true;
    //--COLLISIONS--
    this.mesh.actionManager = new ActionManager(this.scene);
    //World ground detection
    //if player falls through "world", reset the position to the last safe grounded position
    this.mesh.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnIntersectionEnterTrigger,
          parameter: this.scene.getMeshByName("ground"),
        },
        () => {
          this.mesh.position.copyFrom(this._lastGroundPos); // need to use copy or else they will be both pointing at the same thing & update together
        }
      )
    );
  }

  private _setUpAvatarCamera() {
    this._camRoot = new TransformNode("root");
    this._camRoot.position = new Vector3(0, 0.5, 0); //initialized at (0,0.5,0)
    //to face the player from behind (180 degrees)
    this._camRoot.rotation = new Vector3((25 * Math.PI) / 180, Math.PI, 0);

    //our actual camera that's pointing at our root's position
    this.camera = new UniversalCamera(
      "cam",
      new Vector3(0, 0, -45),
      this.scene
    );
    this.camera.lockedTarget = this._camRoot.position;
    this.camera.fov = 0.65;
    this.camera.parent = this._camRoot;
    this.camera.minZ = -10;

    this.scene.activeCamera = this.camera;

    return this.camera;
  }

  public activateAvatarCamera(): UniversalCamera {
    this.scene.registerBeforeRender(() => {
      this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
      this._updateFromControls();
      this._updateGroundDetection();
      this._setAvatarAnimation();
      this._camRoot.position = Vector3.Lerp(
        this._camRoot.position,
        new Vector3(
          this.mesh.position.x,
          this.mesh.position.y + 6,
          this.mesh.position.z - 4
        ),
        0.4
      );

      // Cam Rotation
      if (this._camRoot.position.y > 18) this._camRoot.position.y = 18; // камера не бывает выше потолка
      if (
        this._currMapSector === 0 &&
        this._camRoot.position.z > 45 &&
        this._camRoot.position.z < 75 &&
        this.mesh.position.x < -43
      ) {
        // камера отлетает у ближней стены
        this._camRoot.rotation.x = this.mesh.position.z / 112;
      } else this._camRoot.rotation.x = (25 * Math.PI) / 180;

      console.log(this.mesh.position);
      if (this.mesh.position.z < 23.5) {
        if (
          this.mesh.position.x < -61 ||
          this.mesh.position.x > 20.4
          //this.mesh.position.z > -3.4 || // центральный блок
          //(this.mesh.position.x < 17 && this.mesh.position.z > 9.8) || // кухня
          //(this.mesh.position.x > 30 && this.mesh.position.z < -20) // кабинет
        ) {
          if (this._currMapSector !== 0) this.animateCamRot(0);
        }

        //this.mesh.position.z > 3.4
        else if (this._currMapSector !== 1) this.animateCamRot(1);
      }
      if (this.mesh.position.z > 23.5) {
        if (
          (this.mesh.position.x < -43 || this.mesh.position.x > 20.4) &&
          this._currMapSector !== 0
        )
          this.animateCamRot(0);
        //else if (this.mesh.position.x > -43 && this._currMapSector !== 1)
        // this.animateCamRot(1);
      }

      if (this._currMapSector === 0) this._camRoot.rotation.y = Math.PI;
      if (this._currMapSector === 1) this._camRoot.rotation.y = -1.5 * Math.PI;
    });
    return this.camera;
  }

  private animateCamRot = (newMapSector) => {
    this._fadeScreen.classList.remove("fadeScreen-hidden");
    const fadeTimeout = setTimeout(() => {
      this._currMapSector = newMapSector;
      this._fadeScreen.classList.add("fadeScreen-hidden");
    }, 200);
  };

  public activateAvatarInput(mobileInput = null): void {
    this._input = new AvatarInput(this.scene, mobileInput);
  }

  private _updateFromControls(): void {
    this._moveDirection = Vector3.Zero();

    if (this.currentEmotion) {
      this._h = 0;
      this._v = 0;
      this._input.horizontalAxis = 0;
      this._input.verticalAxis = 0;
    } else {
      this._h = this._input.horizontal; //right, x
      this._v = this._input.vertical; //fwd, z
    }

    //--MOVEMENTS BASED ON CAMERA (as it rotates)--
    let fwd = this._camRoot.forward;
    let right = this._camRoot.right;
    let correctedVertical = fwd.scaleInPlace(this._v);
    let correctedHorizontal = right.scaleInPlace(this._h);

    //movement based off of camera's view
    let move = correctedHorizontal.addInPlace(correctedVertical);

    //clear y so that the character doesnt fly up, normalize for next step
    this._moveDirection = new Vector3(
      move.normalize().x,
      0,
      move.normalize().z
    );

    //clamp the input value so that diagonal movement isn't twice as fast
    let inputMag = Math.abs(this._h) + Math.abs(this._v);
    if (inputMag < 0) {
      this._inputAmt = 0;
    } else if (inputMag > 1) {
      this._inputAmt = 1;
    } else {
      this._inputAmt = inputMag;
    }

    //final movement that takes into consideration the inputs
    this._moveDirection = this._moveDirection.scaleInPlace(
      this._inputAmt * Avatar.PLAYER_SPEED * this._deltaTime
    );

    //check if there is movement to determine if rotation is needed
    let input = new Vector3(
      this._input.horizontalAxis,
      0,
      this._input.verticalAxis
    ); //along which axis is the direction
    if (input.length() == 0) {
      //if there's no input detected, prevent rotation and keep player in same rotation
      return;
    }

    //rotation based on input & the camera angle
    let angle = Math.atan2(
      this._input.horizontalAxis,
      this._input.verticalAxis
    );
    angle += this._camRoot.rotation.y;
    let targ = Quaternion.FromEulerAngles(0, angle, 0);
    this.mesh.rotationQuaternion = Quaternion.Slerp(
      this.mesh.rotationQuaternion,
      targ,
      10 * this._deltaTime
    );

    this._environment.setOpacityFromAvatarPos(this.mesh.position);
  }

  //--GROUND DETECTION--
  //Send raycast to the floor to detect if there are any hits with meshes below the character
  private _floorRaycast(
    offsetx: number,
    offsetz: number,
    raycastlen: number
  ): Vector3 {
    //position the raycast from bottom center of mesh
    let raycastFloorPos = new Vector3(
      this.mesh.position.x + offsetx,
      this.mesh.position.y + 0.5,
      this.mesh.position.z + offsetz
    );
    let ray = new Ray(raycastFloorPos, Vector3.Up().scale(-1), raycastlen);
    //defined which type of meshes should be pickable
    let predicate = function (mesh) {
      return mesh.isPickable && mesh.isEnabled();
    };
    let pick = this.scene.pickWithRay(ray, predicate);
    if (pick.hit) {
      //grounded
      return pick.pickedPoint;
    } else {
      //not grounded
      return Vector3.Zero();
    }
  }

  //raycast from the center of the player to check for whether player is grounded
  private _isGrounded(): boolean {
    if (this._floorRaycast(0, 0, 0.6).equals(Vector3.Zero())) {
      return false;
    } else {
      return true;
    }
  }

  private _updateGroundDetection(): void {
    //if not grounded
    if (!this._isGrounded()) {
      this._gravity = this._gravity.addInPlace(
        Vector3.Up().scale(this._deltaTime * Avatar.GRAVITY)
      );
      this._grounded = false;
      this._isFalling = false;
      setTimeout(() => {
        this._jumpCount = 0;
      }, 200);
    }
    //limit the speed of gravity to the negative of the jump power
    if (this._gravity.y < -Avatar.JUMP_FORCE) {
      this._gravity.y = -Avatar.JUMP_FORCE;
    }

    //cue falling animation once gravity starts pushing down
    if (this._gravity.y < 0 && this._jumped) {
      this._isFalling = true;
    }

    let vectorUp;
    vectorUp =
      this._gravity.y > 0
        ? Vector3.Up().scale(this._deltaTime * 15)
        : Vector3.Up().scale(this._deltaTime * -15);
    if (this._gravity.y == 0) {
      vectorUp = Vector3.Up().scale(0);
    }
    this.mesh.moveWithCollisions(this._moveDirection.addInPlace(vectorUp));
    if (this._isGrounded()) {
      this._gravity.y = 0;
      this._grounded = true;
      this._lastGroundPos.copyFrom(this.mesh.position);

      this._jumpCount = 1; //allow for jumping

      //jump & falling animation flags
      this._jumped = false;
      this._isFalling = false;
    }

    //Jump detection
    if (this._input.jumpKeyDown && this._jumpCount > 0) {
      this._gravity.y = Avatar.JUMP_FORCE;
      this._jumpCount--;

      //jumping and falling animation flags
      this._jumped = true;
      this._isFalling = false;
    }
  }

  private _setAvatarAnimation(): void {
    // idle - 0; run - 1; jump - 2; land - 3;
    if (this.currentEmotion) this.currentAnim = this.currentEmotion;
    else {
      if (
        !this._isFalling &&
        !this._jumped &&
        (this._input.inputMap[87] ||
          this._input._mobileInput["Up"] ||
          this._input.inputMap[83] ||
          this._input._mobileInput["Down"] ||
          this._input.inputMap[65] ||
          this._input._mobileInput["Left"] ||
          this._input.inputMap[68] ||
          this._input._mobileInput["Right"])
      ) {
        this.currentAnim = 1;
      } else if (this._jumped && !this._isFalling) {
        this.currentAnim = 2;
      } else if (!this._isFalling && this._grounded) {
        this.currentAnim = 0;
      } else if (this._isFalling) {
        this.currentAnim = 3;
      }
    }
    this.animatePlayer();
  }

  /*
    public setCurrentEmotion(emotionNum, button) {
        this.currentEmotion = emotionNum;
        button.className = "emotions__button emotions__button-active";
        if (this.emotionTimeout) {
            clearTimeout(this.emotionTimeout);
        }
        this.emotionTimeout = setTimeout(() => {
            this.currentEmotion = null;
            button.className = "emotions__button"
        }, this.emotionTime);
    }*/

  public stopMoving() {
    this._input.clearInputs();
  }

  public startSendingPosition() {
    this._tick = setInterval(() => {
      sendPosition(
        this.mesh.position.x,
        this.mesh.position.y,
        this.mesh.position.z,
        this.mesh.rotationQuaternion.w,
        this.mesh.rotationQuaternion.y,
        this.currentAnim
      );
    }, 10);
  }
  public stopSendingPosition() {
    clearInterval(this._tick);
  }
}

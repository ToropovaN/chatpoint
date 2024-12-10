import {
  Scene,
  ActionManager,
  ExecuteCodeAction,
  Observer,
  Scalar,
  Mesh,
} from "@babylonjs/core";

export class AvatarInput {
  public inputMap: any;
  //simple movement
  public horizontal: number = 0;
  public vertical: number = 0;

  //tracks whether or not there is movement in that axis
  public horizontalAxis: number = 0;
  public verticalAxis: number = 0;

  private _mobileInput;

  //jumping and dashing
  public jumpKeyDown: boolean = false;
  public runKeyDown: boolean = false;

  constructor(scene: Scene, mobileInput) {
    this._mobileInput = mobileInput;

    scene.actionManager = new ActionManager(scene);

    this.inputMap = {};
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
        this.inputMap[evt.sourceEvent.keyCode] =
          evt.sourceEvent.type == "keydown";
      })
    );
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
        this.inputMap[evt.sourceEvent.keyCode] =
          evt.sourceEvent.type == "keydown";
      })
    );

    scene.onBeforeRenderObservable.add(() => {
      this._updateFromKeyboard();
    });
  }

  private _updateFromKeyboard(): void {
    if (this.inputMap[87] || this._mobileInput["Up"]) {
      this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
      this.verticalAxis = 1;
    } else if (this.inputMap[83] || this._mobileInput["Down"]) {
      this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
      this.verticalAxis = -1;
    } else {
      this.vertical = 0;
      this.verticalAxis = 0;
    }

    if (this.inputMap[65] || this._mobileInput["Left"]) {
      this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
      this.horizontalAxis = -1;
    } else if (this.inputMap[68] || this._mobileInput["Right"]) {
      this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
      this.horizontalAxis = 1;
    } else {
      this.horizontal = 0;
      this.horizontalAxis = 0;
    }

    //Run Checks (SHIFT)
    if (this.inputMap[16]) {
      this.runKeyDown = true;
    } else {
      this.runKeyDown = false;
    }

    //Jump Checks (SPACE)
    if (this.inputMap[32] || this._mobileInput["Jump"]) {
      this.jumpKeyDown = true;
    } else {
      this.jumpKeyDown = false;
    }
  }

  public clearInputs() {
    this.inputMap[87] = null;
    this.inputMap[83] = null;
    this.inputMap[65] = null;
    this.inputMap[68] = null;
  }
}

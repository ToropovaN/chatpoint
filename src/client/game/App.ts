import { mySocketId } from "../client";
import "@babylonjs/loaders/glTF";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Color4,
  SceneLoader,
  MeshBuilder,
  Matrix,
  Mesh,
  AnimationGroup,
  AbstractMesh,
  StandardMaterial,
  Color3,
  Animation,
  CubeTexture,
  Texture,
} from "@babylonjs/core";
import { AppInterface } from "./AppInterface";
import { Avatar } from "./Avatar";
import { AvatarPlayer, Player, Players } from "./Player";
import { Constructor } from "./Constructor";
import { Environment } from "./Environment";

import { getCurrentState } from "../client";

enum State {
  MENU = 0,
  GAME = 1,
}

class App {
  private _avatar: Avatar;
  private _avatarOuter: AbstractMesh;

  private _constructor: Constructor;

  //private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;

  private _environment: Environment;

  private _interface: AppInterface;

  //Scene - related
  public state: number = 0;
  private _gameScene: Scene;
  private _menuScene: Scene;

  constructor() {
    this._canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this._engine = new Engine(this._canvas, true);

    const loaderScreen = document.querySelector(".loaderScreen") as HTMLElement;

    this._engine.displayLoadingUI = () => {
      loaderScreen.style.opacity = "1";
      loaderScreen.style.display = "flex";
    };

    this._engine.hideLoadingUI = () => {
      loaderScreen.style.opacity = "0";
      const waitTransition = setTimeout(() => {
        loaderScreen.style.display = "none";
      }, 1000);
    };

    //this._scene = new Scene(this._engine);
    this._interface = new AppInterface();
    //this._canvas.addEventListener('resize', this.resizeEngine);
    window.addEventListener("resize", (e) => {
      if (this._engine) this._engine.resize();
    });
    window.onload = () => {
      this._engine.resize();
    };
    this._main();

    window.addEventListener("keydown", (e) => {
      let trg = e.target as HTMLElement;
      if (e.key === " " && trg.tagName.toUpperCase() !== "INPUT") {
        e.preventDefault();
      }
    });

    this._canvas.addEventListener("blur", (e) => {
      if (this._avatar) {
        this._avatar.stopMoving();
      }
    });
  }

  private async _goToMenu() {
    if (this._gameScene) {
      this._gameScene.detachControl();
    }

    this._interface.removeGameInterface();

    if (this._avatar) {
      this._interface.removeEmotionsPnl();
      this._avatar.deleteModel();
      this._avatar.stopSendingPosition();
    }
    this._engine.displayLoadingUI(); //make sure to wait for start to load
    //this._scene.detachControl();
    if (this._gameScene) this._gameScene.detachControl();
    this._menuScene = new Scene(this._engine);

    const menuSkybox = MeshBuilder.CreateSphere(
      "MenuSkybox",
      { diameter: 60 },
      this._menuScene
    );
    //const mesh = MeshBuilder.CreateBox();
    const menuSkyboxMaterial = new StandardMaterial(
      "MenuSkybox",
      this._menuScene
    );
    menuSkybox.material = menuSkyboxMaterial;
    menuSkyboxMaterial.backFaceCulling = false;
    menuSkyboxMaterial.reflectionTexture = new CubeTexture(
      "textures/MenuSkybox",
      this._menuScene
    );
    menuSkyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    menuSkyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    menuSkyboxMaterial.specularColor = new Color3(0, 0, 0);
    menuSkybox.material = menuSkyboxMaterial;
    menuSkybox.rotation.y = Math.PI / 1.2;

    this._menuScene.clearColor = new Color4(1, 1, 1, 1);

    let camera = new ArcRotateCamera(
      "camera1",
      Math.PI / 2,
      Math.PI / 2.5,
      17.5,
      new Vector3(0, 2.5, 0),
      this._menuScene
    );
    camera.attachControl(this._canvas, false);
    camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;
    camera.lowerBetaLimit = camera.beta - 30 * (Math.PI / 180); //30deg
    camera.upperBetaLimit = camera.beta + 30 * (Math.PI / 180);

    let light1: HemisphericLight = new HemisphericLight(
      "light1",
      //new Vector3(1, 1, 0),
      new Vector3(0, 0.5, 0.4),
      this._menuScene
    );
    this._menuScene.beforeRender = () => {
      camera.alpha -= 0.002;
    };

    //--SCENE FINISHED LOADING--
    await this._menuScene.whenReadyAsync();
    if (this._gameScene) {
      this._gameScene.meshes.forEach((m) => {
        m.dispose(false, true);
      });
      this._gameScene.dispose();
    }
    //this._scene = this._menuScene;
    this.state = State.MENU;

    if (this._constructor) {
      this._constructor.updScene(this._menuScene);
      await this._constructor.importMesh().then(() => {
        this._constructor.addConstructorInterface();
      });
    } else {
      this._constructor = new Constructor(this._menuScene, this._interface);
      await this._constructor.addConstructorCards().then(() => {
        this._constructor.addConstructorInterface();
      });
    }

    this._interface.addMenuInterface();

    this._interface.lockLoginBtn();
    await this._setUpGame().then(() => {
      this._interface.unlockLoginBtn();
      this._engine.hideLoadingUI();
    });
  }

  private async _setUpGame() {
    //--CREATE SCENE--
    this._gameScene = new Scene(this._engine);

    this._environment = new Environment(this._gameScene);

    //Load environment
    await this._environment.load();
  }

  private async _goToGame() {
    if (this._menuScene) this._menuScene.detachControl();
    this._engine.displayLoadingUI(); //make sure to wait for start to load
    this._constructor.removeConstructorInterface();
    this._avatar = new Avatar(AvatarPlayer, this._environment);
    await this._avatar.loadModel().then(() => {
      this._avatarOuter = this._gameScene.getMeshByName(`${mySocketId}`);
      this._avatarOuter.position = this._gameScene
        .getTransformNodeByName("startPosition")
        .getAbsolutePosition();
      this._avatar.activateAvatarCamera();
      this._avatar.activateAvatarInput(this._interface.mobileInput);
      this._avatar.startSendingPosition();
      this._interface.addEmotionsPnl(this._avatar);
    });
    //this._menuScene.detachControl();
    let scene = this._gameScene;
    scene.clearColor = new Color4(0, 0, 0); // a color that fit the overall color scheme better
    let light0 = new HemisphericLight(
      "HemiLight",
      new Vector3(-0.5, 1, -0.4),
      scene
    );
    let light1 = new HemisphericLight(
      "HemiLight",
      new Vector3(0.7, 1, 1),
      scene
    );
    light0.intensity = 0.62;
    light1.intensity = 0.62;
    light0.specular = new Color3(0.55, 0.55, 0.55);
    light1.specular = new Color3(0.55, 0.55, 0.55);

    //--WHEN SCENE FINISHED LOADING--
    await scene.whenReadyAsync();
    if (this._menuScene) {
      this._menuScene.meshes.forEach((m) => {
        m.dispose(false, true);
      });
      this._menuScene.dispose();
    }
    this.state = State.GAME;
    //this._scene = scene;
    this._engine.hideLoadingUI();

    this._interface.removeMenuInterface();
    this._interface.addGameInterface();

    //the game is ready, attach control back
    //this._menuScene.attachControl();
  }
  public async AfterGoToGame() {
    await this._goToGame();
  }
  public async AfterGoToMenu() {
    await this._goToMenu();
  }

  public getGameScene = () => this._gameScene;
  public getConstructor = () => this._constructor;
  public getAvatar = () => this._avatar;

  private async _main(): Promise<void> {
    this._interface.addGameInterface();
    await this._goToMenu();
    this._engine.runRenderLoop(() => {
      //console.log(this._engine.getFps().toFixed());
      switch (this.state) {
        case State.MENU:
          this._menuScene.render();
          break;
        case State.GAME:
          this._gameScene.render();
          getCurrentState();
          break;
      }
    });
  }
}

export const newApp = new App();

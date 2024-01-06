import { colorsSet } from "../client";
import {
  ActionManager,
  AnimationGroup,
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  SceneLoader,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  ColorPicker,
  Control,
  Rectangle,
  TextBlock,
} from "@babylonjs/gui";
import { newApp } from "./App";

const avatarWidth = 2.5;
const avatarDepth = 2.5;
const avatarHeight = 8;

export let Players: Player[] = [];
export let AvatarPlayer: null | ServerPlayer = null;

export class Player {
  public id: string = "";
  public name: string = "";
  public nameColor: number;
  public meshNums: number[];
  public colors: string[];

  public animations: AnimationGroup[] | null;

  public currentAnim: number;
  public prevAnim: number;

  public mesh: Mesh;
  public scene: Scene;

  private namePannelMesh: Mesh;
  private namePannelAT: AdvancedDynamicTexture;
  private namePannelContainer: Rectangle;
  private namePannelText: TextBlock;

  private msgPannelMesh: Mesh;
  private msgPannelAT: AdvancedDynamicTexture;
  private msgPannelContainer: Rectangle;
  private msgPannelText: TextBlock;

  private msgTimeout;

  constructor(sp: ServerPlayer) {
    this.scene = newApp.getGameScene();

    this.id = sp.id;
    this.name = sp.name;
    this.nameColor = sp.nameColor;
    this.meshNums = sp.meshNums;
    this.colors = sp.colors;

    this.animations = null;

    this.currentAnim = 0;
    this.prevAnim = 3;

    let oldMesh = this.scene.getMeshByName(`${this.id}`);
    if (oldMesh) {
      this.scene.removeMesh(oldMesh);
      oldMesh.dispose();
    }
    const outer = MeshBuilder.CreateBox(
      `${this.id}`,
      { width: avatarWidth, depth: avatarDepth, height: avatarHeight },
      this.scene
    );
    outer.isVisible = false;
    outer.isPickable = false;
    outer.checkCollisions = false;
    //move origin of box collider to the bottom of the mesh (to match imported player mesh)
    outer.bakeTransformIntoVertices(Matrix.Translation(0, avatarHeight / 2, 0));
    //for collisions
    outer.ellipsoid = new Vector3(1, 1.5, 1);
    outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

    this.namePannelMesh = MeshBuilder.CreatePlane(
      "namePannelMesh",
      { width: 9.375, height: 0.75 },
      this.scene
    );
    this.namePannelMesh.position.y = avatarHeight + 1.5;
    this.namePannelAT = AdvancedDynamicTexture.CreateForMesh(
      this.namePannelMesh,
      1000,
      80
    );
    this.namePannelContainer = new Rectangle("container");
    this.namePannelContainer.thickness = 0;
    this.namePannelContainer.height = "80px";
    this.namePannelContainer.width = (1000 / 25) * this.name.length + "px";
    this.namePannelAT.addControl(this.namePannelContainer);
    this.namePannelText = new TextBlock();
    this.namePannelText.fontFamily = "Neucha";
    this.namePannelText.fontWeight = "bold";
    this.namePannelText.color = colorsSet[this.nameColor];
    this.namePannelText.fontSize = 65;
    this.namePannelContainer.addControl(this.namePannelText);
    this.namePannelText.text = this.name;
    this.namePannelMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.namePannelMesh.parent = outer;
    this.namePannelMesh.isPickable = false;

    this.msgPannelMesh = MeshBuilder.CreatePlane(
      "msgPannelMesh",
      { width: 9.375, height: 3.75 },
      this.scene
    );
    this.msgPannelMesh.position.y = avatarHeight + 4;
    this.msgPannelAT = AdvancedDynamicTexture.CreateForMesh(
      this.msgPannelMesh,
      1000,
      400
    );
    this.msgPannelContainer = new Rectangle("msgСontainer");
    this.msgPannelContainer.thickness = 0;
    this.msgPannelContainer.height = "400px";
    this.msgPannelContainer.width = "1000px";
    this.msgPannelAT.addControl(this.msgPannelContainer);
    this.msgPannelText = new TextBlock();
    this.msgPannelText.fontFamily = "Neucha";
    this.msgPannelText.color = "white";
    this.msgPannelText.fontSize = 65;
    this.msgPannelContainer.addControl(this.msgPannelText);
    this.msgPannelText.fontWeight = "bold";
    this.msgPannelText.text = "";
    this.msgPannelMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.msgPannelMesh.parent = outer;
    this.msgPannelMesh.isPickable = false;

    this.mesh = outer;
    this.mesh.rotationQuaternion = new Quaternion(0, 0, 0, 0);
  }

  public async loadModel() {
    await SceneLoader.ImportMeshAsync(
      null,
      "./models/",
      "player.glb",
      this.scene
    ).then((charResult) => {
      //body is our actual player mesh
      for (let i = 1; i < charResult.meshes.length; i++) {
        let index = this.meshNums.indexOf(i);
        if (index < 0) charResult.meshes[i].dispose();
        else if (this.colors[index] && this.colors[index] !== "default") {
          const newMat = new StandardMaterial(
            charResult.meshes[i].name,
            this.scene
          );
          newMat.diffuseColor = Color3.FromHexString(this.colors[index]);
          newMat.specularColor = new Color3(0, 0, 0);
          charResult.meshes[i].material = newMat;
        }
      }

      const body = charResult.meshes[0];
      body.parent = this.mesh;
      body.isPickable = false; //so our raycasts dont hit ourself
      body.getChildMeshes().forEach((m) => {
        m.isPickable = false;
      });

      this.animations = charResult.animationGroups; // idle - 0; run - 1; jump - 2; land - 3;

      this.animations[0].loopAnimation = true;
      this.animations[1].loopAnimation = true;
      this.animations[this.prevAnim].play(
        this.animations[this.prevAnim].loopAnimation
      );
    });
  }
  public deleteModel() {
    const outer = this.scene.getMeshByName(`${this.id}`);
    if (outer) {
      this.scene.removeMesh(outer);
      outer.dispose();
    }
  }

  public animatePlayer() {
    if (this.currentAnim != null && this.prevAnim !== this.currentAnim) {
      this.animations[this.prevAnim].stop();
      this.animations[this.currentAnim].play(
        this.animations[this.currentAnim].loopAnimation
      );
      this.prevAnim = this.currentAnim;
    }
  }

  public setPlayerMessage(msg) {
    if (this.msgTimeout) clearTimeout(this.msgTimeout);
    const len = msg.length;
    const linesCount = Math.ceil(len / 25);
    const linesTexts = msg.match(/.{1,25}/g);
    const timeToRead = 2000 * linesCount;
    let newMsg = linesTexts.join("\n");
    newMsg = "\n".repeat(5 - linesCount) + newMsg;
    this.msgPannelText.text = newMsg;
    this.msgTimeout = setTimeout(() => {
      this.msgPannelText.text = "";
    }, timeToRead);
  }
}

export class ServerPlayer {
  public id: string;
  public name: string;
  public nameColor: number;
  public meshNums: number[];
  public colors: string[];
  constructor(ClientPlayer: Player) {
    this.id = ClientPlayer.id;
    this.name = ClientPlayer.name;
    this.nameColor = ClientPlayer.nameColor;
    this.meshNums = ClientPlayer.meshNums;
    this.colors = ClientPlayer.colors;
  }
}

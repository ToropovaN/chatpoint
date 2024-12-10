import {
  Color3,
  Mesh,
  Scene,
  SceneLoader,
  StandardMaterial,
  Vector2,
  Texture,
  Vector3,
  CubeTexture,
  PBRMaterial,
  AbstractMesh,
  VertexBuffer,
} from "@babylonjs/core";

const getFragmentOfMeshName = (name, startChar, endChar?) => {
  return name.substring(
    name.indexOf(startChar) + 1,
    endChar ? name.indexOf(endChar) : name.length
  );
};

const monitorTextureColumns = 4;
const monitorTextureRows = 7;
const monitorTexWidth = 1 / monitorTextureColumns;
const monitorTexHeight = 1 / monitorTextureRows;

const getMonitorUV = () => {
  const randIndex = Math.floor(Math.random() * 28);
  console.log(randIndex);
  const row = Math.floor(randIndex / monitorTextureColumns);
  const col = randIndex % monitorTextureColumns;
  const x0 = col * monitorTexWidth;
  const y0 = row * monitorTexHeight;
  const x1 = x0 + monitorTexWidth;
  const y1 = y0 + monitorTexHeight;
  return [x0, y0, x1, y0, x0, y1, x1, y1];
};

type OpaqueWallType = {
  mesh: Mesh | AbstractMesh;
  type: string;
  axis: string;
  min: number;
  max: number;
  inverse: boolean;
  alwModification: number | null;
};

export class Environment {
  private _scene: Scene;

  private _itemsMap = {
    chair1: null,
    chair2: null,
    chair3: null,
    chair4: null,
    chair5: null,
    chair6: null,
    table1: null,
    table2: null,
    table3: null,
    keyboard: null,
    mouse: null,
    monitor1: null,
    monitor2: null,
  };

  private _skyboxMaterial;
  private _skyboxMesh;

  private _earthMaterial;
  private _floorMaterial;
  private _wallMaterial;
  private _wallMaterialMat;
  private _graphicMaterial1;
  private _graphicMaterial2;
  private _monitorMaterial1;
  private _monitorMaterialManager;

  private _opaqueWalls: OpaqueWallType[] = [];

  private _roofs = {
    0: [],
    1: [],
  };

  constructor(scene: Scene) {
    this._scene = scene;

    this._skyboxMaterial = new StandardMaterial("skyBox", scene);
    this._skyboxMaterial.backFaceCulling = false;
    this._skyboxMaterial.reflectionTexture = new CubeTexture(
      "/textures/Sky",
      scene
    );
    this._skyboxMaterial.reflectionTexture.coordinatesMode =
      Texture.SKYBOX_MODE;
    this._skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    this._skyboxMaterial.specularColor = new Color3(0, 0, 0);
    this._skyboxMaterial.disableLighting = true;
    //this._skyboxMaterial.emissiveColor = new Color3(0.3, 0.3, 0.3);

    this._floorMaterial = new StandardMaterial("_floorMaterial", this._scene);
    this._floorMaterial.diffuseTexture = new Texture(
      "/textures/floor1.png",
      this._scene
    );
    this._floorMaterial.bumpTexture = new Texture(
      "/textures/floor1_NRM.jpg",
      this._scene
    );
    this._floorMaterial.diffuseColor = new Color3(0.83, 0.7, 0.5);
    this._floorMaterial.bumpTexture.level = 0.2;

    this._wallMaterial = new StandardMaterial("wallMaterial", this._scene);
    this._wallMaterial.diffuseTexture = new Texture(
      "/textures/mapTex.png",
      this._scene
    );
    this._wallMaterial.specularColor = new Color3(0.5, 0.5, 0.5);

    this._wallMaterialMat = new StandardMaterial("wallMaterialM", this._scene);
    this._wallMaterialMat.diffuseTexture = new Texture(
      "/textures/mapTex.png",
      this._scene
    );
    this._wallMaterialMat.specularColor = new Color3(0, 0, 0);

    this._graphicMaterial1 = new StandardMaterial(
      "graphicMaterial1",
      this._scene
    );
    this._graphicMaterial1.diffuseTexture = new Texture(
      "/textures/graphic.png",
      this._scene
    );
    this._graphicMaterial2 = new StandardMaterial(
      "graphicMaterial2",
      this._scene
    );
    this._graphicMaterial2.diffuseTexture = new Texture(
      "/textures/graphic2.png",
      this._scene
    );
    this._monitorMaterial1 = new StandardMaterial(
      "monitorMaterial",
      this._scene
    );
    this._monitorMaterial1.diffuseTexture = new Texture(
      "/textures/graphic2.png",
      this._scene
    );
    this._monitorMaterial1.emissiveColor = new Color3(1, 1, 1);
    this._monitorMaterialManager = this._monitorMaterial1.clone(
      "monitorMaterialManager"
    );
    this._monitorMaterialManager.diffuseTexture = new Texture(
      "/textures/monitors/manager.png",
      this._scene
    );
  }

  async load() {
    const mapResult = await SceneLoader.ImportMeshAsync(
      null,
      "./models/",
      "envSetting.glb",
      this._scene
    );
    const env = mapResult.meshes[0];
    const nodes = mapResult.transformNodes;

    for (const item in this._itemsMap) {
      await this.loadItem(item);
    }

    const allMeshes = env.getChildMeshes();
    allMeshes.forEach((m) => {
      m.receiveShadows = false;
      m.checkCollisions = m.name.includes("Collision");
      m.isPickable = m.name.includes("Collision");
      m.isVisible = !m.name.includes("Collision");

      if (m.name.includes("officeWall")) m.material = this._wallMaterial;
      if (m.name.includes("graphic_1")) m.material = this._graphicMaterial1;
      if (m.name.includes("graphic_2")) m.material = this._graphicMaterial2;
      if (m.name.includes("monitor")) m.material = this._monitorMaterial1;
      if (m.name.includes("officeStuff"))
        m.material = m.name.includes("_mat")
          ? this._wallMaterialMat
          : this._wallMaterial;

      if (m.name.includes("Earth")) m.material = this._earthMaterial;
      if (m.name.includes("Floor1")) m.material = this._floorMaterial;

      if (m.name.includes("roof0") || m.name.includes("roof1")) {
        const newMat = new StandardMaterial(
          "opaqueWallMaterial" + getFragmentOfMeshName(m.name, "[", "]"),
          this._scene
        );
        newMat.diffuseTexture = new Texture(
          "/textures/mapTex.png",
          this._scene
        );
        m.material = newMat;
        if (m.name.includes("roof0")) this._roofs[0].push(m);
        if (m.name.includes("roof1")) this._roofs[1].push(m);
      }

      if (
        m.name.includes("opaqueWall") ||
        m.name.includes("opaqueGraphic") ||
        m.name.includes("buildingWall") ||
        m.name.includes("door")
      ) {
        // меши с прозрачностью называть по шаблону opaqueWall[<индекс>]<ось>(<позиция для alpha = 1>/<позиция для alpha = 0>)
        const newOpaqueWall = {
          mesh: m,
          type: m.name.includes("door") ? "door" : "wall",
          axis: m.name[m.name.indexOf("]") + 1],
          min: parseFloat(getFragmentOfMeshName(m.name, "(", "/")),
          max: parseFloat(getFragmentOfMeshName(m.name, "/", ")")),
          inverse: m.name.includes("inv"),
          alwModification: null,
        };
        if (m.name.includes("alw")) {
          const nameSplit = m.name.split("alw");
          newOpaqueWall.alwModification = Number(
            nameSplit[nameSplit.length - 1]
          );
        }
        this._opaqueWalls.push(newOpaqueWall);
        const newMat = new StandardMaterial(
          "opaqueWallMaterial" + getFragmentOfMeshName(m.name, "[", "]"),
          this._scene
        );

        if (m.name.includes("buildingWall")) {
          newMat.diffuseTexture = new Texture(
            "/textures/buildingTex.png",
            this._scene
          );
          newMat.bumpTexture = new Texture(
            "/textures/buildingTex_NRM.jpg",
            this._scene
          );
          newMat.bumpTexture.level = 0.8;
          newMat.alpha = 0;
        } else if (m.name.includes("opaqueGraphic")) {
          newMat.diffuseTexture = new Texture(
            "/textures/graphic.png",
            this._scene
          );
        } else {
          newMat.diffuseTexture = new Texture(
            "/textures/mapTex.png",
            this._scene
          );
        }

        if (m.name.includes("window")) newMat.alpha = 0;

        m.material = newMat;
        m.checkCollisions = false;
      }

      if (m.name.includes("skybox")) {
        this._skyboxMesh = m;
        this._skyboxMesh.material = this._skyboxMaterial;

        this._scene.onBeforeRenderObservable.add(() => {
          this._skyboxMesh.rotation = new Vector3(
            0,
            this._skyboxMesh.rotation.y +
              this._scene.getEngine().getDeltaTime() * 0.00001,
            0
          );
        });
      }

      if (m.name.includes("skybox")) {
        this._skyboxMesh = m;
        this._skyboxMesh.material = this._skyboxMaterial;

        this._scene.onBeforeRenderObservable.add(() => {
          this._skyboxMesh.rotation = new Vector3(
            0,
            this._skyboxMesh.rotation.y +
              this._scene.getEngine().getDeltaTime() * 0.00001,
            0
          );
        });
      }

      if (m.name.includes("(item)")) {
        let mName = getFragmentOfMeshName(m.name, ")", "[");
        m.isVisible = false;
        m.checkCollisions = true;
        m.isPickable = true;

        if (this._itemsMap[mName]) {
          let nMesh = this._itemsMap[mName].clone(m.name + "Mesh");
          nMesh.position = m.getAbsolutePosition();
          nMesh.rotation = m.rotationQuaternion.toEulerAngles();
          nMesh.rotation.y = -nMesh.rotation.y;
          if (mName === "monitor") {
            const newData = getMonitorUV();
            nMesh.setVerticesData(VertexBuffer.UVKind, newData, true);

            const imgMesh = nMesh
              .getChildMeshes()
              .find((m) => m.name.includes("img"));
            imgMesh.makeGeometryUnique();
            imgMesh.setVerticesData(VertexBuffer.UVKind, newData, true);

            console.log(mName);
          }
        }
      }
    });

    nodes.forEach((n) => {
      let nName = getFragmentOfMeshName(n.name, ")", "[");
      if (n.name.includes("(item)") && this._itemsMap[nName]) {
        let nMesh = this._itemsMap[nName].clone(n.name + "Mesh");

        nMesh.position = n.getAbsolutePosition();

        if (n.name.includes("_")) {
          let scale = parseFloat(getFragmentOfMeshName(n.name, "_", "/"));
          let rotate = parseFloat(getFragmentOfMeshName(n.name, "/"));

          nMesh.scaling = new Vector3(scale, scale, scale);
          if (rotate > 0) {
            nMesh.rotationQuaternion = null;
            nMesh.rotation.y = rotate;
          }
        }
      }
    });
    this._scene.stopAllAnimations();
  }

  async loadItem(name) {
    // Называть empty на позициях предметов в блендере по шаблону (item)<название>[<индекс>]_<scale>/<rot>
    let Result = await SceneLoader.ImportMeshAsync(
      null,
      "./models/items/",
      name + ".glb",
      this._scene
    );
    let meshes = Result.meshes[0];
    meshes.getChildMeshes().forEach((m) => {
      m.material = this._wallMaterial;
      m.checkCollisions = m.name.includes("Collision");
      m.isVisible = !m.name.includes("Collision");
      m.isPickable = m.name.includes("CollisionGround");
      if (m.name.includes("monitor_img"))
        m.material = this._monitorMaterialManager;

      if (m.name.includes("(light)")) {
        (m.material as StandardMaterial).emissiveColor = new Color3(1, 1, 1);
        (m.material as StandardMaterial).emissiveTexture = (
          m.material as PBRMaterial
        ).albedoTexture;
      }
    });

    meshes.position.x = -200;
    this._itemsMap[name] = meshes;
  }

  setOpacityFromAvatarPos = (AvatarPos) => {
    this._opaqueWalls.forEach((wall) => {
      if (AvatarPos[wall.axis] > wall.min && AvatarPos[wall.axis] < wall.max) {
        wall.mesh.material.alpha = wall.inverse
          ? 1 - (AvatarPos[wall.axis] - wall.min) / (wall.max - wall.min)
          : (AvatarPos[wall.axis] - wall.min) / (wall.max - wall.min);
        if (
          wall.alwModification !== null &&
          wall.mesh.material.alpha < wall.alwModification
        ) {
          wall.mesh.material.alpha = wall.alwModification;
        }
      } else if (wall.alwModification !== null && wall.type === "wall")
        wall.mesh.material.alpha = wall.alwModification;
      else if (wall.alwModification !== null && wall.type === "door")
        wall.mesh.material.alpha =
          AvatarPos[wall.axis] > wall.min ? 1 : wall.alwModification;
      else {
        wall.mesh.material.alpha = wall.inverse
          ? Number(AvatarPos[wall.axis] < wall.max)
          : Number(AvatarPos[wall.axis] > wall.min);
      }
      if (
        wall.mesh.name.includes("hallRoof") &&
        AvatarPos.x < 17 &&
        AvatarPos.x > -44 &&
        AvatarPos.z > -3
      )
        wall.mesh.material.alpha = 1;
    });
  };
  setRoofsOpacity = (roofIndex) => {
    Object.keys(this._roofs).forEach((index) => {
      if (roofIndex == index) {
        this._roofs[index].forEach((roofMesh) => (roofMesh.material.alpha = 0));
      } else
        this._roofs[index].forEach((roofMesh) => (roofMesh.material.alpha = 1));
    });
  };
}

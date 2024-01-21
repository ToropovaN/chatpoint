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
} from "@babylonjs/core";

const getFragmentOfMeshName = (name, startChar, endChar?) => {
  return name.substring(
    name.indexOf(startChar) + 1,
    endChar ? name.indexOf(endChar) : name.length
  );
};

type OpaqueWallType = {
  mesh: Mesh | AbstractMesh;
  axis: string;
  min: number;
  max: number;
  inverse: boolean;
  alwModification: number | null;
};

export class Environment {
  private _scene: Scene;

  private _itemsMap = {
    tree1: null,
    tree2: null,
    chair: null,
  };

  private _skyboxMaterial;
  private _earthMaterial;
  private _floorMaterial;
  private _wallMaterial;

  private _opaqueWalls: OpaqueWallType[] = [];

  private _roofs = {
    0: [],
    1: [],
  };

  constructor(scene: Scene) {
    this._scene = scene;

    /*this._skyboxMaterial = new StandardMaterial("skyBox", scene);
    this._skyboxMaterial.backFaceCulling = false;
    this._skyboxMaterial.reflectionTexture = new CubeTexture(
      "/textures/Sky",
      scene
    );
    this._skyboxMaterial.reflectionTexture.coordinatesMode =
      Texture.SKYBOX_MODE;
    this._skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    this._skyboxMaterial.specularColor = new Color3(0, 0, 0);
    this._skyboxMaterial.disableLighting = true;*/

    this._floorMaterial = new StandardMaterial("_floorMaterial", this._scene);
    this._floorMaterial.diffuseTexture = new Texture(
      "/textures/floor1.png",
      this._scene
    );
    this._floorMaterial.bumpTexture = new Texture(
      "/textures/floor1_NRM.jpg",
      this._scene
    );
    this._floorMaterial.diffuseColor = new Color3(0.96, 0.9, 0.79);
    this._floorMaterial.bumpTexture.level = 0.2;

    this._wallMaterial = new StandardMaterial("wallMaterial", this._scene);
    this._wallMaterial.diffuseTexture = new Texture(
      "/textures/mapTex.png",
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

    const allMeshes = env.getChildMeshes();
    allMeshes.forEach((m) => {
      m.receiveShadows = false;
      m.checkCollisions = false;
      m.isPickable = false;
      m.isVisible = true;

      if (m.name.includes("CollisionGround")) {
        m.isVisible = false;
        m.isPickable = true;
        m.checkCollisions = true;
      }
      if (m.name.includes("CollisionWall")) {
        m.isVisible = false;
        m.checkCollisions = true;
      }

      if (m.name.includes("officeWall")) {
        m.checkCollisions = true;
        m.material = this._wallMaterial;
      }

      if (m.name.includes("Earth")) {
        m.material = this._earthMaterial;
        //(m as Mesh).markVerticesDataAsUpdatable(VertexBuffer.NormalKind, true);
        //(m as Mesh).applyDisplacementMap("/textures/earth_DISP.jpg", 0, 10);
      }

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

      if (m.name.includes("opaqueWall") || m.name.includes("buildingWall")) {
        // меши с прозрачностью называть по шаблону opaqueWall[<индекс>]<ось>(<позиция для alpha = 1>/<позиция для alpha = 0>)
        const newOpaqueWall = {
          mesh: m,
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
          newMat.bumpTexture.level = 0.6;
          newMat.alpha = 0;
        } else {
          newMat.diffuseTexture = new Texture(
            "/textures/mapTex.png",
            this._scene
          );
        }

        m.material = newMat;
        m.checkCollisions = true;
      }

      if (m.name.includes("skybox")) {
        m.material = this._skyboxMaterial;
      }
    });

    await this.loadItem("tree1");
    await this.loadItem("tree2");

    await this.loadItem("chair");

    nodes.forEach((n) => {
      let nName = getFragmentOfMeshName(n.name, ")", "[");
      if (n.name.includes("(item)") && this._itemsMap[nName]) {
        let nMesh = this._itemsMap[nName].clone(n.name + "Mesh");

        nMesh.position = n.getAbsolutePosition();
        if (n.name.includes("_")) {
          let scale = parseFloat(getFragmentOfMeshName(n.name, "_", "/"));
          let rotate = parseFloat(
            n.name.substring(getFragmentOfMeshName(n.name, "/"))
          );

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
      m.checkCollisions = m.name.includes("Collision");
      m.isVisible = !m.name.includes("Collision");
      m.isPickable = m.name.includes("CollisionGround");
      //m.checkCollisions = false;
      //m.isPickable = false;
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
      } else {
        if (wall.alwModification !== null)
          wall.mesh.material.alpha = wall.alwModification;
        else
          wall.mesh.material.alpha = wall.inverse
            ? Number(AvatarPos[wall.axis] < wall.max)
            : Number(AvatarPos[wall.axis] > wall.min);
      }
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

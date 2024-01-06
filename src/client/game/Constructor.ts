import { StandardMaterial, Scene, SceneLoader, Color3 } from "@babylonjs/core";
import { AppInterface } from "./AppInterface";

const defaultColor = {
  Skin: "#ffc7ae",
  Eyes: "#5cc4ff",
  "Brows and Eyelashes": "#353c50",
  Hair: ["#353c50", "#4a536b"],
  Cloth: ["#00a3ff", "#ffffff"],
  Pants: ["#7b808f", "#626879"],
  Shoes: ["#353c50", "#ffffff"],
  Acces: ["#ffffff", "#00a3ff"],
  Default: "#ffffff",
};
type Item = {
  name: string;
  meshes: number[];
  color1: string;
  color2?: string;
};
export class Constructor {
  private _isActive: boolean;

  private _scene: Scene;
  private _model;
  private _materials: StandardMaterial[];

  private _interface;

  private Items = {
    Body: [],
    Hair: [],
    Cloth: [],
    Pants: [],
    Shoes: [],
    Acces: [],
    default: [],
  };
  private _AvatarItems = Object.assign({}, this.Items);
  private _visibleMeshesNums = [];
  private _currentPage = 0;

  private _colorInputs;

  private _constructorPannel: HTMLDivElement;
  private _constructorTabsBlock: HTMLFormElement;
  private _constructorContentBlock: HTMLFormElement;

  constructor(newScene: Scene, newInterface: AppInterface) {
    this.updScene(newScene);
    this._interface = newInterface.appInterface;

    this._constructorPannel = document.createElement("div");
    this._constructorPannel.className =
      "interface__constructorPannel constructorPannel";

    this._constructorTabsBlock = document.createElement("form");
    this._constructorTabsBlock.className =
      "constructorPannel_tabsBlock tabsBlock";

    this._constructorContentBlock = document.createElement("form");
    this._constructorContentBlock.className = "constructorPannel_contentBlock";

    for (let i = 0; i < Object.keys(this.Items).length - 1; i++) {
      const newInput = document.createElement("input");
      newInput.type = "radio";
      newInput.name = "Tabs";
      newInput.id = "Tab" + i;
      newInput.value = i.toString();
      newInput.className = "tabsBlock__radio";

      const newLabel = document.createElement("label");
      newLabel.setAttribute("for", newInput.id);
      newLabel.className = "tabsBlock__tabs";
      newLabel.setAttribute(
        "style",
        "background-image: url(img/tabIcons/" + i + ".png);"
      );
      if (i === 0) newInput.checked = true;

      this._constructorTabsBlock.append(newInput);
      this._constructorTabsBlock.append(newLabel);
    }

    this._constructorTabsBlock.addEventListener("change", (e) => {
      if (this._isActive) {
        this._currentPage = parseInt((e.target as HTMLInputElement).value);
        this.drawCurrentPage();
      }
    });

    this._constructorPannel.append(this._constructorTabsBlock);
    this._constructorPannel.append(this._constructorContentBlock);

    this._interface.append(this._constructorPannel);
    this._isActive = true;

    window.addEventListener("resize", (e) => {
      this.constructorResize();
    });
    this.constructorResize();
  }

  public constructorResize() {
    if (this._interface.clientHeight * 2 < this._interface.clientWidth)
      this._constructorPannel.style.width = "20%";
    else if (this._constructorPannel.style.width != "30%")
      this._constructorPannel.style.width = "30%";
  }

  private drawCurrentPage() {
    const currentPageName = Object.keys(this.Items)[this._currentPage];
    const labels = document.querySelectorAll(
      ".constructorPannel__constructorItem"
    );
    let labelsSlots = 0;
    for (let i = 0; i < labels.length; i++) {
      if (labels[i].getAttribute("page") === currentPageName) {
        labels[i].className = "constructorPannel__constructorItem";
        labelsSlots++;
      } else labels[i].className = "constructorPannel__constructorItem hidden";
    }
    this._constructorContentBlock.style.gridTemplateRows =
      "repeat(" + labelsSlots + ", 11%)";
  }

  public async importMesh() {
    await SceneLoader.ImportMeshAsync(
      null,
      "./models/",
      "player.glb",
      this._scene
    ).then((result) => {
      this._model = result;
      this._materials = [];
      for (let i = 1; i < this._model.meshes.length; i++) {
        this._model.meshes[i].isVisible = false;
        const name = this._model.meshes[i].name;
        if (name.includes("primitive") || name.includes("Body")) {
          if (
            name.includes("primitive") &&
            name[name.indexOf("primitive") + "primitive".length] > 1
          )
            this._model.meshes[i].material = this._materials[10];
          // 10 - номер меша Body<Skin>
          else {
            const newMat = new StandardMaterial(
              this._model.meshes[i].name,
              this._scene
            );
            newMat.diffuseColor = new Color3(0, 0, 0);
            newMat.specularColor = new Color3(0, 0, 0);
            this._model.meshes[i].material = newMat;
            this._materials.push(newMat);
          }
        }
      }
      const menuAnimation = this._model.animationGroups[0];
      menuAnimation.play(true);
    });
  }

  public async addConstructorCards() {
    await this.importMesh();
    for (let i = 1; i < this._model.meshes.length; i++) {
      const mesh = this._model.meshes[i];
      const name = mesh.name;
      const nameOfItem = name.substring(
        name.indexOf("<") + 1,
        name.indexOf(">")
      );

      let pageOfItem = name.substring(0, name.indexOf("_"));
      if (!this.Items.hasOwnProperty(pageOfItem)) pageOfItem = "default";

      const newItem: Item = {
        name: nameOfItem,
        meshes: [i],
        color1: "",
      };

      //Смотрим есть ли итем, куда можно присвоить этот меш
      const foundItem = this.Items[pageOfItem].find(
        (item) => item.name === nameOfItem
      );
      if (foundItem) {
        foundItem.meshes.push(i);
      } else {
        //Если такого итема нет, создаем его и его карточку
        if (pageOfItem !== "default") {
          const newCardInput = document.createElement("input");
          newCardInput.className = "constructorPannel__button";
          newCardInput.name = pageOfItem;
          newCardInput.id = nameOfItem;
          newCardInput.type = "radio";
          const newCardLabel = document.createElement("label");
          newCardLabel.setAttribute("for", newCardInput.id);
          newCardLabel.setAttribute("page", pageOfItem);
          newCardLabel.className = "constructorPannel__constructorItem";

          newCardInput.addEventListener("change", () => {
            if (this._isActive) {
              this._AvatarItems[pageOfItem] = [newItem];
              this.setItems();
            }
          });

          const newCardPic = document.createElement("img");
          newCardPic.className = "constructorItem__Pic";
          newCardPic.src = "img/constructorItems/" + nameOfItem + ".png";

          const newCardInfo = document.createElement("div");
          newCardInfo.className = "constructorItem__Info";
          const newCardName = document.createElement("div");
          newCardName.className = "constructorItem__Name";
          newCardName.textContent = nameOfItem;

          const newCardColor = document.createElement("div");
          if (!nameOfItem.includes("None")) {
            const newCardColorInput = document.createElement("input");
            newCardColorInput.type = "color";
            newCardColorInput.className = "colorInput";
            newCardColorInput.id = nameOfItem + "-color1";
            newCardColor.append(newCardColorInput);

            if (defaultColor.hasOwnProperty(nameOfItem))
              newCardColorInput.value = defaultColor[nameOfItem];
            else if (defaultColor.hasOwnProperty(pageOfItem))
              newCardColorInput.value = defaultColor[pageOfItem][0];
            else newCardColorInput.value = defaultColor["Default"];
          }

          if (this.Items[pageOfItem].length === 0) newCardInput.checked = true;

          if (pageOfItem === "Body") {
            newCardColor.className = "constructorItem__oneColor";
            newCardInput.type = "checkbox";
            newCardInput.checked = true;
            newCardInput.disabled = true;
          } else if (!nameOfItem.includes("None")) {
            newCardColor.className = "constructorItem__twoColors";
            const newCardColorInput2 = document.createElement("input");
            newCardColorInput2.type = "color";
            newCardColorInput2.className = "colorInput";
            newCardColorInput2.id = nameOfItem + "-color2";
            newCardColorInput2.value = defaultColor.hasOwnProperty(pageOfItem)
              ? defaultColor[pageOfItem][1]
              : defaultColor["Default"];
            newCardColor.append(newCardColorInput2);
          }

          newCardLabel.append(newCardPic);
          newCardLabel.append(newCardInfo);
          newCardInfo.append(newCardName);
          newCardInfo.append(newCardColor);

          this._constructorContentBlock.append(newCardInput);
          this._constructorContentBlock.append(newCardLabel);
        }

        this.Items[pageOfItem].push(newItem);
      }
    }

    //Связываем инпуты цвета с материалами
    this._colorInputs = document.querySelectorAll("input.colorInput");
    if (this._colorInputs.length !== this._materials.length)
      console.log(
        "Error: material not found",
        this._colorInputs,
        this._materials
      );
    else {
      for (let i = 0; i < this._colorInputs.length; i++) {
        const colorInput = this._colorInputs[i] as HTMLInputElement;
        colorInput.addEventListener("change", () => {
          if (this._isActive) {
            this._materials[i].diffuseColor = Color3.FromHexString(
              colorInput.value
            );
          }
        });
        colorInput.dispatchEvent(new Event("change"));
      }
    }

    //Назначаем какие итемы будут у аватара (дефолтные + первые в каждой категории)
    for (let pageOfItems in this.Items) {
      if (pageOfItems === "Body" || pageOfItems === "default") {
        this._AvatarItems[pageOfItems] = this.Items[pageOfItems];
      } else {
        const firstItemOfPage = this.Items[pageOfItems][0];
        if (firstItemOfPage) this._AvatarItems[pageOfItems] = [firstItemOfPage];
      }
    }
    this.setItems();
    this.drawCurrentPage();
  }

  private setItems() {
    this._model.meshes.forEach((mesh) => (mesh.isVisible = false));
    this._visibleMeshesNums = [];
    for (let pageOfItems in this._AvatarItems) {
      for (let i = 0; i < this._AvatarItems[pageOfItems].length; i++) {
        this._visibleMeshesNums = this._visibleMeshesNums.concat(
          this._AvatarItems[pageOfItems][i].meshes
        );
      }
    }
    this._visibleMeshesNums.forEach(
      (num) => (this._model.meshes[num].isVisible = true)
    );
  }

  public updScene(newScene) {
    this._scene = newScene;
  }

  public getVisibleMeshesNums() {
    return this._visibleMeshesNums;
  }
  public getVisibleMeshesColors() {
    const visibleMeshesColors = [];
    this._visibleMeshesNums.forEach((num) => {
      if (this._model.meshes[num].name.includes("0Const"))
        visibleMeshesColors.push("default");
      else if (this._model.meshes[num].material.diffuseColor)
        visibleMeshesColors.push(
          this._model.meshes[num].material.diffuseColor.toHexString()
        );
    });
    return visibleMeshesColors;
  }

  public addConstructorInterface() {
    this._constructorPannel.className =
      "interface__constructorPannel constructorPannel";
    this.setItems();
    this._isActive = true;
    this._colorInputs.forEach((CI) => {
      const colorInput = CI as HTMLInputElement;
      colorInput.dispatchEvent(new Event("change"));
    });
  }

  public removeConstructorInterface() {
    this._constructorPannel.className =
      "interface__constructorPannel constructorPannel hidden";
    this._isActive = false;
  }
}

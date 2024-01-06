import {
  sendMessage,
  sendPlayer,
  exit,
  setMessageList,
  setPlayersList,
} from "../client";
import { Avatar } from "./Avatar";

export class AppInterface {
  public appInterface;

  private _gameCanvas;

  private _playersList: HTMLDivElement;
  private _playersListTitle: HTMLDivElement;
  private _playersListNames: HTMLDivElement;
  private _menuBtn: HTMLDivElement;
  private _chatPnl: HTMLDivElement;
  private _chatList: HTMLDivElement;
  private _chatForm: HTMLDivElement;
  private _sendInpt: HTMLInputElement;
  private _sendBtn: HTMLDivElement;
  private _loginForm: HTMLDivElement;
  private _loginInpt: HTMLInputElement;
  private _loginBtn: HTMLDivElement;

  private _emotionsPnl: HTMLDivElement;
  private _emotionsListener;
  private _emotionsAvatar: Avatar;
  private _emotionTimeout = null;
  private _emotionTime = 1670;

  private _mobileInputInterface: HTMLDivElement;
  public mobileInput = {
    Up: false,
    Left: false,
    Jump: false,
    Right: false,
    Down: false,
  };

  constructor() {
    this.appInterface = document.querySelector(".interface");
    this._gameCanvas = document.querySelector("#gameCanvas");

    this._playersList = document.createElement("div");
    this._playersList.className = "interface__playersList playersList";
    this._playersListTitle = document.createElement("div");
    this._playersListTitle.className = "playersList__title";
    this._playersListTitle.textContent = "Players:";
    this._playersListNames = document.createElement("div");
    this._playersListNames.className = "playersList__list";
    this.appInterface.append(this._playersList);
    this._playersList.append(this._playersListTitle);
    this._playersList.append(this._playersListNames);
    this._playersListNames.textContent = "-join the chat to see players-";
    setPlayersList(this._playersListNames);

    this._menuBtn = document.createElement("div");
    this._menuBtn.id = "menuBtn";
    this._menuBtn.className = "interface__menuButton button";
    this._menuBtn.textContent = "Return To Menu";

    this._chatPnl = document.createElement("div");
    this._chatPnl.id = "chatPnl";
    this._chatPnl.className = "interface__chatPannel chatPannel";

    this._chatList = document.createElement("div");
    this._chatList.id = "chatList";
    this._chatList.className = "chatPannel__list";

    this._chatForm = document.createElement("div");
    this._chatForm.id = "chatForm";
    this._chatForm.className = "chatPannel__form";

    this._sendInpt = document.createElement("input");
    this._sendInpt.type = "text";
    this._sendInpt.id = "sendInpt";
    this._sendInpt.autocomplete = "off";
    this._sendInpt.maxLength = 125;
    this._sendInpt.className = "chatPannel__input";

    this._sendBtn = document.createElement("div");
    this._sendBtn.textContent = "Send!";
    this._sendBtn.id = "sendBtn";
    this._sendBtn.className = "chatPannel__button button";
    ///
    this._loginForm = document.createElement("div");
    this._loginForm.id = "loginForm";
    this._loginForm.className = "interface__loginForm loginForm";

    this._loginInpt = document.createElement("input");
    this._loginInpt.placeholder = "Your Name";
    this._loginInpt.maxLength = 25;
    this._loginInpt.id = "loginInpt";
    this._loginInpt.autocomplete = "off";
    this._loginInpt.className = "loginForm__input";

    this._loginBtn = document.createElement("div");
    this._loginBtn.textContent = "Login!";
    this._loginBtn.id = "loginBtn";
    this._loginBtn.className = "loginForm__button button";

    this._emotionsPnl = document.createElement("div");
    this._emotionsPnl.className = "interface__emotions";
    for (let i = 0; i < 5; i++) {
      // 5 - количество анимаций эмоций
      let emotionsBtn = document.createElement("div");
      emotionsBtn.id = "emotion" + i;
      emotionsBtn.className = "emotions__button";
      let emotionsPic = document.createElement("img");
      emotionsPic.className = "emotions__Pic";
      emotionsPic.src = "img/emotions/" + i + ".png";
      emotionsBtn.append(emotionsPic);
      this._emotionsPnl.append(emotionsBtn);
    }
    this._emotionsListener = (e) => {
      const emotion = 4 + parseInt(e.target.id.replace("emotion", ""));
      if (
        this._emotionsAvatar.currentEmotion !== emotion &&
        !this._emotionsAvatar.currentEmotion
      ) {
        this._emotionsAvatar.currentEmotion = emotion;
        e.target.className = "emotions__button emotions__button-active";
        this._emotionTimeout = setTimeout(() => {
          this._emotionsAvatar.currentEmotion = null;
          e.target.className = "emotions__button";
        }, this._emotionTime);
      }
      this._gameCanvas.focus();
    };

    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      this._mobileInputInterface = document.createElement("div");
      this._mobileInputInterface.className = "interface___mobileInput";
      for (let i = 0; i < 9; i++) {
        let newButton = document.createElement("div");
        switch (i) {
          case 1:
            newButton.id = "Up";
            break;
          case 3:
            newButton.id = "Left";
            break;
          case 4:
            newButton.id = "Jump";
            break;
          case 5:
            newButton.id = "Right";
            break;
          case 7:
            newButton.id = "Down";
            break;
          default:
            newButton.id = "emptyButton" + i;
            break;
        }
        this._mobileInputInterface.append(newButton);
      }
      this.appInterface.append(this._mobileInputInterface);
      this._mobileInputInterface.addEventListener("pointerover", (e) => {
        this.mobileInput[(e.target as HTMLElement).id] = true;
      });
      this._mobileInputInterface.addEventListener("pointerout", (e) => {
        this.mobileInput[(e.target as HTMLElement).id] = false;
      });
    }
  }

  private inputBlink = (input) => {
    input.style.opacity = "0.5";
    setTimeout(() => {
      input.style.opacity = "1";
    }, 300);
  };
  private menuBtnCallback = () => {
    exit();
    this.unlockLoginBtn();
  };
  private sendBtnCallback = () => {
    this._sendInpt.value = this._sendInpt.value.trim();
    if (this._sendInpt.value !== "") {
      sendMessage(this._sendInpt.value);
      this._sendInpt.value = "";
      this._gameCanvas.focus();
    } else this.inputBlink(this._sendInpt);
  };

  private loginBtnCallback = () => {
    this._loginInpt.value = this._loginInpt.value.trim();
    if (this._loginInpt.value !== "") {
      sendPlayer(this._loginInpt.value);
      this.lockLoginBtn();
      (document.querySelector("#gameCanvas") as HTMLElement).focus();
    } else this.inputBlink(this._loginInpt);
  };

  private loginInputCallback = (e) => {
    if (e.key === "Enter" && !this._loginBtn.classList.contains("lockedButton"))
      this.loginBtnCallback();
  };
  private sendInputCallback = (e) => {
    if (e.key === "Enter") this.sendBtnCallback();
  };

  public addGameInterface() {
    if (this._mobileInputInterface)
      this._mobileInputInterface.style.display = "grid";
    this.appInterface.append(this._menuBtn);
    this.appInterface.append(this._chatPnl);
    this._chatList.innerHTML = "";
    this._chatPnl.append(this._chatList);
    this._chatPnl.append(this._chatForm);
    this._chatForm.append(this._sendInpt);
    this._chatForm.append(this._sendBtn);
    this._menuBtn.addEventListener("click", this.menuBtnCallback);
    this._sendBtn.addEventListener("click", this.sendBtnCallback);
    this._sendInpt.addEventListener("keydown", this.sendInputCallback);
    setMessageList(this._chatList);
  }

  public removeGameInterface() {
    if (this._mobileInputInterface)
      this._mobileInputInterface.style.display = "none";
    this._menuBtn.remove();
    this._chatPnl.remove();
    this._menuBtn.removeEventListener("click", this.menuBtnCallback);
    this._sendBtn.removeEventListener("click", this.sendBtnCallback);
    this._sendInpt.removeEventListener("keydown", this.sendInputCallback);
    setMessageList(null);
  }

  public addMenuInterface() {
    this.appInterface.append(this._loginForm);
    this._loginForm.append(this._loginInpt);
    this._loginForm.append(this._loginBtn);
    this._playersListNames.textContent = "-join the chat to see players-";
    this._loginBtn.addEventListener("click", this.loginBtnCallback);
    this._loginInpt.addEventListener("keydown", this.loginInputCallback);
  }

  public addEmotionsPnl(avatar) {
    this._emotionsAvatar = avatar;
    this.appInterface.append(this._emotionsPnl);
    this._emotionsPnl.addEventListener("click", this._emotionsListener);
  }
  public removeEmotionsPnl() {
    this._emotionsPnl.remove();
    this._emotionsPnl.removeEventListener("click", this._emotionsListener);
  }

  public removeMenuInterface() {
    this._loginForm.remove();
    this._loginBtn.removeEventListener("click", this.loginBtnCallback);
    this._loginInpt.removeEventListener("keydown", this.loginInputCallback);
  }

  public lockLoginBtn() {
    this._loginBtn.className = "loginForm__button button lockedButton";
    this._loginBtn.removeEventListener("click", this.loginBtnCallback);
  }
  public unlockLoginBtn() {
    this._loginBtn.className = "loginForm__button button";
    this._loginBtn.addEventListener("click", this.loginBtnCallback);
  }
}

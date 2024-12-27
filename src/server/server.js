const express = require("express");
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const socketio = require("socket.io");
const WPConfig = require("../../webpack.config.js");

const oneHour = 3600000;

const app = express();
app.use(express.static("public", { maxAge: oneHour }));

if (process.env.NODE_ENV === "development") {
  // Setup Webpack for development
  const compiler = webpack(WPConfig);
  app.use(webpackDevMiddleware(compiler));
} else {
  // Static serve the dist/ folder in production
  app.use(express.static("dist", { maxAge: oneHour }));
}

// Listen on port
const port = process.env.PORT || 8080;
const server = app.listen(port);
console.log(`Server listening on port ${port}`);

// Setup socket.io
const io = socketio(server);

const maxNameLength = 25;
const maxMessageLength = 125;

// Listen for socket.io connections
io.on("connection", (socket) => {
  socket.on("getWelcome", Welcome);

  socket.on("sendPlayersPosition", sendPlayersPosition);

  socket.on("savePlayer", savePlayer);
  socket.on("saveMessage", saveMessage);
  socket.on("savePlayerPosition", updPlayerPosition);

  socket.on("exit", deletePlayer);
  socket.on("disconnect", deletePlayer);
});

const Players = [];
const PlayersPosition = [];

function Welcome() {
  const newPlayer = Players.find((player) => player.id === this.id);
  if (newPlayer) {
    this.emit("Welcome", {
      player: newPlayer.name,
      color: newPlayer.nameColor,
      players: Players,
    });
  }
}

function sendPlayersPosition() {
  io.emit("PlayersPosition", {
    positions: PlayersPosition,
    timeStamp: Date.now(),
  });
}

function savePlayer(player) {
  player.name =
    player.name.length <= maxNameLength
      ? player.name
      : player.name.substring(0, maxNameLength);
  player.nameColor = player.nameColor % 12;
  player.id = this.id;
  Players.push(player);
  PlayersPosition.push({
    id: this.id,
    x: 0,
    y: 0,
    z: 0,
    rotW: 0,
    rotY: 0,
    anim: 0,
  });
  io.emit("newPlayer", player);
}

function saveMessage(msg) {
  const newMessage =
    msg.length <= maxMessageLength ? msg : msg.substring(0, maxMessageLength);
  const messageSender = Players.find((player) => player.id === this.id);
  if (messageSender) {
    io.emit("newMessage", {
      player: messageSender.name,
      playerId: this.id,
      color: messageSender.nameColor,
      msg: newMessage,
    });
  }
}

function updPlayerPosition(newPosition) {
  const index = PlayersPosition.findIndex((pos) => pos.id === this.id);
  if (index >= 0) {
    PlayersPosition[index] = newPosition;
    PlayersPosition[index].id = this.id;
  }
}

function deletePlayer() {
  let index = Players.findIndex((player) => player.id === this.id);
  if (index >= 0) {
    Players.splice(index, 1);
    PlayersPosition.splice(index, 1);
    io.emit("deletePlayer", this.id);
  }
}

let tick = setInterval(() => {
  sendPlayersPosition();
}, 1000 / 30);

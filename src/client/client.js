import io from 'socket.io-client';
import {AvatarPlayer, Player, Players} from "./game/Player";
import {newApp} from "./game/App";

export let mySocketId = "";

const RENDER_DELAY = 100;
const renderUpdates = [];
let firstClientTimeStamp = 0;
let firstServerTimeStamp = 0;

const getBaseUpdate = () => {
    const renderTime = getRenderTime();
    for (let i = renderUpdates.length - 1; i >= 0; i--) {
        if (renderUpdates[i].timeStamp <= renderTime) {
            return i;
        }
    }
    return -1;
}
const getRenderTime = () => {
    return firstServerTimeStamp + (Date.now() - firstClientTimeStamp) - RENDER_DELAY;
};

export const getCurrentState = () => {
    if (!firstServerTimeStamp) {
        return {};
    }

    let currentState;
    const base = getBaseUpdate();
    // If base is the most recent update we have, use its state.
    // Otherwise, interpolate between its state and the state of (base + 1).
    if (base < 0 || base === renderUpdates.length - 1) currentState = renderUpdates[renderUpdates.length - 1];
    else {
        currentState = interpolateCurrentState(renderUpdates[base], renderUpdates[base + 1]);
    } // interpolate between renderUpdates[base] and renderUpdates[base + 1].

    Players.forEach((player) => {
        const position = currentState.positions.find((pos) => pos.id === player.id);
        const mesh = player.mesh;
        if (mesh && position) {
            mesh.position.x = position.x;
            mesh.position.y = position.y;
            mesh.position.z = position.z;
            mesh.rotationQuaternion._w = position.rotW;
            mesh.rotationQuaternion._y = position.rotY;
            player.currentAnim = position.anim;
            if (player.animations) player.animatePlayer();
        }
    })
}

const interpolateCurrentState = (baseState, nextState) => {

    const basePositions = baseState.positions;
    const nextPositions = nextState.positions;

    const interpolated = baseState;

    const renderTime = getRenderTime();
    const ratio = (renderTime - baseState.timeStamp) / (nextState.timeStamp - baseState.timeStamp);
    for (let i = 0; i < nextPositions.length; i++) {
        if (basePositions[i]) {
            Object.keys(basePositions[i]).forEach(key => {
                if ((basePositions[i])[key] !== (nextPositions[i])[key]) {
                    if (key === 'rotW' || key === 'rotY') {
                        const absD = Math.abs((nextPositions[i])[key] - (basePositions[i])[key]);
                        if (absD >= Math.PI) {
                            // The angle between the directions is large - we should rotate the other way
                            if ((basePositions[i])[key] > (nextPositions[i])[key]) {
                                (interpolated.positions[i])[key] = (basePositions[i])[key] + ((nextPositions[i])[key] + 2 * Math.PI - (basePositions[i])[key]) * ratio;
                            } else {
                                (interpolated.positions[i])[key] = (basePositions[i])[key] - ((nextPositions[i])[key] - 2 * Math.PI - (basePositions[i])[key]) * ratio;
                            }
                        } else (interpolated.positions[i])[key] = (basePositions[i])[key] + ((nextPositions[i])[key] - (basePositions[i])[key]) * ratio;
                    }
                    else if (key === 'x' || key === 'y' || key === 'z') {
                        (interpolated.positions[i])[key] = (basePositions[i])[key] + ((nextPositions[i])[key] - (basePositions[i])[key]) * ratio;
                    }
                }
            })
        }
    }
    return interpolated;
}

const socketProtocol = 'ws';
const socket = io( `${socketProtocol}://${window.location.host}` , { reconnection: false }); 
const connectedPromise = new Promise(resolve => {
    socket.on('connect', () => {
        mySocketId = socket.id;
        console.log('Connected to server! ' + mySocketId);
        resolve();
    });
}).then(() => {
    // Register callbacks

    socket.on('Welcome', (welcome) => {
        createMessage(welcome.color," -- Welcome, " + welcome.player + "! -- ", "");
        Players = [];
        let length = welcome.players.length;
        for (let i = 0; i < length; i++){
            let player = welcome.players[i];
            if (player.id !== mySocketId ){
                let newPlayer = new Player(player);
                Players.push(newPlayer);
                newPlayer.loadModel();
            }
        }
        drawPlayersList();
    });

    socket.on('newPlayer', (player) => { //ServerPlayer
        if (player.id === mySocketId) {
            AvatarPlayer = player;
            newApp.AfterGoToGame().then(() => {
                socket.emit('getWelcome');
            });

        }
        else {
            createMessage(player.nameColor, " -- " + player.name + " join this chat! -- ", "");
            let newPlayer = new Player(player);
            Players.push(newPlayer);
            newPlayer.loadModel();
            if (newApp.state) drawPlayersList();
        }
    });

    socket.on('deletePlayer', (playerId) => { //string
        if (playerId === mySocketId) {
            newApp.AfterGoToMenu().then(() => { Players = [];} )
        }
        else {
            const index = Players.findIndex((player) => player.id === playerId);
            if (index >= 0) {
                let newPlayer = Players[index];
                createMessage(newPlayer.nameColor, " -- " + newPlayer.name + " leave this chat! -- ", "");
                newPlayer.deleteModel();
                Players.splice(index, 1);
                if (newApp.state) drawPlayersList();
            }
        }
    });

    socket.on('PlayersPosition', (PositionsData) => {
        if (!firstServerTimeStamp) {
            firstServerTimeStamp = PositionsData.timeStamp;
            firstClientTimeStamp = Date.now();
        }
        renderUpdates.push(PositionsData);

        // Keep only one game update before the current server time
        const base = getBaseUpdate();
        if (base > 0) {
            renderUpdates.splice(0, base);
        }
    });

    socket.on('newMessage', (message) => {
        createMessage(message.color, message.player + ": ", message.msg);
        if (message.playerId === mySocketId) {
            newApp.getAvatar().setPlayerMessage(message.msg);
        }
        else {
            const player = Players.find((player) => player.id === message.playerId);
            player.setPlayerMessage(message.msg);
        }
    });
});

let messageList;
let playersList;
export const setMessageList = list => { messageList = list; }
export const setPlayersList = list => { playersList = list; }

export const sendPlayer = (name) => {
    socket.emit('savePlayer', {
        "id": "",
        "name": name,
        "nameColor": Math.floor(Math.random() * 13),
        "meshNums": newApp.getConstructor().getVisibleMeshesNums(),
        "colors": newApp.getConstructor().getVisibleMeshesColors(),
    });
}

export const sendPosition = (newX, newY, newZ, newRotW, newRotY, newAnim) => {
    socket.emit('savePlayerPosition', {
        "id": mySocketId,
        "x": newX,
        "y": newY,
        "z": newZ,
        "rotW": newRotW,
        "rotY": newRotY,
        "anim": newAnim
    });
}

export const sendMessage = (msg) => {
    socket.emit('saveMessage', msg);
}

export const exit = () => {
    socket.emit('exit');
}

const createMessage = (color, coloredText, text) => {
    if (messageList) {
        const newPlayerP = document.createElement('p');
        const newPlayerSpan = document.createElement('span');
        newPlayerSpan.style.color = colorsSet[color];
        newPlayerSpan.textContent = coloredText;
        newPlayerP.textContent = text
        newPlayerSpan.style.fontWeight = "bold";
        newPlayerP.prepend(newPlayerSpan);
        messageList.prepend(newPlayerP);
        while (messageList.children.length > 30) messageList.removeChild(messageList.lastChild);
    }
}

const drawPlayersList = () => {
    if (playersList) {
        playersList.textContent = "";
        let i = 1;
        let List = [];
        List.push({ "name": AvatarPlayer.name, "color": AvatarPlayer.nameColor});
        Players.forEach((player) => {
            List.push({ "name": player.name, "color": player.nameColor});
        });
        List.forEach((player) => {
            const newPlayerP = document.createElement('p');
            const newPlayerSpan = document.createElement('span');
            newPlayerP.className = "playersList__p";
            newPlayerSpan.style.color = colorsSet[player.color];
            newPlayerSpan.style.fontWeight = "bold";
            newPlayerP.textContent = i + ") ";
            newPlayerSpan.textContent = player.name;
            newPlayerP.append(newPlayerSpan);
            playersList.append(newPlayerP);
            i++;
        })
    }
}

export const colorsSet = ["#fedbdb", "#fee6d9", "#fef2da", "#fcfeda", "#ebfcdb", "#dafde1", "#dbfef6", "#daf7fd", "#d9ecfd", "#dbd9fd", "#ebdafd", "#fcdaf2"];
var child_process = require('child_process');
var fs = require('fs');
var LobbyFactory = require('./app/factories/LobbyFactory.js');
var LobbyManagerService = require('./app/services/LobbyManagerService.js');
"use strict";

var lobbyConf = JSON.parse(process.argv[2]);
var lobbyPort = process.argv[3]; //It is argv[2] because elements 0 and 1 are already populated with env info
var path = process.argv[4];
var gameServerPort = process.argv[5];


//TODO: conf file
const lobbyServer = require('socket.io')(lobbyPort);
const io = require('socket.io-client');
const repl = require('repl');

var map = 1;
var player_id = 0;
var championSelectStarted = false;
var playersReady = 0;

const adminSettings = [{
    binding: "available-champions",
    name: "Availble Champions",
    help: "Champions available",
    field: "championSelectMulti"
}, {
    binding: "available-spells",
    name: "Available Spells",
    help: "Spells available",
    field: "summonerSpellSelectMulti"
}, {
    binding: "map",
    name: "Map",
    help: "Foo",
    field: "mapSelect",
    default: 11,
    options: "*"
}];

const teams = [{
    id: 0,
    name: "Order",
    color: "black",
    playerLimit: 5
}, {
    id: 1,
    name: "Chaos",
    color: "black",
    playerLimit: 5
}];

const players = [];
let playerId = 0;

function sendInitialData(conn) {
    teams.forEach(t => {
       conn.emit("teamlist-add", t); 
    });
    
    players.forEach(p => {
       conn.emit("playerlist-add", p); 
    });
    
    adminSettings.forEach(p => {
       conn.emit("settinglist-add", Object.assign({}, p, { host: true })); 
    });    
}

const connections = {};

function broadcast(name, data) {
    Object.keys(connections).map(x => connections[x]).forEach(conn => {
       conn.emit(name, data); 
    });
}

function sendHeartbeat() {
    connectionLobbyServer.emit('heartbeat', {
        id: lobbyConf.id,
        name: lobbyConf.name,
        owner: lobbyConf.owner,
        gamemodeName: lobbyConf.gamemodeName,
        playerLimit: lobbyConf.playerLimit,
        playerCount: Object.keys(connections).length,
        requirePassword: false
    });
}

const connectionLobbyServer = io.connect("http://127.0.0.1:9089", {reconnection: true, forceNew: true});
connectionLobbyServer.on("connect", () => {
    connectionLobbyServer.emit('heartbeat', {
        id: lobbyConf.id,
        name: lobbyConf.name,
        owner: lobbyConf.owner,
        gamemodeName: lobbyConf.gamemodeName,
        playerLimit: lobbyConf.playerLimit,
        playerCount: Object.keys(connections).length,
        requirePassword: false
    });
});

lobbyServer.on("connection", (conn) => {
    let id = playerId++;
    let player;
    connections[id] = conn;
    player_id++;
    
    conn.on("lobby-connect", data => {
        const firstFree = teams.filter(t => t.playerLimit - players.filter(p => p.teamId === t.id).length > 0)[0];
        player = {
            id: id,
            idServer: data.idServer,
            username: data.username,
            teamId: firstFree.id,
            isHost: Object.keys(connections).length == 1 ? true : false,
        };
        
        players.push(player);        
        broadcast("playerlist-add", player);
        conn.emit("lobby-connect", {
            ok: true,
            name: lobbyConf.name,
            owner: lobbyConf.owner,
            gamemodeName: lobbyConf.gamemodeName,
            playerId: player_id
        });
        sendInitialData(conn);
        sendHeartbeat();
    });

    conn.on("host", () => {
        conn.emit("host", {
            isHost: player.isHost
        });
    });
    
    conn.on("lobby-setting", data => {
        setting = adminSettings.filter(x => x.binding === data["setting-binding"])[0];
        setting.host = true;
        
        console.log(setting.binding + " set to " + data.value);
        if (setting.binding == "map"){
            map = data.value;
        }

        if (setting.binding === "champion") {
            player.championId = data.value;
            broadcast("playerlist-update", { id: id, championId: data.value });
            conn.emit("settinglist-update", { 
                binding: "skin" 
            });
        }
        
        if (setting.binding === "skin") {
            player.skinIndex = data.value;
            broadcast("playerlist-update", { 
                id, 
                skinIndex: data.value 
            });
        }
        
        if (setting.binding === "summonerSpells") {
            player.spell1id = data.value[0];
            player.spell1id = data.value[1];
            broadcast("playerlist-update", { 
                id, 
                spell1id: data.value[0], 
                spell2id: data.value[1] 
            });
        }
            
        Object.keys(connections).forEach(k => {
            if (connections[k] !== conn) {
                connections[k].emit("settinglist-update", { 
                    binding: setting.binding, 
                    value: data.value 
                });
            }
        });
    });
    
    conn.on("chat-message", data => {
        broadcast("chat-message", { 
            timestamp: new Date().getTime(), 
            sender: player.username, 
            message: data.message 
        });
    });
    
    conn.on("join-team", data => {
        player.teamId = data.team;
        broadcast("playerlist-update", { 
            id, 
            teamId: data.team 
        });
    });
    
    conn.on("disconnect", () => {
        delete connections[id];
        players.splice(players.indexOf(player), 1);
        broadcast("playerlist-remove", { 
            id 
        });
        if(Object.keys(connections).length == 0) {
            connectionLobbyServer.emit("close", {
                id: lobbyConf.id
            });
            process.exit();
        }
        else {
            if(player.isHost) {
                var firstPlayer = Object.keys(players)[0];
                players[firstPlayer].isHost = true;
                lobbyConf.owner = players[firstPlayer].username;
                connections[players[firstPlayer].id].emit("host", {
                    isHost: true
                });
                broadcast("playerlist-update", players[firstPlayer]);
            }
            sendHeartbeat();
        }
    });
    conn.on("start-game", () => {
        var GameFactory = require('./app/factories/GameFactory.js');
        GameFactory.startGameServer(players, gameServerPort, path, map, __dirname);
        broadcast("start-game", { 
            gameServerPort
        });
    });
    conn.on("start-championselect", () => {
        championSelectStarted = true;
        broadcast("start-championselect");
    });
    conn.on("select-champion", (data) => {
        selectChampion(player, data.championId)
        broadcast("start-championselect", { 
            gameServerPort
        });
    });
    conn.on("lock-champion", () => {
        lockChampion()
    });
});
function selectChampion(player, championId){
    player.championId = championId;
}
function lockChampion(){
    playersReady++;
    if (Object.keys(connections).length == playersReady){
        //Ready to start the game
        console.log("ready to launch")
    }
}

//repl.start('> ').context.broadcast = broadcast;

var fs = require('fs');
var path;
getGameServerPath();

var port = 9090;
var portMaterLobbyServer = 9089;
var io = require('socket.io')(port);
var masterLobbyServer = require('socket.io')(9089);
var ClientManagerService = require('./app/services/ClientManagerService');
var LobbyManagerService = require('./app/services/LobbyManagerService');

console.log("---------------------------");
console.log("League Sandbox Lobby Server");
console.log("Listening on port " + port);
console.log("---------------------------");

/**
 * Lobby server
 * Server where user log in to see other people and lobbies
 */

const connections = {};
let playerId = 0;

function broadcast(name, data) {
    Object.keys(connections).map(x => connections[x]).forEach(conn => {
        conn.emit(name, data); 
    });
}

io.on('connection', function(client){
    console.log("Client connected");
    let id = playerId++;
    connections[id] = client;
    client.playerId = id;
    client.username = "Unknown";
    client.idIcon = 0;
    ClientManagerService.connected(client);
    broadcast('users-add', 
        ClientManagerService.create(client)
    );

    client.on('lobby.list', function(){
        var lobbies = LobbyManagerService.getLobbies();
        client.emit('lobby.list', 
            lobbies
        );
    });

    client.on('lobby.create', function(options){
        options.owner = client.username;
        var newLobby = LobbyManagerService.create(options, path);
        //We send all the info to let clients add the new server to the list
        broadcast('lobbylist-add', newLobby);
        client.emit('lobby.create', newLobby);
        console.log("New lobby created with ID " + LobbyManagerService.lobbyCount);
    });

    client.on('user.list', function() {
        var clients = ClientManagerService.getClients();
        client.emit('user.list',
            clients
        );
    });

    client.on('user.userInfo', function(userInfo) {
        ClientManagerService.setData(client, userInfo);
        broadcast('users-update', 
            ClientManagerService.create(client)
        );
        client.emit('user.userInfo', ClientManagerService.create(client));
    });

    client.on('disconnect', function(){
        console.log("Client disconnected");
        broadcast('users-remove', 
            ClientManagerService.create(client)
        );
        ClientManagerService.disconnected(client);
    });
});

masterLobbyServer.on('connection', function(client) {

    client.on("heartbeat", function(data) {
        var lobby = LobbyManagerService.getLobbyById(data.id);
        lobby.name = data.name;
        lobby.owner = data.owner;
        lobby.playerLimit = data.playerLimit;
        lobby.playerCount = data.playerCount;
        lobby.gamemodeName = data.gamemodeName;
        lobby.requirePassword = data.requirePassword;

        broadcast('lobbylist-update', 
            LobbyManagerService.getLobbyById(data.id)
        );
    });

    client.on("close", function(data) {
        console.log("Close");
        LobbyManagerService.removeLobbyFromList(LobbyManagerService.getLobbyById(data.id));
        broadcast('lobbylist-remove', {
            id: data.id
        });
    });
});

function getGameServerPath(){
    if (fs.existsSync('./config/config.json')) {
        console.log("Checking your config file");   
        fs.readFile('./config/config.json', function read(err, data) {
            if (err) {
                throw err;
            }
            var config = data;
            var configData = JSON.parse(config);
            checkGameServer(configData.path);
        });
    } else {
        console.log("Couldn't find Config.json in config folder.");
        console.log("Please, download the file from the Github repository");
        process.exit();
    }
}
function checkGameServer(path2){
    if (fs.existsSync(path2)) {
        console.log("Detected GameServer!")
        path = path2;
    } else {
        console.log("---------------------------");
        console.log("Couldn't detect GameServer in: ");
        console.log(path2);
        console.log("Note that you should write the path for the exe of GameServer");
        console.log("---------------------------");
        process.exit();
    }
}

/**
 * Lobbies central server
 */
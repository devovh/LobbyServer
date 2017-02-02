var child_process = require('child_process');
var LobbyManagerService = require('../services/LobbyManagerService.js');

function LobbyFactory(){

  return {
    createLobby: createLobby
  };
  function createLobby(id, options, port, configPath, GameServerPort){
    var lobby;

    lobby = {
        id: id,
        name: options.name,
        owner: options.owner,
        playerLimit: options.playerLimit,
        playerCount: 0,
        gamemodeName: options.gamemodeName,
        requirePassword: false,
        address: "http://localhost",
        port: port
    };
    module.exports = {
        id: id,
        name: options.name,
        owner: options.owner,
        playerLimit: options.playerLimit,
        playerCount: 0,
        gamemodeName: options.gamemodeName,
        requirePassword: false,
        address: "http://localhost",
        port: port
    };
    var fork = require('child_process').fork;
    //We start a Lobby process and we send the port
    var child = fork('lobby', [JSON.stringify(lobby), port, configPath, GameServerPort]);
    return lobby;
  }
}
module.exports = LobbyFactory();

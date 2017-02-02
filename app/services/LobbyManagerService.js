var LobbyFactory = require('../factories/LobbyFactory');
var lobbies = [];
var lobbyCount = 0;
var lobbyPort = 20000;
var gameServerPort = 13565;

function LobbyManagerService(){

  return {
    getLobbies: getLobbies,
    create: create,
    getLobbyById: getLobbyById,
    removeLobbyFromList: removeLobbyFromList
  };

  function create(options, configPath){
    var newLobbyId = lobbyCount;
    module.exports.lobbyCount = lobbyCount;
    var newLobby = LobbyFactory.createLobby(newLobbyId, options, lobbyPort, configPath, gameServerPort);
    lobbyPort++;
    lobbyCount++;
    gameServerPort++;

    addLobbyToList(newLobby);

    return newLobby;
  }

  function getLobbies(){
    return lobbies;
  }

  function addLobbyToList(lobby){
    lobbies.push(lobby);
  }

  function removeLobbyFromList(lobby){
    lobbies.splice(lobbies.indexOf(lobby), 1);
  }

  function getLobbyById(idLobby) {
    return lobbies.filter(x => x.id === idLobby)[0];
  }
}

module.exports = LobbyManagerService();

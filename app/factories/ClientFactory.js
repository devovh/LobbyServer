function ClientFactory(){

  return {
    createClient: createClient
  };
  function createClient(clientInfo){
    var client;

    client = {
        id: clientInfo.playerId,
        username: clientInfo.username,
        idIcon: clientInfo.idIcon
    };
    module.exports = {
        id: clientInfo.playerId,
        username: clientInfo.username,
        idIcon: clientInfo.idIcon
    };
    return client;
  }
}
module.exports = ClientFactory();

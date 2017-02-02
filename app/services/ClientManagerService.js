var ClientFactory = require('../factories/ClientFactory');

function ClientManagerService(){
  var clients = [];

  return {
    connected: connected,
    disconnected: disconnected,
    setData: setData,
    create: create,
    getClients: getClients
  };

  function connected(client){
    clients.push(client);
  }
  
  function setData(client, data){
    clients[clients.indexOf(client)].username = data.username;
    clients[clients.indexOf(client)].idIcon = data.idIcon;
  }

  function create(client){
    return ClientFactory.createClient(clients[clients.indexOf(client)]);
  }

  function disconnected(client){
    clients.splice(clients.indexOf(client), 1);
  }

  function getClients() {
    var clientsBuilt = [];
    for(client in clients){
      clientsBuilt.push(ClientFactory.createClient(clients[client]));
    }
    return clientsBuilt;
  }
}

module.exports = ClientManagerService();

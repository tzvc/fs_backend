# FS_backend

## WORKFLOW

curl -X POST http://localhost:3000/api/register -d '{"username": "Maxime", "password": "alpine"}' -H "Content-Type: application/json"

-> {"userId":2,"username":"Maxime","password":"alpine"}

curl -X POST http://localhost:3000/api/login -d '{"username": "Maxime", "password": "alpine"}' -H "Content-Type: application/json"

-> {"userId":2,"username":"Maxime","password":"alpine","token":"Maxime2"}

---

```
var socket = require('socket.io-client')('http://localhost:3000/lobby');

var user = {
    username: 'Maxime',
    password: 'alpine',
    token: 'Maxime2',
};

socket.on('UPDATE_USERS_IN_ROOM', data => {
  console.log(data);
});

socket.on('UPDATE_ROOMS_IN_SERVER', data => {
  console.log(data);
});

socket.on('MESSAGE', data => {
  console.log(data);
});

socket.emit('LOGIN_REQUEST', user);
socket.emit('JOIN_ROOM_REQUEST', 'room1');

socket.emit('MESSAGE', {
  token: 'Maxime2',
  data: 'Heyyy !',
});
```

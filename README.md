# FS_backend

## CLIENT -> SERVER

### Global Header

- "LOGIN_REQUEST"

```
socket.emit('LOGIN_REQUEST', {
  username: 'root1',
  password: 'alpine1',
});
```

- "JOIN_ROOM_REQUEST"

```
socket.emit('JOIN_ROOM_REQUEST', 'Room1');
```

- "LEAVE_ROOM_REQUEST"

```
socket.emit('LEAVE_ROOM_REQUEST', 'Room1');
```

### Room Header

- "MESSAGE"

```
socket.emit('MESSAGE', {
    data: "Salut les gars"
});
```

## SERVER -> CLIENT

### Global Header

- "UPDATE_SERVER"

type: "ROOMS"
type: "USERS"

```
server.emit('UPDATE_SERVER', {
    type: "ROOMS",
    data: ["room1", "room2]
});

server.emit('UPDATE_SERVER', {
    type: "USERS",
    data: ["Maxime", "Theo]
});
```

---

- "MESSAGE_SERVER"

```
server.emit('MESSAGE_SERVER', {
    from: "Tartampion",
    message: "Hi guys !"
});
```

### Room Header

- "UPDATE_ROOM"

type: "USERS"

```
server.emit('UPDATE_ROOM', {
    type: "USERS",
    data: ["room1", "room2]
});```

---

- "MESSAGE_ROOM"

```
server.to('Room1').emit('MESSAGE_ROOM', {
    from: "Tartampion",
    message: "Hi guys !"
});
```

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

- "EVENT"

```
server.emit('EVENT', {
    data: "root1 joined the server"
});
```

- "MESSAGE"

```
server.emit('MESSAGE', {
    from: "Tartampion",
    message: "Hi guys !"
});
```

### Room Header

- "EVENT_ROOM"

```
server.emit('EVENT_ROOM', {
    data: "root1 joined the room",
});
```

- "MESSAGE_ROOM"

```
server.to('Room1').emit('MESSAGE_ROOM', {
    from: "Tartampion",
    message: "Hi guys !"
});
```

export class User {
  userId: number;
  username: string;
  password: string;
  token: string;
}

// FROM CLIENT

export class MessageFromClient {
  token: string;
  data: string;
}

export class ToggleReadyFromClient {
  token: string;
  isReady: boolean;
}

export class GameDirUpdateFromClient {
  token: string;
  key: number;
}


// FROM SERVER

export class MessageFromServer {
  from: string;
  data: string;
}

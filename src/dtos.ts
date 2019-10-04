export class User {
  userId: number;
  username: string;
  password: string;
  token: string;
}

export class MessageFromClient {
  token: string;
  data: string;
}

export class ToggleReadyFromClient {
  token: string;
  isReady: boolean;
}


export class MessageFromServer {
  from: string;
  data: string;
}

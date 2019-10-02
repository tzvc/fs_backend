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

export class NetworkMessageFromServer {
  from: string;
  data: string;
}

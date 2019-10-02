export class User {
  userId: number;
  username: string;
  password: string;
  token: string;
}

export class NetworkObjectAfterAuth {
  token: string;
  from: string;
  data: any;
}

export class Message extends NetworkObjectAfterAuth {
  any: string;
}

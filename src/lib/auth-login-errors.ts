import { CredentialsSignin } from "next-auth";

/** Auth.js URL dagi `code=` parametri (maxfiy ma’lumot bermaydi). */

export class LoginEmailNotVerified extends CredentialsSignin {
  constructor() {
    super();
    this.code = "email_not_verified";
  }
}

export class LoginAccountInactive extends CredentialsSignin {
  constructor() {
    super();
    this.code = "account_inactive";
  }
}

export class LoginRateLimited extends CredentialsSignin {
  constructor() {
    super();
    this.code = "rate_limited";
  }
}

export class LoginLockout extends CredentialsSignin {
  constructor() {
    super();
    this.code = "lockout";
  }
}

/** Redis yo‘q / rate limit fail-closed — olimpiada “himoya rejimi” bilan bir xil sabab. */
export class LoginRedisUnavailable extends CredentialsSignin {
  constructor() {
    super();
    this.code = "redis_unavailable";
  }
}

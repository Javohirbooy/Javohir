export type ActionResult<T = undefined> =
  | { ok: true; code?: string; data?: T }
  | { ok: false; error: string; code?: string; data?: T };

export function okResult<T = undefined>(data?: T, code?: string): ActionResult<T> {
  return data === undefined ? ({ ok: true, code } as ActionResult<T>) : ({ ok: true, code, data } as ActionResult<T>);
}

export function errResult<T = undefined>(error: string, code?: string, data?: T): ActionResult<T> {
  return data === undefined
    ? ({ ok: false, error, code } as ActionResult<T>)
    : ({ ok: false, error, code, data } as ActionResult<T>);
}

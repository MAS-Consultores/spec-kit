function Controller(_path: string): ClassDecorator {
  return () => undefined;
}

function Post(_path: string): MethodDecorator {
  return () => undefined;
}

@Controller("auth")
export class AuthController {
  @Post("login")
  login(): { ok: true } {
    return { ok: true };
  }
}

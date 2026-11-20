function FileInterceptor(..._args: unknown[]): MethodDecorator {
  return () => undefined;
}

function FilesInterceptor(..._args: unknown[]): MethodDecorator {
  return () => undefined;
}

export class UploadController {
  open(): unknown {
    return FileInterceptor("file");
  }

  many(): unknown {
    return FilesInterceptor("files", 4);
  }
}

function AnyFilesInterceptor(..._args: unknown[]): MethodDecorator {
  return () => undefined;
}

function MaxFileSizeValidator(_options: unknown): object {
  return {};
}

function ParseFilePipe(_options: unknown): ParameterDecorator {
  return () => undefined;
}

function UploadedFile(_pipe: unknown): ParameterDecorator {
  return () => undefined;
}

export class UploadController {
  save(
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 1024 })] }))
    _file: unknown,
  ): unknown {
    return AnyFilesInterceptor({ limits: { fileSize: 1024 * 1024 } });
  }
}

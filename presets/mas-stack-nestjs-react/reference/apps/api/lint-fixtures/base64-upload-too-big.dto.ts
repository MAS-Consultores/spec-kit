function IsBase64(): PropertyDecorator {
  return () => undefined;
}

function MaxLength(_max: number): PropertyDecorator {
  return () => undefined;
}

const MAX_BASE64 = 2_000_000;

export class DocumentDto {
  @IsBase64()
  @MaxLength(MAX_BASE64)
  documentBase64!: string;
}

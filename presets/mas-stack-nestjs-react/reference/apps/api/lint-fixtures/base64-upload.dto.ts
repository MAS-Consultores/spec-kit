function IsBase64(): PropertyDecorator {
  return () => undefined;
}

export class AvatarDto {
  @IsBase64()
  iconBase64!: string;

  fileContent!: string;
}

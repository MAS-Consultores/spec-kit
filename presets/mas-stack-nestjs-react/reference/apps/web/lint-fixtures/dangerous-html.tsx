export function View({ html }: { html: string }): React.ReactElement {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

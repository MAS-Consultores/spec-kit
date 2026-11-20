export function SettingsCard() {
  return (
    <section className="panel-card border-border bg-card text-card-foreground shadow-sm">
      <p className="section-label text-muted-foreground">{null}</p>
      <h5 className="text-foreground">{null}</h5>
      <p className="text-muted text-muted-foreground">{null}</p>
      <hr className="my-4 border-border" />
      <div className="flex items-center justify-between">
        <div>
          <span>{null}</span>
          <span className="badge bg-muted text-muted-foreground">{null}</span>
          <p className="text-muted-foreground">{null}</p>
        </div>
        <button type="button" role="switch" className="switch bg-primary" />
      </div>
    </section>
  );
}

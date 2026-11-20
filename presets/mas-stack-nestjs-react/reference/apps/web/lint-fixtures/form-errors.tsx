function useState<T>(value: T): [T, (next: T) => void] {
  return [value, () => undefined];
}

export function Form(): React.ReactElement {
  const [emailError, setEmailError] = useState("");
  return <form onSubmit={() => setEmailError("required")} />;
}

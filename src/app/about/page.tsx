export default function AboutPage() {
  return (
    <section className="panel">
      <h2>About</h2>
      <p>
        This is an open UI for text-to-video experiments. Use the Demo provider for a sample video, or provide tokens for supported providers. Respect each provider's terms of service.
      </p>
      <ul>
        <li>Replicate: set token and choose provider</li>
        <li>Hugging Face: set token and choose provider</li>
      </ul>
    </section>
  );
}

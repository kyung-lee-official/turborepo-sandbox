export const Content = () => {
  return (
    <main className="max-w-2xl space-y-6 p-12">
      <div className="space-y-2">
        <h1 className="font-semibold text-xl">async-generate-pdf-files</h1>
        <p className="text-neutral-700 text-sm">
          Placeholder page for async PDF generation. Wire upload, job progress,
          and download flows here.
        </p>
      </div>

      <section className="space-y-2 rounded border border-neutral-300 border-dashed bg-neutral-50 p-4 text-neutral-700 text-sm">
        <h2 className="font-medium text-neutral-900">Template sections</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Start PDF generation job</li>
          <li>Live progress (SSE or polling)</li>
          <li>Download completed PDF files</li>
        </ul>
      </section>
    </main>
  );
};

import { BookOpenText, ExternalLink } from "lucide-react";
import { interviewResources } from "../data/interviewResources";

export default function Resources() {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl">
        <section>
          <p className="section-label">Interview Resources</p>
          <h1 className="page-title">
            Interview Notes & Cheat Sheets
          </h1>
          <p className="page-copy">
            Access your interview preparation PDFs from one place.
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {interviewResources.map((resource) => (
            <div
              key={resource.id}
              className="surface flex flex-col justify-between p-6"
            >
              <div>
                <div className="mb-4 text-emerald-600">
                  <BookOpenText size={32} />
                </div>

                <h2 className="text-xl font-semibold">
                  {resource.name}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {resource.summary}
                </p>
              </div>

              <a
                href={resource.file}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-button mt-6 flex items-center justify-center gap-2"
              >
                Open PDF
                <ExternalLink size={16} />
              </a>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
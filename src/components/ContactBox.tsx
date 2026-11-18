import { useState, type FormEvent } from "react";

export interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  message: string;
  /** What the results screen recommended, so whoever answers has context. */
  context: string;
}

/**
 * "Si nos quieres dar más información" — shown under the results.
 *
 * UI only for now: nothing is sent anywhere yet. `submitContact` below is the
 * one place to wire a destination (email service, Formspree, own API...).
 * Until it is, do not ship this to production — the visitor is told their
 * message was received.
 */
async function submitContact(request: ContactRequest): Promise<void> {
  // TODO: send `request` to the real destination.
  console.info("[contact] not wired yet:", request);
}

export function ContactBox({ context }: { context: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const update =
    (field: keyof typeof form) =>
    (event: { target: { value: string } }) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    try {
      await submitContact({ ...form, context });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const input =
    "w-full rounded-xl bg-white px-4 py-3 text-sm text-ink ring-1 ring-black/10 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand";

  return (
    <section className="animate-fade-up mt-12 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5">
      <h2 className="text-xl font-extrabold tracking-tight">Si nos quieres dar más información</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Cuéntanos lo que no te hemos preguntado — tu tarifa actual, una factura reciente o
        cualquier detalle de tu consumo — y te contactamos con una recomendación más precisa.
      </p>

      {status === "sent" ? (
        <p className="mt-6 rounded-2xl bg-brand/10 p-5 text-sm font-medium text-brand-deep">
          ¡Gracias! Hemos recibido tu mensaje y te contactaremos pronto.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
          <input
            required
            className={input}
            placeholder="Nombre"
            autoComplete="name"
            value={form.name}
            onChange={update("name")}
          />
          <input
            required
            type="email"
            className={input}
            placeholder="Email"
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
          />
          <input
            type="tel"
            className={`${input} sm:col-span-2`}
            placeholder="Teléfono (opcional)"
            autoComplete="tel"
            value={form.phone}
            onChange={update("phone")}
          />
          <textarea
            required
            rows={4}
            className={`${input} resize-y sm:col-span-2`}
            placeholder="¿Qué más quieres contarnos?"
            value={form.message}
            onChange={update("message")}
          />

          {status === "error" && (
            <p role="alert" className="text-sm text-red-600 sm:col-span-2">
              No hemos podido enviar tu mensaje. Inténtalo de nuevo.
            </p>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-full bg-ink px-8 py-4 text-sm font-bold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {status === "sending" ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export default async function Home() {
  // Check if user is logged in
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const user = userCookie ? JSON.parse(userCookie.value) : null;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-serif">
            <span className="text-sage">◆</span> Salon
          </h1>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-ink/60">{user.name}</span>
              <Link href="/feed" className="btn-primary">
                Enter
              </Link>
            </div>
          ) : (
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="text-5xl font-serif leading-tight mb-6">
            A social media platform for scientists
          </h2>
          <p className="text-xl text-ink/70 leading-relaxed mb-8">
            Salon is a place for open discussions about scientific research.
            Share thoughts, discuss papers, and explore half-formed ideas with peers. 
            Like the coffeehouses and salons where modern science was born.
          </p>
          {!user && (
            <Link href="/login" className="btn-primary text-lg px-6 py-3">
              Join the Salon
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-ink/10 bg-paper/50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-sans text-sm uppercase tracking-wide text-sage mb-3">
                For Scientists & Tinkerers
              </h3>
              <p className="text-ink/70">
                A social graph built for researchers
              </p>
            </div>
            <div>
              <h3 className="font-sans text-sm uppercase tracking-wide text-sage mb-3">
                Built for sharing papers
              </h3>
              <p className="text-ink/70">
                Arxiv and DOI links automatically expand with titles, authors, abstracts. Easily search for posts that mention a paper to catch the latest discussions.
              </p>
            </div>
            <div>
              <h3 className="font-sans text-sm uppercase tracking-wide text-sage mb-3">
                Peer review at the speed of posting
              </h3>
              <p className="text-ink/70">
                Open, scientific discussion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-sm text-ink/40">
            Salon · Building the Republic of Science
          </p>
        </div>
      </footer>
    </main>
  );
}

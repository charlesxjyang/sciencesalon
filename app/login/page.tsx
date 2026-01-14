import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-serif">
            <span className="text-sage">&#9670;</span> Salon
          </Link>
          <p className="mt-2 text-ink/60">
            Sign in
          </p>
        </div>

        <div className="paper-card space-y-4">
          <a
            href="/auth/orcid"
            className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-lg border border-ink/20 hover:border-sage hover:bg-sage/5 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 256 256" fill="none">
              <path
                d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0z"
                fill="#A6CE39"
              />
              <path
                d="M86.3 186.2H70.9V79.1h15.4v107.1zm22.2 0V79.1h41.2c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.5-56.8 53.5h-41.4zm15.4-93.1v79.1h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.4-43.7-39.4H124v0zm-37.7-24.1c0-5.3-4.3-9.6-9.6-9.6-5.3 0-9.6 4.3-9.6 9.6 0 5.3 4.3 9.6 9.6 9.6 5.3 0 9.6-4.3 9.6-9.6z"
                fill="#fff"
              />
            </svg>
            <span className="font-medium">Login</span>
          </a>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-cream text-ink/40">or</span>
            </div>
          </div>

          <a
            href="/auth/google"
            className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-lg border border-ink/20 hover:border-sage hover:bg-sage/5 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">Sign in with Google</span>
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-ink/40">
          For scientists to discuss ideas before they become papers
        </p>
      </div>
    </div>
  );
}

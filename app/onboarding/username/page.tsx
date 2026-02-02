"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserData {
  orcid_id: string;
  name: string;
  provider?: "orcid" | "google";
}

export default function UsernameOnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [suggestedUsername, setSuggestedUsername] = useState("");

  // Google Scholar state (only for Google OAuth users)
  const [scholarUrl, setScholarUrl] = useState("");
  const [isCheckingScholar, setIsCheckingScholar] = useState(false);
  const [scholarError, setScholarError] = useState<string | null>(null);
  const [scholarValid, setScholarValid] = useState<boolean | null>(null);
  const [scholarName, setScholarName] = useState<string | null>(null);

  const isGoogleUser = user?.provider === "google";

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const userCookie = cookies.find((c) => c.trim().startsWith("salon_user="));

    if (!userCookie) {
      router.push("/login");
      return;
    }

    try {
      const value = decodeURIComponent(userCookie.split("=")[1]);
      const userData = JSON.parse(value);
      setUser(userData);

      // Generate suggested username from name
      if (userData.name) {
        const suggested = userData.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 15);
        if (suggested.length >= 4) {
          setSuggestedUsername(suggested);
        }
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  const checkUsername = useCallback(async (value: string) => {
    if (value.length < 4) {
      setIsAvailable(null);
      setError(value.length > 0 ? "Username must be at least 4 characters" : null);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/username/check?username=${encodeURIComponent(value)}`);
      const data = await response.json();

      if (data.available) {
        setIsAvailable(true);
        setError(null);
      } else {
        setIsAvailable(false);
        setError(data.error || "Username is not available");
      }
    } catch {
      setError("Failed to check username");
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const checkScholarUrl = useCallback(async (value: string) => {
    if (!value) {
      setScholarValid(null);
      setScholarError(null);
      setScholarName(null);
      return;
    }

    setIsCheckingScholar(true);
    setScholarError(null);

    try {
      const response = await fetch(`/api/scholar/validate?url=${encodeURIComponent(value)}`);
      const data = await response.json();

      if (data.valid) {
        setScholarValid(true);
        setScholarName(data.name);
        setScholarError(null);
      } else {
        setScholarValid(false);
        setScholarName(null);
        setScholarError(data.error || "Invalid Google Scholar profile");
      }
    } catch {
      setScholarError("Failed to validate Google Scholar URL");
      setScholarValid(null);
    } finally {
      setIsCheckingScholar(false);
    }
  }, []);

  // Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsername(username);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [username, checkUsername]);

  // Debounced Scholar URL check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (scholarUrl) {
        checkScholarUrl(scholarUrl);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [scholarUrl, checkScholarUrl]);

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(value);
    setIsAvailable(null);
  }

  function handleScholarUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setScholarUrl(e.target.value);
    setScholarValid(null);
    setScholarName(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isAvailable || !username) return;

    // For Google users, Scholar URL is optional but if provided must be valid
    if (isGoogleUser && scholarUrl && scholarValid === false) return;

    setIsSaving(true);

    try {
      // Set username
      const usernameResponse = await fetch("/api/username/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!usernameResponse.ok) {
        const data = await usernameResponse.json();
        setError(data.error || "Failed to set username");
        setIsSaving(false);
        return;
      }

      // Set Google Scholar ID if provided (for Google users)
      if (isGoogleUser && scholarUrl) {
        const scholarResponse = await fetch("/api/scholar/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: scholarUrl }),
        });

        if (!scholarResponse.ok) {
          const data = await scholarResponse.json();
          setScholarError(data.error || "Failed to set Google Scholar profile");
          setIsSaving(false);
          return;
        }
      }

      router.push("/onboarding");
    } catch {
      setError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  function useSuggested() {
    setUsername(suggestedUsername);
    checkUsername(suggestedUsername);
  }

  const canSubmit = isAvailable && (!isGoogleUser || !scholarUrl || scholarValid);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10 sticky top-0 bg-paper/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-serif">
            <span className="text-sage">&#9670;</span> Salon
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-medium">
            1
          </div>
          <div className="w-8 h-0.5 bg-ink/20" />
          <div className="w-8 h-8 rounded-full bg-ink/10 text-ink/40 flex items-center justify-center text-sm font-medium">
            2
          </div>
          <div className="w-8 h-0.5 bg-ink/20" />
          <div className="w-8 h-8 rounded-full bg-ink/10 text-ink/40 flex items-center justify-center text-sm font-medium">
            3
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-3">Set up your profile</h1>
          <p className="text-ink/60">
            {isGoogleUser
              ? "Choose a username and link your Google Scholar profile."
              : "This is how others will find and mention you on Salon."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Section */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-ink/80 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">@</span>
              <input
                type="text"
                id="username"
                value={username}
                onChange={handleUsernameChange}
                maxLength={15}
                className={`w-full pl-8 pr-10 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 transition-colors ${
                  error
                    ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                    : isAvailable
                    ? "border-green-300 focus:ring-green-200 focus:border-green-400"
                    : "border-ink/20 focus:ring-sage/20 focus:border-sage"
                }`}
                placeholder="username"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {isChecking && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
              )}
              {!isChecking && isAvailable && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {!isChecking && isAvailable === false && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              )}
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {isAvailable && <p className="mt-2 text-sm text-green-600">Username is available!</p>}
          </div>

          <div className="text-sm text-ink/60 space-y-1">
            <p>Username requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 text-ink/50">
              <li>4-15 characters</li>
              <li>Letters, numbers, and underscores only</li>
              <li>Cannot start with an underscore</li>
              <li>Cannot be only numbers</li>
            </ul>
          </div>

          {suggestedUsername && suggestedUsername !== username && (
            <div className="p-3 bg-sage/5 rounded-lg">
              <p className="text-sm text-ink/60 mb-2">Suggested based on your name:</p>
              <button
                type="button"
                onClick={useSuggested}
                className="text-sage font-medium hover:underline"
              >
                @{suggestedUsername}
              </button>
            </div>
          )}

          {/* Google Scholar Section (only for Google OAuth users) */}
          {isGoogleUser && (
            <>
              <hr className="border-ink/10" />

              <div>
                <label htmlFor="scholarUrl" className="block text-sm font-medium text-ink/80 mb-2">
                  Google Scholar Profile
                  <span className="text-ink/40 font-normal ml-1">(optional)</span>
                </label>
                <p className="text-sm text-ink/50 mb-3">
                  Link your Google Scholar profile to import your publications.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    id="scholarUrl"
                    value={scholarUrl}
                    onChange={handleScholarUrlChange}
                    className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 transition-colors ${
                      scholarError
                        ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                        : scholarValid
                        ? "border-green-300 focus:ring-green-200 focus:border-green-400"
                        : "border-ink/20 focus:ring-sage/20 focus:border-sage"
                    }`}
                    placeholder="https://scholar.google.com/citations?user=..."
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {isCheckingScholar && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </span>
                  )}
                  {!isCheckingScholar && scholarValid && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {!isCheckingScholar && scholarValid === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                </div>
                {scholarError && <p className="mt-2 text-sm text-red-600">{scholarError}</p>}
                {scholarValid && scholarName && (
                  <p className="mt-2 text-sm text-green-600">
                    Found profile: {scholarName}
                  </p>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={!canSubmit || isSaving}
            className="w-full py-3 bg-sage text-white rounded-lg hover:bg-sage/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        </form>
      </main>
    </div>
  );
}

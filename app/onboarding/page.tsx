"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TOPICS, TOPIC_CATEGORIES, getTopicsByCategory, type Topic } from "@/lib/topics";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [suggestedTopics, setSuggestedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<{ orcid_id: string; name: string } | null>(null);

  const topicsByCategory = getTopicsByCategory();

  useEffect(() => {
    // Get user from onboarding cookie and fetch suggested topics
    const cookies = document.cookie.split(";");
    const onboardingCookie = cookies.find((c) => c.trim().startsWith("salon_onboarding="));

    if (!onboardingCookie) {
      router.push("/login");
      return;
    }

    try {
      const value = decodeURIComponent(onboardingCookie.split("=")[1]);
      const userData = JSON.parse(value);
      setUser(userData);

      // Fetch suggested topics based on user's papers
      fetchSuggestedTopics(userData.orcid_id);
    } catch {
      router.push("/login");
    }
  }, [router]);

  async function fetchSuggestedTopics(orcidId: string) {
    try {
      const response = await fetch(`/api/users/${orcidId}/suggested-topics`);
      if (response.ok) {
        const data = await response.json();
        const suggested = new Set<string>(data.topics || []);
        setSuggestedTopics(suggested);
        setSelectedTopics(suggested); // Pre-select suggested topics
      }
    } catch (error) {
      console.error("Error fetching suggested topics:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleTopic(topicId: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!user) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: Array.from(selectedTopics),
        }),
      });

      if (response.ok) {
        router.push("/onboarding/follow");
      } else {
        console.error("Failed to save interests");
      }
    } catch (error) {
      console.error("Error saving interests:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSkip() {
    // Mark onboarding as complete without selecting topics
    handleSubmit();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10 sticky top-0 bg-paper/95 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-serif">
            <span className="text-sage">&#9670;</span> Salon
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="w-8 h-0.5 bg-sage" />
          <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-medium">
            2
          </div>
          <div className="w-8 h-0.5 bg-ink/20" />
          <div className="w-8 h-8 rounded-full bg-ink/10 text-ink/40 flex items-center justify-center text-sm font-medium">
            3
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-3">Welcome, {user?.name}!</h1>
          <p className="text-ink/60 max-w-xl mx-auto">
            Select your research interests to personalize your feed and discover relevant scientists to follow.
            {suggestedTopics.size > 0 && (
              <span className="block mt-2 text-sage">
                We&apos;ve pre-selected some topics based on your publications.
              </span>
            )}
          </p>
        </div>

        {/* Topic selection */}
        <div className="space-y-8 mb-8">
          {TOPIC_CATEGORIES.map((category) => (
            <div key={category}>
              <h2 className="font-medium text-lg mb-3 text-ink/80">{category}</h2>
              <div className="flex flex-wrap gap-2">
                {topicsByCategory[category].map((topic) => {
                  const isSelected = selectedTopics.has(topic.id);
                  const isSuggested = suggestedTopics.has(topic.id);

                  return (
                    <button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        isSelected
                          ? "bg-sage text-white"
                          : "bg-white border border-ink/20 text-ink/70 hover:border-sage/50"
                      } ${isSuggested && !isSelected ? "ring-2 ring-sage/30" : ""}`}
                      title={topic.description}
                    >
                      {topic.name}
                      {isSuggested && !isSelected && (
                        <span className="ml-1 text-sage">*</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected count and actions */}
        <div className="sticky bottom-0 bg-paper/95 backdrop-blur-sm border-t border-ink/10 -mx-6 px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="text-sm text-ink/60">
              {selectedTopics.size} topic{selectedTopics.size !== 1 ? "s" : ""} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-2 bg-sage text-white rounded-lg hover:bg-sage/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

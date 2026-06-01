'use client';

// Shared PostHog client. Fully no-op until NEXT_PUBLIC_POSTHOG_KEY is set,
// so this code deploys safely before you create the PostHog project.

import posthog from 'posthog-js';

let initialized = false;
let enabled = false;

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // we drive pageviews from the App Router
    capture_pageleave: true,
    autocapture: false, // explicit events only — keeps noise low
    disable_session_recording: true,
  });
  enabled = true;
}

export function isAnalyticsEnabled() {
  return enabled;
}

/** Identify the signed-in user. Safe to call multiple times. */
export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.identify(userId, traits);
}

/** Forget the user (call on sign-out). */
export function resetAnalytics() {
  if (!enabled) return;
  posthog.reset();
}

/** Fire a custom event. */
export function track(event: string, props?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.capture(event, props);
}

/** Manual pageview — call on route change. */
export function trackPageview(url: string) {
  if (!enabled) return;
  posthog.capture('$pageview', { $current_url: url });
}

// Named event constants so we don't fat-finger event names site-wide.
export const Events = {
  // Auth
  SignedUp: 'signed_up',
  SignedIn: 'signed_in',
  SignedOut: 'signed_out',
  OnboardingCompleted: 'onboarding_completed',
  // Social
  PostCreated: 'post_created',
  BitCreated: 'bit_created',
  PostLiked: 'post_liked',
  PostCommented: 'post_commented',
  Followed: 'followed',
  // Messaging
  MessageSent: 'message_sent',
  // Marketplace
  GigCreated: 'gig_created',
  GigApplied: 'gig_applied',
  ApplicationAccepted: 'application_accepted',
  BookingStatusChanged: 'booking_status_changed',
} as const;

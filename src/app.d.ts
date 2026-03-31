/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

// Extend Auth.js session type to include id, role, firstName, lastName, username on the user object.
// These are added in the `session` JWT callback in src/lib/server/auth.ts.
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      role: string;
      firstName?: string | null;
      lastName?: string | null;
      username?: string | null;
      email?: string | null;
    } & import("@auth/core/types").DefaultSession["user"];
  }
}

export {};

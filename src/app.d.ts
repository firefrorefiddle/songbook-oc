/// <reference types="@sveltejs/kit" />
/// <reference types="@auth/sveltekit" />

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
declare module "@auth/sveltekit" {
  interface Session {
    user: {
      id: string;
      role: string;
      firstName?: string | null;
      lastName?: string | null;
      username?: string | null;
      email?: string | null;
    } & DefaultSession["user"];
  }
}

// Extend Prisma User type to include new fields
declare module "@prisma/client" {
  interface User {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  }
}

export {};

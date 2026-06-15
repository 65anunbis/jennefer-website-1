import type { AdminRole } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    username: string;
    role: AdminRole;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: AdminRole;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: AdminRole;
    mustChangePassword: boolean;
  }
}

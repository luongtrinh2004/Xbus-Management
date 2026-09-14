// File: src/libs/auth.js

// Third-party Imports
import CredentialProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getSettings, getUsers, saveUsers } from "@/libs/jsonRepository";

export const authOptions = {
  providers: [
    CredentialProvider({
      name: "Admin Credentials",
      type: "credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password || "";

        if (!email || !password) {
          throw new Error("Email và mật khẩu là bắt buộc");
        }

        const jsonUser = getUsers().find(
          (u) => u.email?.toLowerCase() === email,
        );
        if (jsonUser?.password) {
          const match = await bcrypt.compare(
            password,
            String(jsonUser.password),
          );
          if (match) {
            return {
              id: jsonUser.id,
              email: jsonUser.email,
              name: jsonUser.name || "Người dùng",
              role: jsonUser.role || "user",
              gender: jsonUser.gender || "unspecified",
              avatar: jsonUser.avatarUrl || null,
            };
          }
        }

        throw new Error("Sai email hoặc mật khẩu");
      },
    }),

    // Giữ GoogleProvider nếu bạn dùng, không thì có thể xóa
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;

      const email = user.email.trim().toLowerCase();
      const settings = getSettings();
      const domain = email.split("@")[1];
      if (!domain || !(settings.companyEmailDomains || []).includes(domain))
        return false;

      const users = getUsers();
      if (!users.some((item) => item.email?.toLowerCase() === email)) {
        users.unshift({
          id: `usr_${Date.now()}`,
          googleId: user.id || "",
          name: user.name || "",
          email,
          code: "",
          avatarUrl: user.image || "",
          gender: "unspecified",
          phone: "",
          role: settings.defaultRole || "user",
          typeId: "",
          categoryId: "",
          status: settings.defaultUserStatus || "disabled",
          schedulingPoints: 0,
          waterTripCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          activatedAt: null,
          activatedBy: null,
        });
        saveUsers(users);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const storedUser = getUsers().find(
          (item) => item.email?.toLowerCase() === user.email?.toLowerCase(),
        );
        token.id = storedUser?.id || user.id;
        token.role = storedUser?.role || user.role || "user";
        token.gender = storedUser?.gender || user.gender || "unspecified";
        token.avatar =
          storedUser?.avatarUrl || user.avatar || user.image || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.gender = token.gender;
        session.user.avatar = token.avatar;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

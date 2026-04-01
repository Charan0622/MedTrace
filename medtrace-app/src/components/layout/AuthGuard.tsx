"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!isLoggedIn && !isPublicPath) {
      router.replace("/login");
    }
  }, [isLoggedIn, isPublicPath, router]);

  // On public path, render regardless
  if (isPublicPath) return <>{children}</>;

  // On protected path, only render if logged in
  if (!isLoggedIn) return null;

  return <>{children}</>;
}

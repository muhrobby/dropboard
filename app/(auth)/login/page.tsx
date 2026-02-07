"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("[Login] Starting login for:", email);
      
      const result = await signIn.email({
        email,
        password,
      });

      console.log("[Login] Response:", { 
        hasError: !!result.error, 
        hasUser: !!result.data?.user
      });

      if (result.error) {
        console.error("[Login] Error:", result.error);
        toast.error(result.error.message || "Login failed");
        return;
      }

      // Check if login actually succeeded
      if (!result.data?.user) {
        console.error("[Login] No user in response");
        toast.error("Login failed - no user data received");
        return;
      }

      console.log("[Login] Login successful, preparing redirect");
      toast.success("Login successful");

      // Get redirect URL
      const callbackUrl = searchParams.get("callbackUrl");
      const redirectTo = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
      
      console.log("[Login] Redirect to:", redirectTo);

      // Wait a bit for cookies to be set, then redirect using window.location for reliability
      setTimeout(() => {
        console.log("[Login] Executing redirect");
        window.location.href = redirectTo;
      }, 500);

    } catch (error) {
      console.error("[Login] Exception:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Dropboard</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={12}
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
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
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password strength
    const hasMinLength = password.length >= 12;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (
      !hasMinLength ||
      !hasUppercase ||
      !hasLowercase ||
      !hasNumber ||
      !hasSpecial
    ) {
      toast.error("Password tidak memenuhi syarat keamanan");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        toast.error(result.error.message || "Registration failed");
        return;
      }

      toast.success("Account created successfully!");

      // Get redirect URL from callbackUrl param (for invite flow)
      const callbackUrl = searchParams.get("callbackUrl");
      const redirectTo =
        callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

      // Wait a bit for cookies to be set, then redirect
      setTimeout(() => {
        router.refresh();
        router.push(redirectTo);
      }, 500);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Dropboard</CardTitle>
        <CardDescription>Create your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 mb-3">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="name"
            />
          </div>
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
            <PasswordInput
              id="password"
              placeholder="Min. 12 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
            <PasswordStrength
              password={password}
              confirmPassword={confirmPassword}
              showConfirmation={confirmPassword.length > 0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

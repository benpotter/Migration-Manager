"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  domain: {
    title: "Access Denied",
    message:
      "Your email domain is not authorized. Only @madcollective.com and @roguecc.edu accounts can access this application.",
  },
  confirmation_failed: {
    title: "Confirmation Failed",
    message: "The email confirmation link is invalid or has expired. Please try signing up again.",
  },
  no_user: {
    title: "Authentication Error",
    message: "Could not retrieve user information. Please try again.",
  },
};

const DEFAULT_ERROR = {
  title: "Something Went Wrong",
  message: "An unexpected error occurred during authentication. Please try again.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") ?? "";
  const { title, message } = ERROR_MESSAGES[errorCode] ?? DEFAULT_ERROR;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">
            {title}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/auth/login">Back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}

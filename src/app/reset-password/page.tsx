"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

// Loading component for the suspense fallback
function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-blue-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

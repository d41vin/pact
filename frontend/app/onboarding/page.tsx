"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAppKitAccount } from "@reown/appkit/react";
import { useUsernameValidation } from "@/hooks/useUsernameValidation";
import { useXmtpClient } from "@/hooks/use-xmtp-client";

// Form Validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { UserRound, CheckCircle2, Loader2, Lock, ShieldCheck, Wallet } from "lucide-react";

// Validation schema
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters." })
    .regex(
      /^[a-z0-9_.]+$/,
      "Use only lowercase letters, numbers, underscores, or periods.",
    ),
  profileImage: z
    .any()
    .optional()
    .refine((file) => !file || file.size > 0, "Image is required if selected.")
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024,
      "Image must be less than 5MB.",
    ),
});

type FormValues = z.infer<typeof formSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { address, isConnected, status, embeddedWalletInfo } =
    useAppKitAccount();
  const { initializeClient, isInitializing } = useXmtpClient();

  const [signupStep, setSignupStep] = useState<"profile" | "messaging">("profile");

  // Check for existing user
  const user = useQuery(api.users.getUser, {
    userAddress: address ?? "",
  });

  // Redirect if user already exists
  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  // Redirect if not connected
  useEffect(() => {
    if (status === "disconnected") {
      router.replace("/");
    }
  }, [status, router]);

  // Mutations
  const createUser = useMutation(api.users.createUser);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      profileImage: undefined,
    },
  });

  const watchedUsername = form.watch("username");

  // Username validation hook
  const {
    isValid: isUsernameValid,
    error: usernameError,
    isChecking,
  } = useUsernameValidation({
    username: watchedUsername || "",
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (!address || !isUsernameValid) return;

    try {
      let profileImageId: Id<"_storage"> | undefined = undefined;

      if (data.profileImage) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": data.profileImage.type },
          body: data.profileImage,
        });
        const { storageId } = await result.json();
        profileImageId = storageId;
      }

      const userEmail = embeddedWalletInfo?.user?.email ?? undefined;

      await createUser({
        name: data.name,
        username: data.username.toLowerCase(),
        userAddress: address,
        email: userEmail,
        profileImageId: profileImageId,
      });

      toast.success("Profile created successfully!");
      // Transition to messaging step instead of redirecting immediately
      setSignupStep("messaging");
    } catch (error) {
      console.error("Onboarding failed", error);
      toast.error("Failed to create profile. Please try again.");
    }
  };

  const handleEnableMessaging = async () => {
    try {
      await initializeClient();
      router.push("/home");
    } catch (error) {
      // Error is handled by the provider/toast mostly, but we can log
      console.error("Messaging init failed", error);
    }
  };

  const handleSkip = () => {
    router.push("/home");
  };

  // Loading state
  if (status === "connecting" || (isConnected && user === undefined)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  // Don't render if user exists or not connected
  if (!isConnected || user) {
    return null;
  }

  // Messaging Step
  if (signupStep === "messaging") {
    // Check if using embedded wallet (likely Social Login)
    // NOTE: This logic assumes embeddedWalletInfo presence means Social Login / non-EOA restriction.
    // Adjust if AppKit behavior differs.
    const isSocialLogin = !!embeddedWalletInfo;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              {isSocialLogin ? (
                <Wallet className="h-8 w-8 text-blue-500" />
              ) : (
                <ShieldCheck className="h-8 w-8 text-blue-500" />
              )}
            </div>
            <CardTitle>
              {isSocialLogin ? "Messaging Requires a Wallet" : "Enable Messaging"}
            </CardTitle>
            <CardDescription className="pt-2">
              {isSocialLogin
                ? "Secure messaging uses wallet signatures. You can enable messaging later by connecting a compatible wallet."
                : "Pact uses secure, wallet-based messaging. Enabling messaging lets friends message you right away."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSocialLogin && (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  <p>Requires a one-time signature. No gas fees.</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {isSocialLogin ? (
              <Button onClick={handleSkip} className="w-full">
                Continue
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleEnableMessaging}
                  className="w-full"
                  disabled={isInitializing}
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up secure messaging...
                    </>
                  ) : (
                    "Enable Messaging"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="w-full"
                  disabled={isInitializing}
                >
                  Skip for now
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </main>
    );
  }

  // Profile Step (Existing UI)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* ... Existing Card Content ... */}
            <CardHeader>
              <CardTitle>Welcome to Pact</CardTitle>
              <CardDescription>
                Create your profile to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormField
                control={form.control}
                name="profileImage"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <label
                        htmlFor="profileImage-upload"
                        className="cursor-pointer"
                      >
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={imagePreview ?? undefined} />
                          <AvatarFallback>
                            <UserRound className="h-12 w-12" />
                          </AvatarFallback>
                        </Avatar>
                      </label>
                    </FormControl>
                    <FormLabel>
                      <Button asChild variant="outline" type="button">
                        <label htmlFor="profileImage-upload">
                          Upload Picture
                        </label>
                      </Button>
                    </FormLabel>
                    <Input
                      id="profileImage-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("Profile image must be less than 5MB");
                            return;
                          }
                          field.onChange(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="e.g. johndoe"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toLowerCase())
                          }
                          className={
                            usernameError
                              ? "border-red-500 pr-10"
                              : isUsernameValid && watchedUsername
                                ? "border-green-500 pr-10"
                                : "pr-10"
                          }
                        />
                        <div className="absolute top-1/2 right-3 -translate-y-1/2">
                          {isChecking && (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                          )}
                          {!isChecking &&
                            isUsernameValid &&
                            watchedUsername && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {usernameError ? (
                        <span className="text-red-500">{usernameError}</span>
                      ) : isChecking ? (
                        <span className="text-zinc-500">
                          Checking availability...
                        </span>
                      ) : isUsernameValid && watchedUsername ? (
                        <span className="text-green-600">
                          Username is available!
                        </span>
                      ) : (
                        "This is your unique public name."
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  form.formState.isSubmitting || !isUsernameValid || isChecking
                }
              >
                {form.formState.isSubmitting && <Spinner className="size-6" />}
                Save and Continue
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";

// Form Validation - The shadcn/ui way
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// UI Components from shadcn/ui
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
import { Loader2, UserRound } from "lucide-react";

// 1. Define the validation schema with Zod. This is our single source of truth for form data.
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters." })
    .regex(
      /^[a-z0-9_.]+$/,
      "Use only lowercase letters, numbers, underscores, or periods.",
    ),
  // Using .any() for file type, then refining it for detailed checks.
  profileImage: z
    .any()
    .optional()
    .refine((file) => !file || file.size > 0, "Image is required if selected.")
    .refine(
      (file) => !file || file.size <= 4 * 1024 * 1024,
      "Image must be less than 4MB.",
    ),
});

type FormValues = z.infer<typeof formSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { address, isConnected, status } = useAppKitAccount();

  // 2. Gatekeeping Logic: Check for existing users and handle loading states
  const user = useQuery(api.users.getUser, {
    // Skip the query until we have an address to check
    userAddress: address ?? "",
  });

  // Redirect to home if user already exists
  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  // If not connected, redirect to login page (assuming it's '/')
  useEffect(() => {
    if (status === "disconnected") {
      router.replace("/");
    }
  }, [status, router]);

  // 3. Connect to Convex backend functions
  const createUser = useMutation(api.users.createUser);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 4. Initialize React Hook Form using the shadcn/ui pattern
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      profileImage: undefined,
    },
  });

  // 5. Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (!address) return;

    try {
      let profileImageId: any | undefined = undefined;

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

      await createUser({
        name: data.name,
        username: data.username.toLowerCase(),
        userAddress: address,
        profileImageId: profileImageId,
      });

      router.push("/home");
    } catch (error) {
      console.error("Onboarding failed", error);
      alert("Failed to create profile. The username might be taken.");
    }
  };

  // Loading state: Show a spinner while connecting or fetching user data
  if (status === "connecting" || (isConnected && user === undefined)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  // Don't render the form until we know the user is new
  if (!isConnected || user) {
    return null;
  }

  // 6. Build the form with shadcn/ui's <Form> components
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                      <Input placeholder="e.g. johndoe" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your unique public name.
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
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save and Continue
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
}

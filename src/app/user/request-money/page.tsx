
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { initiateMoneyRequestAction, type InitiateMoneyRequestFormValues } from "@/actions/userActions";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ArrowLeft, Loader2, HandCoins, User, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const requestMoneySchema = z.object({
  payerUsername: z.string().min(3, "Payer's username must be at least 3 characters."),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number."})
      .positive("Amount must be a positive number.")
  ),
});

export default function RequestMoneyPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // This is the requester
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const form = useForm<InitiateMoneyRequestFormValues>({
    resolver: zodResolver(requestMoneySchema),
    defaultValues: {
      payerUsername: "",
      amount: undefined,
    },
  });

  const onSubmit: SubmitHandler<InitiateMoneyRequestFormValues> = async (data) => {
    if (!user) {
      setFormError("You must be logged in to request money.");
      return;
    }
    setIsLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await initiateMoneyRequestAction({ ...data, requesterUserId: user.id });
    setIsLoading(false);

    if (result.success) {
      setFormSuccess(result.message);
      toast({
        title: "Request Sent!",
        description: result.message,
      });
      form.reset();
    } else {
      setFormError(result.message);
      toast({
        title: "Request Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <LoadingLink href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </LoadingLink>
      <Card className="max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><HandCoins className="text-primary"/> Request Money</CardTitle>
          <CardDescription>Ask another user to send you funds. They will need to approve your request.</CardDescription>
        </CardHeader>
        <CardContent>
           {formError && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Request Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {formSuccess && (
            <Alert variant="default" className="mb-4 bg-green-50 border-green-200 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{formSuccess}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="payerUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><User className="h-4 w-4 text-muted-foreground"/> Payer's Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username of person to request from" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-muted-foreground"/> Amount to Request</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g., 15.00" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Request...</> : "Send Money Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


import { LoginForm } from "@/components/auth/LoginForm";
import { DemoLogins } from "@/components/auth/DemoLogins";

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary">
      <div className="container mx-auto flex flex-col items-center space-y-8">
        <LoginForm />
        <DemoLogins />
      </div>
    </main>
  );
}

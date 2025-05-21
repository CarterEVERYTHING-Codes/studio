
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUsers } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { UserCircle } from "lucide-react";

export function DemoLogins() {
  return (
    <Card className="mt-8 w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2"><UserCircle className="text-primary"/> Demo Login Credentials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockUsers.map((user) => (
          <div key={user.id} className="p-3 border rounded-md bg-muted/50">
            <div className="flex justify-between items-center mb-1">
              <p className="font-semibold text-sm">{user.name}</p>
              <Badge variant={
                user.role === 'admin' ? 'destructive' :
                user.role === 'business' ? 'secondary' : 'default'
              } className="capitalize text-xs">
                {user.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Username: <span className="font-mono text-foreground">{user.username}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Password: <span className="font-mono text-foreground">{user.password}</span>
            </p>
          </div>
        ))}
         <p className="text-xs text-center text-muted-foreground pt-2">These credentials are for testing purposes only.</p>
      </CardContent>
    </Card>
  );
}

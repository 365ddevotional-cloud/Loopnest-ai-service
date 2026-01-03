import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4 shadow-xl border-primary/10">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 font-serif">
            The page you are looking for does not exist. It might have been moved or deleted.
          </p>

          <div className="mt-6">
            <Link href="/">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                Return Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDevotionalSchema } from "@shared/schema";
import { useCreateDevotional } from "@/hooks/use-devotionals";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const formSchema = insertDevotionalSchema.extend({
  // Override to handle string dates from input
  date: z.string(), 
});

type FormValues = z.infer<typeof formSchema>;

export function CreateDevotionalForm() {
  const { mutate, isPending } = useCreateDevotional();
  const [prayerPointInput, setPrayerPointInput] = useState("");
  const [faithDeclInput, setFaithDeclInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      title: "",
      scriptureReference: "",
      scriptureText: "",
      content: "",
      prayerPoints: [],
      faithDeclarations: [],
      author: "Moses Afolabi",
    },
  });

  const onSubmit = (data: FormValues) => {
    mutate(data, {
      onSuccess: () => {
        form.reset();
        // Reset defaults specifically because form.reset clears everything
        form.setValue("date", format(new Date(), "yyyy-MM-dd"));
        form.setValue("author", "Moses Afolabi");
      }
    });
  };

  const addListItem = (field: "prayerPoints" | "faithDeclarations", value: string, setValue: (s: string) => void) => {
    if (!value.trim()) return;
    const current = form.getValues(field);
    form.setValue(field, [...current, value]);
    setValue("");
  };

  const removeListItem = (field: "prayerPoints" | "faithDeclarations", index: number) => {
    const current = form.getValues(field);
    form.setValue(field, current.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="bg-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} className="bg-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Walking in Victory" {...field} className="bg-white font-serif text-lg" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="scriptureReference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scripture Reference</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Psalm 23:1" {...field} className="bg-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="scriptureText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scripture Text</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="The Lord is my shepherd..." 
                  {...field} 
                  className="bg-white min-h-[80px]" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Main Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Write the devotional content here..." 
                  {...field} 
                  className="bg-white min-h-[200px] font-serif" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-8">
          {/* Prayer Points Manager */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <FormLabel>Prayer Points</FormLabel>
            <div className="flex gap-2">
              <Input 
                value={prayerPointInput} 
                onChange={(e) => setPrayerPointInput(e.target.value)}
                placeholder="Add a prayer point..."
                className="bg-white"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem("prayerPoints", prayerPointInput, setPrayerPointInput))}
              />
              <Button 
                type="button" 
                size="icon"
                onClick={() => addListItem("prayerPoints", prayerPointInput, setPrayerPointInput)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <ul className="space-y-2">
              {form.watch("prayerPoints").map((point, idx) => (
                <li key={idx} className="flex items-start justify-between gap-2 text-sm bg-white p-2 rounded shadow-sm">
                  <span>{point}</span>
                  <button 
                    type="button"
                    onClick={() => removeListItem("prayerPoints", idx)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Faith Declarations Manager */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <FormLabel>Faith Declarations</FormLabel>
            <div className="flex gap-2">
              <Input 
                value={faithDeclInput} 
                onChange={(e) => setFaithDeclInput(e.target.value)}
                placeholder="Add a declaration..."
                className="bg-white"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem("faithDeclarations", faithDeclInput, setFaithDeclInput))}
              />
              <Button 
                type="button" 
                size="icon"
                onClick={() => addListItem("faithDeclarations", faithDeclInput, setFaithDeclInput)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <ul className="space-y-2">
              {form.watch("faithDeclarations").map((decl, idx) => (
                <li key={idx} className="flex items-start justify-between gap-2 text-sm bg-white p-2 rounded shadow-sm">
                  <span>{decl}</span>
                  <button 
                    type="button"
                    onClick={() => removeListItem("faithDeclarations", idx)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isPending} 
          className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20"
        >
          {isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {isPending ? "Publishing..." : "Publish Devotional"}
        </Button>
      </form>
    </Form>
  );
}

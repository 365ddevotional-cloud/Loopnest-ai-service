import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMusicPrice } from "@shared/music-regions";

type ShopProduct = {
  id: string; title: string; kind: string; visits: number;
  fileCount: number; filesReady: boolean; paused: boolean;
};
type ShopOrder = {
  reference: string; productId: string; amount: number;
  currency: string; status: string; createdAt: string;
};
type ShopDashboard = {
  readiness: {
    checkoutConfigured: boolean; storageConfigured: boolean;
    stripeConfigured: boolean; webhookConfigured: boolean; countries: string[];
  };
  products: ShopProduct[];
  orders: ShopOrder[];
};

const adminKey = ["/api/admin/ministry-shop"] as const;

export default function MinistryShopAdmin() {
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const client = useQueryClient();
  const dashboard = useQuery<ShopDashboard>({ queryKey: adminKey });
  const changeSales = useMutation({
    mutationFn: async (product: ShopProduct) => {
      const response = await apiRequest("PATCH", `/api/admin/ministry-shop/${encodeURIComponent(product.id)}/sales`, { paused: !product.paused });
      return response.json() as Promise<{ id: string; paused: boolean }>;
    },
    onSuccess: async (result, product) => {
      client.setQueryData<ShopDashboard>(adminKey, current => current && ({
        ...current, products: current.products.map(item => item.id === result.id ? { ...item, paused: result.paused } : item),
      }));
      setFeedback(result.paused ? `Sales paused for ${product.title}.` : `Sales hold removed for ${product.title}.`);
      await Promise.all([
        client.invalidateQueries({ queryKey: adminKey }),
        client.invalidateQueries({ queryKey: ["ministry-shop-prices"] }),
      ]);
    },
  });

  const data = dashboard.data;
  return (
    <section aria-labelledby="admin-shop-heading" className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="admin-shop-heading" className="font-serif text-2xl font-bold">365 Ministry Shop</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review products, visits, file readiness, and orders.</p>
        </div>
        <Button asChild variant="outline"><Link href="/shop">Open storefront</Link></Button>
      </header>
      {dashboard.isLoading && <p role="status">Loading shop administration…</p>}
      {dashboard.isError && (
        <div className="space-y-2">
          <p role="alert">Shop data could not be loaded. Check the admin session and Shop migrations.</p>
          <Button variant="outline" onClick={() => void dashboard.refetch()} disabled={dashboard.isFetching}>Try again</Button>
        </div>
      )}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([
              ["Checkout configuration", data.readiness.checkoutConfigured ? "Enabled" : "Off"],
              ["Private storage", data.readiness.storageConfigured ? "Configured" : "Pending"],
              ["Stripe key", data.readiness.stripeConfigured ? "Configured" : "Pending"],
              ["Shop webhook", data.readiness.webhookConfigured ? "Configured" : "Pending"],
            ]).map(([label, status]) => (
              <div key={label} className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-semibold">{status}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">Configured checkout countries · {data.readiness.countries.join(", ") || "None"}</p>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Products ({data.products.length})</h3>
              <p className="text-sm text-muted-foreground">Pausing stops new checkout requests for the item. Previously issued checkout links and purchases are unaffected.</p>
            </div>
            <Input value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Search products" aria-label="Search shop products" className="w-full sm:w-56" />
          </div>
          {feedback && <p role="status" className="text-sm">{feedback}</p>}
          {changeSales.isError && <p role="alert" className="text-sm text-destructive">The sales status could not be saved. Refresh and try again.</p>}
          <div className="max-h-[32rem] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>{["Product", "Visits", "Files", "Sales"].map(label => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr>
              </thead>
              <tbody>
                {data.products.filter(item => `${item.title} ${item.kind}`.toLowerCase().includes(search.trim().toLowerCase())).map(item => (
                  <tr key={item.id} className="border-t">
                    <th scope="row" className="min-w-44 px-3 py-2 text-left font-medium">
                      <Link href={`/shop/${item.id}`} className="hover:underline">{item.title}</Link>
                      <span className="block text-xs font-normal text-muted-foreground">{item.kind}</span>
                    </th>
                    <td className="px-3 py-2">{item.visits.toLocaleString()}</td>
                    <td className="min-w-32 px-3 py-2">
                      {item.filesReady ? `${item.fileCount} registered` : item.fileCount ? "Review file type" : "Pending"}
                    </td>
                    <td className="min-w-36 px-3 py-2">
                      {item.kind === "Membership" ? "Membership" : (
                        <Button size="sm" variant="outline" disabled={changeSales.isPending}
                          aria-label={`${item.paused ? "Remove sales hold for" : "Pause sales for"} ${item.title}`}
                          onClick={() => { setFeedback(""); changeSales.mutate(item); }}>
                          {item.paused ? "Remove hold" : "Pause sales"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-semibold">Latest 50 orders</h3>
            {data.orders.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No shop orders yet.</p> : (
              <ul className="mt-2 divide-y rounded-lg border">
                {data.orders.map(order => (
                  <li key={order.reference} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <div>
                      <p className="font-medium">{data.products.find(item => item.id === order.productId)?.title ?? order.productId}</p>
                      <p className="text-muted-foreground">{order.reference} · {new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <p>{formatMusicPrice(order.amount, order.currency)} · <span className="capitalize">{order.status}</span></p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

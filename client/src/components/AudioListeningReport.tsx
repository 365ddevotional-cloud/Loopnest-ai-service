import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
type Total = { kind: string; language: string; starts: number; guests: number; accounts: number };
type Account = { account_id: string; email: string | null; kind: string; language: string; starts: number; latest: string };
const languages: Record<string,string> = { en:"English", yo:"Yorùbá", ig:"Igbo", ha:"Hausa", pcm:"Nigerian Pidgin", es:"Spanish", fr:"French" };
const section = (kind: string) => kind === "school" ? "Sunday School" : "Devotional";
export function AudioListeningReport() {
  const [page,setPage] = useState(0);
  const path = "/api/admin/audio-listening";
  const report = useQuery<{totals:Total[];accounts:Account[];more:boolean}>({
    queryKey:[path,page], queryFn:async () => (await apiRequest("GET",path+"?page="+page)).json(),
    retry:false,refetchInterval:60000,
  });
  return <section className="mb-4 space-y-2 rounded-lg border p-4">
    <h3 className="font-semibold">Audio listeners · last 30 days</h3>
    <p className="text-sm">Counts begin with this update. Each opened devotional or lesson counts once per spoken language when playback starts.</p>
    {(report.isError || (report.data && (!Array.isArray(report.data.totals) || !Array.isArray(report.data.accounts)))) ? <p role="alert">Listening statistics could not load.</p> : !report.data ? <p>Loading listening statistics…</p> : <>
      {report.data.totals.length ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Section","Language","Starts","Guest starts","Accounts"].map(h=><th key={h}>{h}</th>)}</tr></thead>
      <tbody>{report.data.totals.map(r=><tr key={r.kind+r.language}><td>{section(r.kind)}</td><td>{languages[r.language]}</td><td>{r.starts}</td><td>{r.guests}</td><td>{r.accounts}</td></tr>)}</tbody></table></div> : <p>No playback starts recorded yet.</p>}
      <details><summary>Signed-in listeners</summary><div className="overflow-x-auto">
      {report.data.accounts.length ? <table className="w-full text-left"><thead><tr>{["Account","Section","Language","Starts","Last played"].map(h=><th key={h}>{h}</th>)}</tr></thead>
      <tbody>{report.data.accounts.map(r=><tr key={[r.account_id,r.kind,r.language].join("/")}><td>{r.email || r.account_id}</td><td>{section(r.kind)}</td><td>{languages[r.language]}</td><td>{r.starts}</td><td>{new Date(r.latest).toLocaleString()}</td></tr>)}</tbody></table> : <p>No signed-in listeners on this page.</p>}</div>
      {page>0&&<button onClick={()=>setPage(page-1)}>Previous</button>} {report.data.more&&<button onClick={()=>setPage(page+1)}>Next</button>}</details>
    </>}
  </section>;
}

// Call only after acquiring the same organization lock used by membership changes.
export async function workspaceIsActive(tx,id){
 const row=(await tx.query('SELECT suspended_at FROM ministrium.organizations WHERE id=$1',[id])).rows[0];
 return !!row&&!row.suspended_at;
}

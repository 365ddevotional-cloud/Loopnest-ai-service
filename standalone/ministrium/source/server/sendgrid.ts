// Outbound delivery stays disabled until a dedicated sender is configured.
const disabled=async(..._args:unknown[])=>({success:false,status:'Ministrium email delivery is not configured'});
export const sendChurchWelcomeEmail=disabled,sendChurchNameChangeSecurityEmail=disabled,sendChurchComplianceEmail=disabled;
export async function getUncachableSendGridClient():Promise<{client:any;fromEmail:string}>{throw new Error("Dedicated Ministrium email is not configured.");}

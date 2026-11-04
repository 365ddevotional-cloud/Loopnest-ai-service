export const viewerTimeZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone;
export function localDateTime(value){const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export function localMeetingInstant(value){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Choose a valid meeting date and time.');
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||localDateTime(date)!==value)throw new Error('That local time does not exist. Choose another time, especially around daylight-saving changes.');
 return date.toISOString();
}
export function meetingTime(value,timeZone){return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',timeZone}).format(new Date(value));}
export const commonTimeZones=['UTC','America/New_York','America/Chicago','America/Los_Angeles','Africa/Lagos','Africa/Accra','Africa/Johannesburg','Africa/Nairobi','Europe/London','Asia/Dubai','Asia/Kolkata','Australia/Sydney'];

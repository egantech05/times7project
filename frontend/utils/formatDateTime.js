export function formatDateTime(value) {
    if (!value) return "";
  
    let s = String(value).trim();
  

    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
    if (!hasTimezone) {
      s = s.replace(" ", "T"); 
      s += "Z";                
    }
  
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
  

    return new Intl.DateTimeFormat("en-NZ", {
      timeZone: "Pacific/Auckland",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  }

  export function todayDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`; 
  }
  
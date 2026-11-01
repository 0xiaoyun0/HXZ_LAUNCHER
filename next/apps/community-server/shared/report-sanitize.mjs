export function sanitizeReport(value,max=24000){
 return String(value??'').slice(0,max)
  .replace(/((?:access.?token|client.?token|refresh.?token|authorization|password|secret|token|api.?key)["'\s:=]+)(?:Bearer\s+)?[^\s,"'}]+/gi,'$1[已隐藏]')
  .replace(/Bearer\s+[\w.+/=-]+/gi,'Bearer [已隐藏]')
  .replace(/(--(?:accessToken|token|password)\s+)\S+/gi,'$1[已隐藏]')
  .replace(/([?&](?:token|key|auth|password)=)[^&\s]+/gi,'$1[已隐藏]')
  .replace(/[A-Z]:[\\/]Users[\\/][^\\/\s]+/gi,'[用户目录]')
  .replace(/\/(?:home|Users)\/[^/\s]+/g,'[用户目录]');
}

export interface ApplyStep1EmailParams {
  firstName: string
  roleName: string
  continueUrl: string
}

export function applyStep1Email({
  firstName,
  roleName,
  continueUrl,
}: ApplyStep1EmailParams): { subject: string; text: string; html: string } {
  const subject = `${firstName}, your application for ${roleName} is saved`

  const text = `Hi ${firstName},

Thanks for starting your application for ${roleName} at Beatrice Loving Heart.

Your progress is saved. Pick up where you left off here — the link is good for 90 days:

${continueUrl}

If you have any questions, just reply to this email.

— The BLH HR team`

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.6; background: #ffffff;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 28px;">
    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #10b981, #0d9488); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 18px;">♥</span>
    </div>
    <div style="font-weight: 600; color: #0f172a; font-size: 15px;">Beatrice Loving Heart</div>
  </div>
  <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 16px; line-height: 1.3;">Hi ${firstName} — your application is saved</h1>
  <p style="margin: 0 0 16px; color: #475569; font-size: 16px;">Thanks for starting your application for <strong style="color: #0f172a;">${roleName}</strong>. Your progress is safely stored and you can pick back up anytime.</p>
  <div style="margin: 32px 0;">
    <a href="${continueUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981, #0d9488); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 500; font-size: 16px;">Continue your application →</a>
  </div>
  <p style="margin: 0 0 24px; color: #64748b; font-size: 14px;">This link is valid for 90 days. If it expires, just start a new application at the same job posting and we'll pick up where you left off.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
  <p style="margin: 0; color: #94a3b8; font-size: 13px;">Questions? Just reply to this email — a real person at BLH's HR team will get back to you.</p>
</body>
</html>`

  return { subject, text, html }
}

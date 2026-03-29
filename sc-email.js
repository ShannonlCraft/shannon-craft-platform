// sc-email.js
// Shannon Craft Email Engine
// Handles: sending broadcasts, firing sequences, processing webhook buyers
// Drop this file alongside your admin files on Netlify

window.SCEmail = {

  // ── SEND A SINGLE EMAIL ──
  async send({ to, subject, html, fromName, fromEmail }) {
    try {
      const res = await fetch('https://sc-send-email.shannonlcraft.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html, fromName, fromEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      return { success: true, ...data };
    } catch (err) {
      console.error('SCEmail.send error:', err);
      return { success: false, error: err.message };
    }
  },

  // ── SEND BROADCAST TO A LIST ──
  async sendBroadcast({ contacts, subject, bodyHTML, fromName, fromEmail, onProgress }) {
    const results = { sent: 0, failed: 0, errors: [] };
    const BATCH = 50; // Resend allows batching

    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH);
      const promises = batch.map(contact => {
        // Personalize with merge tags
        const personalizedSubject = this.replaceMergeTags(subject, contact);
        const personalizedHTML = this.replaceMergeTags(bodyHTML, contact);
        return this.send({
          to: contact.email,
          subject: personalizedSubject,
          html: personalizedHTML,
          fromName,
          fromEmail,
        }).then(r => {
          if (r.success) results.sent++;
          else { results.failed++; results.errors.push({ email: contact.email, error: r.error }); }
        });
      });

      await Promise.all(promises);
      if (onProgress) onProgress(Math.min(i + BATCH, contacts.length), contacts.length);

      // Small delay between batches to be kind to the API
      if (i + BATCH < contacts.length) await this.delay(200);
    }

    return results;
  },

  // ── FIRE A SEQUENCE FOR A NEW CONTACT ──
  async fireSequence({ contact, sequence, fromName, fromEmail }) {
    if (!sequence?.steps?.length) return;

    // Send immediate emails (day 0) right away
    const immediate = sequence.steps.filter(s => s.day === 0);
    for (const step of immediate) {
      const subject = this.replaceMergeTags(step.subject, contact);
      const html = this.buildEmailHTML(this.replaceMergeTags(step.body, contact));
      await this.send({ to: contact.email, subject, html, fromName, fromEmail });
      console.log(`Sequence step sent: ${step.subject} → ${contact.email}`);
    }

    // Delayed steps would need a scheduler (coming with backend v2)
    // For now, logs what would be scheduled
    const delayed = sequence.steps.filter(s => s.day > 0);
    if (delayed.length) {
      console.log(`${delayed.length} delayed steps for ${contact.email} — scheduling coming soon`);
    }
  },

  // ── REPLACE MERGE TAGS ──
  replaceMergeTags(text, contact) {
    if (!text) return '';
    return text
      .replace(/\{\{first_name\}\}/gi, contact.firstName || contact.email?.split('@')[0] || 'Friend')
      .replace(/\{\{full_name\}\}/gi, `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email)
      .replace(/\{\{email\}\}/gi, contact.email || '')
      .replace(/\{\{product_name\}\}/gi, contact.productName || '')
      .replace(/\{\{download_link\}\}/gi, contact.downloadLink || '#')
      .replace(/\{\{unsubscribe_link\}\}/gi, '#unsubscribe');
  },

  // ── WRAP BODY IN EMAIL HTML SHELL ──
  buildEmailHTML(bodyContent) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:20px 0;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:#000;padding:20px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#E8571A;letter-spacing:3px;">SHANNON CRAFT</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;color:#333;font-size:15px;line-height:1.75;">
          ${bodyContent}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f8f8;padding:16px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">
            © Shannon Craft · 
            <a href="{{unsubscribe_link}}" style="color:#E8571A;text-decoration:none;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  },

  // ── PROCESS A NEW BUYER FROM WEBHOOK ──
  processNewBuyer(customer) {
    const K = { CONTACTS: 'sc_contacts_v1', SEQS: 'sc_seqs_v1', CFG: 'sc_cfg_v1' };
    
    try {
      // Load existing contacts
      const contacts = JSON.parse(localStorage.getItem(K.CONTACTS) || '[]');
      
      // Check if already exists
      if (contacts.find(c => c.email === customer.email)) {
        console.log('Contact already exists:', customer.email);
        return { alreadyExists: true };
      }

      // Add new contact
      const newContact = {
        id: 'w_' + Date.now().toString(36),
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email,
        tags: ['buyer'],
        source: customer.source || 'Purchase',
        productName: customer.productName || '',
        addedAt: new Date().toISOString(),
        unsubscribed: false,
      };

      contacts.unshift(newContact);
      localStorage.setItem(K.CONTACTS, JSON.stringify(contacts));
      console.log('New buyer added:', newContact.email);

      // Find matching sequences and fire them
      const sequences = JSON.parse(localStorage.getItem(K.SEQS) || '[]');
      const cfg = JSON.parse(localStorage.getItem(K.CFG) || '{}');
      const activeSeqs = sequences.filter(s => s.active && 
        (s.trigger === 'any' || s.trigger === 'digital' || s.trigger === 'physical'));

      if (activeSeqs.length && cfg.resendKey) {
        activeSeqs.forEach(seq => {
          this.fireSequence({
            contact: newContact,
            sequence: seq,
            fromName: cfg.fromName || 'Shannon Craft',
            fromEmail: cfg.fromEmail || '',
          });
        });
      }

      return { added: true, contact: newContact };
    } catch (err) {
      console.error('processNewBuyer error:', err);
      return { error: err.message };
    }
  },

  delay(ms) { return new Promise(r => setTimeout(r, ms)); },
};

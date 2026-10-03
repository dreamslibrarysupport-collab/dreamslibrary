import { transaction, pool } from '../config/db.js';
import { sendEmail } from '../services/email.js';
// Run once per minute with a scheduler. SKIP LOCKED supports concurrent workers.
try {
  for (let i = 0; i < 50; i++) {
    const worked = await transaction(async (db) => {
      const row = (
        await db.query(
          'select e.*,p.email from email_outbox e join profiles p on p.id=e.user_id where e.sent_at is null and e.attempts<10 order by e.created_at for update of e skip locked limit 1',
        )
      ).rows[0];
      if (!row) return false;
      try {
        await sendEmail(row.email, row.template, row.payload, row.id);
        await db.query('update email_outbox set sent_at=now(),attempts=attempts+1 where id=$1', [
          row.id,
        ]);
      } catch (error) {
        console.error(error.message);
        await db.query('update email_outbox set attempts=attempts+1 where id=$1', [row.id]);
        return false;
      }
      return true;
    });
    if (!worked) break;
  }
} finally {
  await pool.end();
}

/**
 * GET /api/companies — the public "interviewed at" list.
 *
 * The site ships the same names in its HTML, so this only ever upgrades what is
 * already on the page. Any failure returns the defaults with a 200 rather than
 * an error: a wobbly database should never blank out a section of the site.
 */
import { json, methodGuard } from './_lib/http.js';
import { getDb } from './_lib/db.js';
import { listCompanies, DEFAULTS } from './_lib/companies.js';
import { getSettings } from './_lib/settings.js';
import { getOffers } from './_lib/pricing.js';
import { priceForPlan, listPriceForPlan } from './_lib/availability.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return;

  try {
    const db = await getDb();
    const [{ companies }, settings, offers] = await Promise.all([
      listCompanies(db), getSettings(db), getOffers(db),
    ]);

    const monthly = offers.earlyBird.active && Number.isFinite(offers.earlyBird.monthly)
      ? offers.earlyBird.monthly
      : priceForPlan('monthly');

    res.setHeader('cache-control', 'public, max-age=60, stale-while-revalidate=300');
    // Also the public bootstrap for anything the panel can switch on the site.
    return json(res, 200, {
      companies,
      site: { showMentorPhoto: settings.showMentorPhoto, theme: settings.siteTheme },
      offers: {
        earlyBird: {
          active: offers.earlyBird.active === true,
          price: monthly,
          listPrice: listPriceForPlan('monthly'),
        },
        referral: { active: offers.referral.active === true, discount: offers.referral.discount },
      },
    });
  } catch (err) {
    console.error('[companies] falling back to defaults:', err.message);
    return json(res, 200, { companies: DEFAULTS.map((name) => ({ name })), site: { showMentorPhoto: true }, fallback: true });
  }
}

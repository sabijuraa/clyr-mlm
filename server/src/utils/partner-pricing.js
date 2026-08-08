/**
 * Partner prices are an entitlement of an authenticated, active partner.
 * The regular product price remains the source of truth for every other
 * visitor, regardless of any price a browser may submit at checkout.
 */
// BUG FIX (Aug 8, 2026 — affiliate self-checkout "still the same" after the
// first fix): this used to check `role === 'partner'` only. But `users.role`
// also includes 'admin', 'support', 'accounting', and 'team_leader' — all of
// which are internal CLYR accounts, never public self-signups (unlike the
// fully separate `customers` table). Theresa's own login is stored as
// 'admin' (the same root cause behind the earlier sponsor-dropdown bug), so
// a strict 'partner' check silently excluded her account from both partner
// pricing and the fixed checkout flow. Any active account in the `users`
// table is a legitimate internal/partner account and should be eligible.
export const isEligiblePartner = (user) => (
  !!user?.role && user?.status === 'active'
);

export const getEffectiveProductPrice = (product, user) => {
  const regularPrice = Number.parseFloat(product?.price);
  const partnerPrice = Number.parseFloat(product?.partner_price);

  // An explicit Partnerpreis always wins.  The exclusion flag is reserved for
  // any future blanket discount and must not silently disable a price entered
  // for this individual product in the admin area.
  if (isEligiblePartner(user) && Number.isFinite(partnerPrice) && partnerPrice >= 0) {
    return partnerPrice;
  }

  return Number.isFinite(regularPrice) ? regularPrice : 0;
};

export const applyPartnerPricing = (product, user) => {
  const regularPrice = Number.parseFloat(product?.price);
  const effectivePrice = getEffectiveProductPrice(product, user);
  const hasPartnerPrice = isEligiblePartner(user)
    && Number.isFinite(Number.parseFloat(product?.partner_price))
    && Number.parseFloat(product.partner_price) >= 0;

  return {
    ...product,
    price: effectivePrice,
    ...(hasPartnerPrice ? {
      regular_price: Number.isFinite(regularPrice) ? regularPrice : 0,
      is_partner_price: true
    } : {})
  };
};
